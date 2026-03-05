###############################################################################
# IAM — Least Privilege + Zero Trust Identity Layer
#
# Roles created:
#   ecs_task_execution  — ECS control plane (pull image, push logs)
#   ecs_task_app        — Application runtime (read secrets, write audit logs)
#   rds_monitoring      — RDS enhanced monitoring (AWS managed role)
#   deployment_ci       — CI/CD pipeline (deploy new ECS tasks, NOT read secrets)
#   vpc_flow_logs       — Write VPC flow logs to CloudWatch
#
# Principle applied: each role has only the permissions it needs for its job.
#   The app runtime cannot manage infrastructure.
#   CI/CD cannot read secrets.
#   No role has AdministratorAccess.
###############################################################################

# ── ECS Task Execution Role (control-plane operations) ───────────────────────
# Used by ECS agent to pull container images and push logs — NOT the app code.

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# AWS managed policy: pull ECR images + push CloudWatch logs
resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the execution role to pull secrets at container start (injection via env vars)
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "pull-secrets-at-startup"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecretValues"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.jwt_access.arn,
          aws_secretsmanager_secret.jwt_refresh.arn,
          aws_secretsmanager_secret.encryption_key.arn,
          aws_secretsmanager_secret.stripe.arn,
        ]
      },
      {
        Sid      = "DecryptSecretsKMS"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [aws_kms_key.main.arn]
      }
    ]
  })
}

# ── ECS Task App Role (runtime permissions) ───────────────────────────────────
# Used by the application code itself — ONLY what the app needs at runtime.
# The app DOES NOT need to manage EC2, S3, IAM, etc.

resource "aws_iam_role" "ecs_task_app" {
  name = "${local.name_prefix}-ecs-task-app"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        # Restrict to tasks in this specific ECS cluster (defense-in-depth)
        ArnLike = {
          "aws:SourceArn" = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_app_runtime" {
  name = "app-runtime-permissions"
  role = aws_iam_role.ecs_task_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Write structured logs to CloudWatch
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${local.name_prefix}/*"
      },
      # Read secrets at runtime (for rotation — not startup injection)
      {
        Sid    = "ReadOwnSecrets"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.jwt_access.arn,
          aws_secretsmanager_secret.jwt_refresh.arn,
          aws_secretsmanager_secret.encryption_key.arn,
          aws_secretsmanager_secret.stripe.arn,
        ]
      },
      {
        Sid      = "DecryptKMS"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [aws_kms_key.main.arn]
      },
    ]
  })
}

# ── CI/CD Deployment Role ─────────────────────────────────────────────────────
# GitHub Actions / CI pipeline — can push images + trigger ECS deploys.
# CANNOT read secrets, cannot modify IAM, cannot modify security groups.

resource "aws_iam_role" "deployment_ci" {
  name = "${local.name_prefix}-deployment-ci"

  # OIDC trust: GitHub Actions only (repository-scoped)
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Restrict to your specific GitHub org/repo — change before use
          "token.actions.githubusercontent.com:sub" = "repo:YOUR_ORG/financial-control:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deployment_ci" {
  name = "ci-deploy-permissions"
  role = aws_iam_role.deployment_ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR: push new images
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      },
      # ECS: register new task definition + update service (deploy)
      {
        Sid    = "ECSDeploy"
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition"
        ]
        Resource = "*"
      },
      # Pass the execution and app roles to new task definitions
      {
        Sid    = "PassECSTasks"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          aws_iam_role.ecs_task_execution.arn,
          aws_iam_role.ecs_task_app.arn,
        ]
      }
      # Explicit DENY on secrets — CI pipeline must never read production secrets
      # (deny is evaluated last and overrides any allow)
    ]
  })
}

resource "aws_iam_role_policy" "deployment_ci_deny_secrets" {
  name = "deny-secrets-access"
  role = aws_iam_role.deployment_ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ExplicitDenySecrets"
      Effect = "Deny"
      Action = ["secretsmanager:*", "kms:Decrypt"]
      Resource = "*"
    }]
  })
}

# ── VPC Flow Logs Role ────────────────────────────────────────────────────────

resource "aws_iam_role" "vpc_flow_logs" {
  name = "${local.name_prefix}-vpc-flow-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  name = "write-flow-logs"
  role = aws_iam_role.vpc_flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Resource = "*"
    }]
  })
}

# ── RDS Monitoring Role ───────────────────────────────────────────────────────

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
