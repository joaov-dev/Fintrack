###############################################################################
# Network Segregation (Zero Trust — Network Layer)
#
# Architecture:
#   Internet → CloudFront (DDoS/WAF layer) → ALB (public subnet)
#              → App (private subnet) → RDS (DB subnet, no internet route)
#
# Three-tier isolation:
#   • Public subnets:  ALB + NAT Gateway only — no application servers
#   • Private subnets: ECS tasks / EC2 — only outbound via NAT, no inbound from internet
#   • DB subnets:      RDS — no internet route at all (airgapped from public)
#
# Security principle: each tier can only reach the tier directly below it.
#   ALB → App via security group rule (port 3333)
#   App → DB via security group rule (port 5432)
#   DB  → nothing
###############################################################################

# ── VPC ───────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true          # required for RDS endpoint resolution

  tags = { Name = "${local.name_prefix}-vpc" }
}

# ── Internet Gateway (only public subnets use this) ───────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

# ── Public Subnets (ALB + NAT Gateway) ───────────────────────────────────────

resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false   # explicit assignment only — no auto-public IPs

  tags = { Name = "${local.name_prefix}-public-${local.azs[count.index]}", Tier = "public" }
}

# ── Private Subnets (App servers — ECS tasks) ────────────────────────────────

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name_prefix}-private-${local.azs[count.index]}", Tier = "private" }
}

# ── DB Subnets (RDS — fully isolated, no internet route) ─────────────────────

resource "aws_subnet" "db" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.db_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name_prefix}-db-${local.azs[count.index]}", Tier = "database" }
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.db[*].id
  tags       = { Name = "${local.name_prefix}-db-subnet-group" }
}

# ── Elastic IPs + NAT Gateways (one per AZ for HA) ───────────────────────────

resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"
  tags   = { Name = "${local.name_prefix}-nat-eip-${local.azs[count.index]}" }
}

resource "aws_nat_gateway" "main" {
  count         = length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id   # NAT lives in PUBLIC subnet

  tags = { Name = "${local.name_prefix}-natgw-${local.azs[count.index]}" }
}

# ── Route Tables ──────────────────────────────────────────────────────────────

# Public: 0.0.0.0/0 → Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private: 0.0.0.0/0 → NAT Gateway (outbound only, per-AZ)
resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "${local.name_prefix}-rt-private-${local.azs[count.index]}" }
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# DB subnets: no internet route — local VPC traffic only
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
  # Intentionally no 0.0.0.0/0 route — DB tier is airgapped from internet
  tags = { Name = "${local.name_prefix}-rt-db" }
}

resource "aws_route_table_association" "db" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

# ── VPC Flow Logs (audit all accepted/rejected traffic) ───────────────────────

resource "aws_cloudwatch_log_group" "vpc_flow" {
  name              = "/aws/vpc/${local.name_prefix}/flow-logs"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"   # capture ACCEPT and REJECT
  iam_role_arn    = aws_iam_role.vpc_flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow.arn
  tags            = { Name = "${local.name_prefix}-flow-logs" }
}

# ── Security Groups ───────────────────────────────────────────────────────────

# ALB: only accepts HTTPS from internet (443)
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB — accepts HTTPS from internet only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP → redirect to HTTPS at ALB level (no app-level redirect needed)
  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Outbound to app servers"
    from_port       = 3333
    to_port         = 3333
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "${local.name_prefix}-alb-sg" }
}

# App (ECS): only accepts traffic from ALB on port 3333
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "App servers — only ALB can reach port 3333"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API from ALB only"
    from_port       = 3333
    to_port         = 3333
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "HTTPS outbound (Stripe, HIBP, SMTP, AWS APIs)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "PostgreSQL to DB tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }

  tags = { Name = "${local.name_prefix}-app-sg" }
}

# DB (RDS): only accepts PostgreSQL from app tier
resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db-sg"
  description = "RDS — accepts PostgreSQL from app tier only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # No egress rule — RDS does not need to initiate outbound connections

  tags = { Name = "${local.name_prefix}-db-sg" }
}
