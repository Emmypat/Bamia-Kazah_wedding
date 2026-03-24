##############################################################
# backend.tf
#
# Terraform stores its "state file" (a record of what it has
# created) somewhere. By default it's local — fine for dev,
# but risky for production because:
#   - If you lose the file, Terraform loses track of resources
#   - Two people can't run Terraform at the same time safely
#
# This backend stores state in S3 (durable) and uses a
# DynamoDB table for locking (prevents concurrent runs).
#
# ⚠️  BOOTSTRAP REQUIREMENT:
# You must create the S3 bucket and DynamoDB table BEFORE
# running `terraform init`. See docs/DEPLOYMENT.md Step 3.
#
# To use local state instead (simpler, fine for solo dev):
# Comment out the entire backend block below.
##############################################################

terraform {
  backend "s3" {
    bucket         = "wedding-photos-tfstate-360121241699"
    key            = "prod/terraform.tfstate"         # Path within the bucket
    region         = "eu-west-1"                      # Must match your aws_region
    encrypt        = true                             # Encrypts state file at rest
    dynamodb_table = "wedding-photos-terraform-locks" # DynamoDB table for state locking
  }
}

##############################################################
# How to create the bootstrap resources (run once manually):
#
# aws s3api create-bucket \
#   --bucket wedding-photos-terraform-state \
#   --region eu-west-1 \
#   --create-bucket-configuration LocationConstraint=eu-west-1
#
# aws s3api put-bucket-versioning \
#   --bucket wedding-photos-terraform-state \
#   --versioning-configuration Status=Enabled
#
# aws dynamodb create-table \
#   --table-name wedding-photos-terraform-locks \
#   --attribute-definitions AttributeName=LockID,AttributeType=S \
#   --key-schema AttributeName=LockID,KeyType=HASH \
#   --billing-mode PAY_PER_REQUEST \
#   --region eu-west-1
##############################################################
