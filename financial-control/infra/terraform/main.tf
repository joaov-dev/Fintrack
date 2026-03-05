###############################################################################
# DominaHub — Cloud Security Architecture
# Terraform entry-point: provider, remote state backend, and locals
###############################################################################

terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  # Remote state stored in S3 with DynamoDB lock (replace bucket/table with real values)
  backend "s3" {
    bucket         = "dominahub-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/dominahub-state"          # CMK encrypts state at rest
    dynamodb_table = "dominahub-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "DominaHub"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

###############################################################################
# Variables
###############################################################################

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (production | staging)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "dominahub"
}

variable "domain_name" {
  description = "Primary domain name (e.g. app.dominahub.com.br)"
  type        = string
}

variable "db_master_username" {
  description = "RDS master username"
  type        = string
  default     = "dominahub_admin"
  sensitive   = true
}

###############################################################################
# Locals — used across all modules
###############################################################################

locals {
  name_prefix = "${var.app_name}-${var.environment}"

  # Availability zones (2 for HA, 3 for production resilience)
  azs = ["${var.aws_region}a", "${var.aws_region}b"]

  # CIDR blocks — RFC 1918 private space
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]   # ALB, NAT GW
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"] # App servers (ECS/EC2)
  db_subnet_cidrs      = ["10.0.21.0/24", "10.0.22.0/24"] # RDS — no internet route
}
