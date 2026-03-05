###############################################################################
# Secrets Manager — Never in code, never in environment files committed to Git
#
# All application secrets are stored here. The ECS task execution role fetches
# them at container start and injects them as environment variables.
# The app can also refresh them at runtime (for rotation without restarts).
#
# KMS CMK (Customer Managed Key) encrypts every secret — AWS default key is NOT used.
#
# Rotation:
#   DB password  — automatic rotation every 30 days via Lambda
#   JWT secrets  — manual rotation (require coordinated app deploy)
#   Enc key      — manual rotation with backward-compat support (app reads both)
###############################################################################

# ── KMS Customer Managed Key ──────────────────────────────────────────────────

resource "aws_kms_key" "main" {
  description              = "${local.name_prefix} — primary CMK for secrets and logs"
  deletion_window_in_days  = 30
  enable_key_rotation      = true        # automatic annual key material rotation
  multi_region             = false       # single-region (extend if multi-region DR needed)

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Root account can manage the key (break-glass)
      {
        Sid    = "RootFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # App role can decrypt (for runtime secret reads)
      {
        Sid    = "AppDecrypt"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.ecs_task_execution.arn,
            aws_iam_role.ecs_task_app.arn,
          ]
        }
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = "*"
      },
      # CloudWatch Logs can use CMK for log group encryption
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action   = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
        Resource = "*"
      }
    ]
  })

  tags = { Name = "${local.name_prefix}-cmk" }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.main.key_id
}

# ── Database URL ──────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${local.name_prefix}/db-url"
  description             = "PostgreSQL connection string for the application"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7    # 7-day soft delete before permanent removal
}

# Initial value — set to a placeholder; Terraform will NOT overwrite if already set.
# Update via: aws secretsmanager put-secret-value --secret-id dominahub-production/db-url --secret-string "postgresql://..."
resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "REPLACE_ME — set manually: postgresql://user:pass@host:5432/dbname"

  # Prevent Terraform from overwriting a manually set value
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── JWT Access Secret ─────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_access" {
  name                    = "${local.name_prefix}/jwt-access-secret"
  description             = "HS256 secret for JWT access tokens (15-minute TTL)"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "jwt_access" {
  secret_id     = aws_secretsmanager_secret.jwt_access.id
  secret_string = "REPLACE_ME — generate: openssl rand -hex 64"

  lifecycle { ignore_changes = [secret_string] }
}

# ── JWT Refresh Secret ────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_refresh" {
  name                    = "${local.name_prefix}/jwt-refresh-secret"
  description             = "HS256 secret for JWT refresh tokens (30-day TTL)"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "jwt_refresh" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh.id
  secret_string = "REPLACE_ME — generate: openssl rand -hex 64"

  lifecycle { ignore_changes = [secret_string] }
}

# ── Encryption Key (AES-256 for attachment data) ──────────────────────────────

resource "aws_secretsmanager_secret" "encryption_key" {
  name                    = "${local.name_prefix}/encryption-key"
  description             = "AES-256 key used by lib/encryption.ts to encrypt attachment data"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = "REPLACE_ME — generate: openssl rand -hex 32"

  lifecycle { ignore_changes = [secret_string] }
}

# ── Stripe Keys ───────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "stripe" {
  name                    = "${local.name_prefix}/stripe"
  description             = "Stripe secret key + webhook signing secret (JSON object)"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

# Store as a JSON object so both keys are in one secret (reduces API calls)
resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secretKey      = "REPLACE_ME — sk_live_..."
    webhookSecret  = "REPLACE_ME — whsec_..."
  })

  lifecycle { ignore_changes = [secret_string] }
}

# ── Outputs — ARNs exposed to other modules ───────────────────────────────────

output "secret_arns" {
  description = "Secret ARNs to be referenced in ECS task definitions"
  sensitive   = true
  value = {
    db_url         = aws_secretsmanager_secret.db_url.arn
    jwt_access     = aws_secretsmanager_secret.jwt_access.arn
    jwt_refresh    = aws_secretsmanager_secret.jwt_refresh.arn
    encryption_key = aws_secretsmanager_secret.encryption_key.arn
    stripe         = aws_secretsmanager_secret.stripe.arn
  }
}

output "kms_key_arn" {
  description = "CMK ARN"
  value       = aws_kms_key.main.arn
}
