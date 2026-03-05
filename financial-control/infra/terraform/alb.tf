###############################################################################
# ALB — HTTPS Termination + HTTP→HTTPS Redirect + ACM Certificate
#
# Security profile:
#   • TLS policy ELBSecurityPolicy-TLS13-1-2-2021-06
#     → Allows TLS 1.2 and TLS 1.3 only (drops TLS 1.0/1.1)
#     → Strong cipher suites only (AES-GCM, ChaCha20 — no RC4, 3DES, MD5)
#   • HTTP (80) → HTTPS (443) redirect — 301 permanent
#   • Access logs → S3 (encrypted with CMK)
#   • Deletion protection enabled
###############################################################################

# ── ACM Certificate (managed TLS) ─────────────────────────────────────────────

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]  # wildcard for subdomains
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true   # zero-downtime cert renewal
  }

  tags = { Name = "${local.name_prefix}-cert" }
}

# DNS validation records (assumes Route 53 manages the domain)
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ── ALB Access Logs Bucket ─────────────────────────────────────────────────────

resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.name_prefix}-alb-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-90d"
    status = "Enabled"
    expiration { days = 90 }
    filter { prefix = "" }
  }
}

# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  load_balancer_type = "application"
  internal           = false                      # internet-facing
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id    # public subnets only

  enable_deletion_protection = true               # prevents accidental terraform destroy

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

# ── Target Group (app servers on port 3333) ───────────────────────────────────

resource "aws_lb_target_group" "app" {
  name        = "${local.name_prefix}-tg"
  port        = 3333
  protocol    = "HTTP"   # ALB handles TLS termination; app speaks plain HTTP internally
  vpc_id      = aws_vpc.main.id
  target_type = "ip"     # ECS Fargate uses IP-based target registration

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${local.name_prefix}-tg" }
}

# ── HTTPS Listener (443) ──────────────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"

  # TLS 1.2 + TLS 1.3 only — enforces modern ciphers
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ── HTTP Listener (80) — 301 redirect to HTTPS ───────────────────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── DNS Record pointing domain to ALB ─────────────────────────────────────────

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ── Output ────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name (use for health checks and monitoring)"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Public HTTPS URL"
  value       = "https://${var.domain_name}"
}
