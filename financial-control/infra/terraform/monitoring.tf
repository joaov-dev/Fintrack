###############################################################################
# SecOps Monitoring — CloudWatch Logs, Metric Filters, Alarms, SNS, Dashboard
#
# Architecture:
#   ECS → stdout (JSON lines) → CloudWatch Log Group /aws/ecs/dominahub-production
#   Metric Filters extract fields from JSON log lines → CloudWatch Metrics
#   CloudWatch Alarms watch metrics → SNS Topic → Email / PagerDuty / Slack
#
# Metric Filters use the ANOMALY log pattern (from anomalyService.ts):
#   { "message": "ANOMALY", "type": "SCRAPING", ... }
# And the HTTP access log pattern (from requestLogger.ts):
#   { "message": "HTTP", "status": 401, ... }
#
# Log retention: 365 days in CloudWatch (encrypted with CMK)
# After 90 days: export to S3 (lifecycle policy for cold storage / Glacier)
###############################################################################

# ── CloudWatch Log Group (application logs) ───────────────────────────────────

resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ecs/${local.name_prefix}"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn

  tags = { Name = "${local.name_prefix}-app-logs" }
}

# ── SNS Topic for all security alerts ─────────────────────────────────────────

resource "aws_sns_topic" "security_alerts" {
  name              = "${local.name_prefix}-security-alerts"
  kms_master_key_id = aws_kms_key.main.arn

  tags = { Name = "${local.name_prefix}-security-alerts" }
}

# Email subscription (replace with real on-call address / PagerDuty endpoint)
resource "aws_sns_topic_subscription" "security_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = "security-alerts@dominahub.com.br"  # REPLACE with real address
}

# ── Helper: creates a Metric Filter + Alarm pair ──────────────────────────────
# (Terraform doesn't support for_each well for alarm-filter pairs, so we
#  define each explicitly for full control over thresholds and periods.)

# ── 1. Brute-force / Credential Stuffing ─────────────────────────────────────
# Triggered by: AnomalyService alerting CREDENTIAL_STUFFING
# Source:       { "message": "ANOMALY", "type": "CREDENTIAL_STUFFING" }

resource "aws_cloudwatch_log_metric_filter" "credential_stuffing" {
  name           = "${local.name_prefix}-credential-stuffing"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"ANOMALY\" && $.type = \"CREDENTIAL_STUFFING\" }"

  metric_transformation {
    name          = "CredentialStuffingEvents"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "credential_stuffing" {
  alarm_name          = "${local.name_prefix}-credential-stuffing"
  alarm_description   = "CRITICAL: Credential stuffing detected — multiple auth failures from one IP"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CredentialStuffingEvents"
  namespace           = "DominaHub/Security"
  period              = 300  # 5 minutes
  statistic           = "Sum"
  threshold           = 1    # any single event → page immediately
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  ok_actions          = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "critical" }
}

# ── 2. Scraping / High-Velocity Access ────────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "scraping" {
  name           = "${local.name_prefix}-scraping"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"ANOMALY\" && $.type = \"SCRAPING\" }"

  metric_transformation {
    name          = "ScrapingEvents"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "scraping" {
  alarm_name          = "${local.name_prefix}-scraping"
  alarm_description   = "HIGH: Scraping/high-velocity access detected from single IP"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ScrapingEvents"
  namespace           = "DominaHub/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 3   # 3 scraping events in 5 min → alert
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "high" }
}

# ── 3. Bulk Data Access (potential exfiltration) ──────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "bulk_data" {
  name           = "${local.name_prefix}-bulk-data-access"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"ANOMALY\" && $.type = \"BULK_DATA_ACCESS\" }"

  metric_transformation {
    name          = "BulkDataAccessEvents"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "bulk_data" {
  alarm_name          = "${local.name_prefix}-bulk-data-access"
  alarm_description   = "HIGH: Authenticated user performing bulk data access — possible exfiltration"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "BulkDataAccessEvents"
  namespace           = "DominaHub/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 2
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "high" }
}

# ── 4. Destructive Actions (CLEAR_ACCOUNT_DATA) ───────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "destructive_action" {
  name           = "${local.name_prefix}-destructive-action"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"ANOMALY\" && $.type = \"DESTRUCTIVE_ACTION\" }"

  metric_transformation {
    name          = "DestructiveActionEvents"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "destructive_action" {
  alarm_name          = "${local.name_prefix}-destructive-action"
  alarm_description   = "CRITICAL: Destructive account action detected (CLEAR_ACCOUNT_DATA or mass delete)"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "DestructiveActionEvents"
  namespace           = "DominaHub/Security"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "critical" }
}

# ── 5. Session IP Shift ────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "session_ip_shift" {
  name           = "${local.name_prefix}-session-ip-shift"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"ANOMALY\" && $.type = \"SESSION_IP_SHIFT\" }"

  metric_transformation {
    name          = "SessionIpShiftEvents"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "session_ip_shift" {
  alarm_name          = "${local.name_prefix}-session-ip-shift"
  alarm_description   = "MEDIUM: Authenticated session detected from new IP — possible session hijack"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "SessionIpShiftEvents"
  namespace           = "DominaHub/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 10  # some IP changes are normal (mobile, VPN); alert at scale
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "medium" }
}

# ── 6. Auth Failure Rate (aggregated 401s from access logs) ──────────────────

resource "aws_cloudwatch_log_metric_filter" "auth_failures" {
  name           = "${local.name_prefix}-auth-failures"
  log_group_name = aws_cloudwatch_log_group.app.name
  # HTTP access log: status 401, path contains /auth/
  pattern        = "{ $.message = \"HTTP\" && $.status = 401 }"

  metric_transformation {
    name          = "AuthFailures"
    namespace     = "DominaHub/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "auth_failure_rate" {
  alarm_name          = "${local.name_prefix}-auth-failure-rate"
  alarm_description   = "HIGH: Elevated authentication failure rate — possible brute force campaign"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "AuthFailures"
  namespace           = "DominaHub/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 50  # >50 401s in 5 min → alert
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "high" }
}

# ── 7. Server Error Rate (5xx) ────────────────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "server_errors" {
  name           = "${local.name_prefix}-server-errors"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.message = \"HTTP\" && $.status >= 500 }"

  metric_transformation {
    name          = "ServerErrors"
    namespace     = "DominaHub/Application"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "server_error_rate" {
  alarm_name          = "${local.name_prefix}-server-error-rate"
  alarm_description   = "HIGH: Elevated server error rate — application may be under attack or unhealthy"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "ServerErrors"
  namespace           = "DominaHub/Application"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "high" }
}

# ── 8. Unhandled Server Errors (logger.error lines) ──────────────────────────

resource "aws_cloudwatch_log_metric_filter" "unhandled_errors" {
  name           = "${local.name_prefix}-unhandled-errors"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.level = \"error\" && $.message = \"Unhandled server error\" }"

  metric_transformation {
    name          = "UnhandledErrors"
    namespace     = "DominaHub/Application"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "unhandled_errors" {
  alarm_name          = "${local.name_prefix}-unhandled-errors"
  alarm_description   = "MEDIUM: Unhandled server errors — investigate stack traces in CloudWatch Insights"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "UnhandledErrors"
  namespace           = "DominaHub/Application"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  tags = { Severity = "medium" }
}

# ── 9. Health Check (ALB HealthyHostCount) ────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "no_healthy_hosts" {
  alarm_name          = "${local.name_prefix}-no-healthy-hosts"
  alarm_description   = "CRITICAL: No healthy ECS tasks behind the ALB — service is down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  ok_actions          = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }

  tags = { Severity = "critical" }
}

# ── CloudWatch Insights Saved Queries ─────────────────────────────────────────
# Useful for incident investigation — accessible via AWS Console

resource "aws_cloudwatch_query_definition" "anomalies_last_hour" {
  name = "${local.name_prefix}/Security/AnomaliesLastHour"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOT
    fields @timestamp, type, severity, ip, userId, requestId, detail
    | filter message = "ANOMALY"
    | sort @timestamp desc
    | limit 100
  EOT
}

resource "aws_cloudwatch_query_definition" "auth_failures_by_ip" {
  name = "${local.name_prefix}/Security/AuthFailuresByIP"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOT
    fields @timestamp, ip, userId, status, path, requestId
    | filter message = "HTTP" and status = 401
    | stats count() as failures by ip
    | sort failures desc
    | limit 20
  EOT
}

resource "aws_cloudwatch_query_definition" "request_trace" {
  name = "${local.name_prefix}/Ops/TraceRequest"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOT
    fields @timestamp, level, message, requestId, userId, status, ms, path
    | filter requestId = "PASTE_REQUEST_ID_HERE"
    | sort @timestamp asc
  EOT
}

resource "aws_cloudwatch_query_definition" "user_activity" {
  name = "${local.name_prefix}/Ops/UserActivity"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOT
    fields @timestamp, method, path, status, ms, ip, requestId
    | filter userId = "PASTE_USER_ID_HERE"
    | sort @timestamp desc
    | limit 200
  EOT
}

resource "aws_cloudwatch_query_definition" "error_correlation" {
  name = "${local.name_prefix}/Ops/ErrorCorrelation"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOT
    fields @timestamp, level, message, requestId, path, userId, @message
    | filter level = "error"
    | sort @timestamp desc
    | limit 50
  EOT
}

# ── CloudWatch Dashboard ───────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "secops" {
  dashboard_name = "${local.name_prefix}-secops"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Security events
      {
        type   = "metric"
        x = 0; y = 0; width = 6; height = 6
        properties = {
          title   = "Auth Failures (401/5min)"
          metrics = [["DominaHub/Security", "AuthFailures"]]
          period  = 300; stat = "Sum"; view = "timeSeries"
          annotations = { horizontal = [{ value = 50, label = "Alert threshold", color = "#ff0000" }] }
        }
      },
      {
        type   = "metric"
        x = 6; y = 0; width = 6; height = 6
        properties = {
          title   = "Security Anomalies"
          metrics = [
            ["DominaHub/Security", "CredentialStuffingEvents"],
            ["DominaHub/Security", "ScrapingEvents"],
            ["DominaHub/Security", "BulkDataAccessEvents"],
            ["DominaHub/Security", "DestructiveActionEvents"],
          ]
          period = 300; stat = "Sum"; view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x = 12; y = 0; width = 6; height = 6
        properties = {
          title   = "Server Errors (5xx/min)"
          metrics = [["DominaHub/Application", "ServerErrors"]]
          period  = 60; stat = "Sum"; view = "timeSeries"
          annotations = { horizontal = [{ value = 10, label = "Alert threshold", color = "#ff0000" }] }
        }
      },
      {
        type   = "metric"
        x = 18; y = 0; width = 6; height = 6
        properties = {
          title   = "Healthy Hosts"
          metrics = [["AWS/ApplicationELB", "HealthyHostCount",
            "LoadBalancer", aws_lb.main.arn_suffix,
            "TargetGroup", aws_lb_target_group.app.arn_suffix]]
          period = 60; stat = "Minimum"; view = "timeSeries"
          annotations = { horizontal = [{ value = 1, label = "Min healthy", color = "#ff7f0e" }] }
        }
      },
      # Row 2: Alarm status panel
      {
        type   = "alarm"
        x = 0; y = 6; width = 24; height = 4
        properties = {
          title = "Security Alarm Status"
          alarms = [
            aws_cloudwatch_metric_alarm.credential_stuffing.arn,
            aws_cloudwatch_metric_alarm.scraping.arn,
            aws_cloudwatch_metric_alarm.bulk_data.arn,
            aws_cloudwatch_metric_alarm.destructive_action.arn,
            aws_cloudwatch_metric_alarm.auth_failure_rate.arn,
            aws_cloudwatch_metric_alarm.server_error_rate.arn,
            aws_cloudwatch_metric_alarm.no_healthy_hosts.arn,
          ]
        }
      },
    ]
  })
}

# ── CloudTrail (AWS API audit trail) ─────────────────────────────────────────
# Records every AWS API call (IAM, EC2, Secrets Manager, etc.)
# Stored in S3 with integrity validation enabled.

resource "aws_cloudtrail" "main" {
  name                          = "${local.name_prefix}-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true    # SHA-256 digest validation (tamper detection)
  kms_key_id                    = aws_kms_key.main.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = { Name = "${local.name_prefix}-cloudtrail" }
}

resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "${local.name_prefix}-cloudtrail-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket                  = aws_s3_bucket.cloudtrail_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "glacier-after-90d"
    status = "Enabled"
    filter { prefix = "" }

    transition {
      days          = 90
      storage_class = "GLACIER"       # long-term cold storage at low cost
    }

    expiration {
      days = 2555  # 7 years (regulatory requirement for financial data in Brazil)
    }
  }
}

# Required bucket policy for CloudTrail to write to S3
resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}
