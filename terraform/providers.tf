##############################################################
# providers.tf
#
# This file declares which providers (plugins) Terraform needs
# and locks their versions so the build is reproducible.
#
# "Provider" = a plugin that lets Terraform talk to an external
# service (AWS, GitHub, etc.). Every resource block needs one.
##############################################################

terraform {
  required_version = ">= 1.5.0" # Minimum Terraform CLI version

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30" # ~> means "5.30.x but not 6.x" — safe updates, no breaking changes
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6" # Used to generate unique suffixes for globally-unique S3 names
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4" # Used to zip Lambda function code before uploading
    }
  }
}

##############################################################
# AWS Provider
# This tells Terraform which region to deploy resources in
# and which AWS credentials to use (from environment variables
# or ~/.aws/credentials — never hardcode keys here).
##############################################################
provider "aws" {
  region = var.aws_region

  # Tag every resource automatically with project metadata.
  # This makes cost tracking and cleanup much easier.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# CloudFront requires ACM certificates to be in us-east-1 specifically.
# We create an alias provider for that region.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
