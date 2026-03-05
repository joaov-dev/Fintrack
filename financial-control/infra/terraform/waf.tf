###############################################################################
# WAF v2 — OWASP Core Rule Set + Rate Limiting at Edge
#
# Layers:
#   1. AWS WAF attached to CloudFront (global, anycast edge — DDoS + WAF)
#   2. AWS WAF attached to ALB (regional, defence-in-depth)
#
# Rule groups (in priority order):
#   100 — IP Reputation List (Managed: AWSManagedRulesAmazonIpReputationList)
#   200 — OWASP Core Rule Set (Managed: AWSManagedRulesCommonRuleSet)
#   300 — Known Bad Inputs (Managed: AWSManagedRulesKnownBadInputsRuleSet)
#   400 — SQL Injection (Managed: AWSManagedRulesSQLiRuleSet)
#   500 — Rate limit — global 1000 req/5min per IP (custom)
#   600 — Rate limit — auth endpoints 20 req/5min per IP (custom)
###############################################################################

# ── Regional WAF (attached to ALB) ───────────────────────────────────────────

resource "aws_wafv2_web_acl" "alb" {
  name        = "${local.name_prefix}-waf-alb"
  description = "Regional WAF protecting the ALB — OWASP + rate limits"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # ── Rule 100: IP Reputation (bots, scrapers, threat feeds) ───────────────

  rule {
    name     = "AWSManagedRulesIpReputationList"
    priority = 100

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IpReputationList"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 200: OWASP Core Rule Set (CRS) ──────────────────────────────────
  # Covers: SQLi, XSS, LFI, RFI, SSRF, command injection, protocol attacks

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 200

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # SizeRestrictions_BODY excluded for the import endpoint (10 MB CSV uploads)
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}    # count only — the app enforces its own 10 MB limit
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 300: Known Bad Inputs ────────────────────────────────────────────
  # Log4Shell, Spring4Shell, SSRF probe strings, etc.

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 300

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 400: SQL Injection ───────────────────────────────────────────────

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 400

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 500: Global rate limit — 1000 req / 5 min per IP ────────────────

  rule {
    name     = "RateLimitGlobal"
    priority = 500

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 1000   # requests per 5-minute window
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitGlobal"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 600: Auth endpoint rate limit — 20 req / 5 min per IP ───────────
  # Covers /api/v1/auth/login and /api/v1/auth/register

  rule {
    name     = "RateLimitAuthEndpoints"
    priority = 600

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 20
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statements = [
              {
                byte_match_statement = {
                  search_string         = "/api/v1/auth/login"
                  field_to_match        = { uri_path = {} }
                  text_transformations  = [{ priority = 0, type = "LOWERCASE" }]
                  positional_constraint = "STARTS_WITH"
                }
              },
              {
                byte_match_statement = {
                  search_string         = "/api/v1/auth/register"
                  field_to_match        = { uri_path = {} }
                  text_transformations  = [{ priority = 0, type = "LOWERCASE" }]
                  positional_constraint = "STARTS_WITH"
                }
              },
            ]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitAuth"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf-alb"
    sampled_requests_enabled   = true
  }

  tags = { Name = "${local.name_prefix}-waf-alb" }
}

# Attach regional WAF to the ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.alb.arn
}

# ── WAF Logging → S3 (90-day retention, encrypted) ───────────────────────────

resource "aws_s3_bucket" "waf_logs" {
  bucket        = "${local.name_prefix}-waf-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
  tags          = { Name = "${local.name_prefix}-waf-logs" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "waf_logs" {
  bucket = aws_s3_bucket.waf_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "waf_logs" {
  bucket                  = aws_s3_bucket.waf_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "waf_logs" {
  bucket = aws_s3_bucket.waf_logs.id

  rule {
    id     = "expire-after-90-days"
    status = "Enabled"

    expiration { days = 90 }

    filter { prefix = "" }
  }
}

resource "aws_wafv2_web_acl_logging_configuration" "alb" {
  log_destination_configs = ["${aws_s3_bucket.waf_logs.arn}/alb"]
  resource_arn            = aws_wafv2_web_acl.alb.arn
}

# ── Data source ───────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
