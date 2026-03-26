##############################################################
# main.tf  —  Root Module
#
# This is the "conductor" file. It calls each child module
# and wires their outputs together as inputs for other modules.
#
# Think of modules like functions:
#   module "storage" = storage_module(project_name, ...)
#   module "database" = database_module(project_name, ...)
#   etc.
#
# Dependency order (Terraform figures this out automatically
# from input/output references):
#
#   storage ──► lambdas ──► api ──► cdn
#   database ──►       /
#   auth    ──────────/
#   rekognition ─────/
#   notifications ───/
##############################################################

# ── Random suffix ─────────────────────────────────────────────
# S3 bucket names must be globally unique across all AWS accounts.
# We add a short random suffix to avoid collisions.
resource "random_id" "suffix" {
  byte_length = 4 # Produces an 8-character hex string, e.g. "a3f2b1c4"
}

locals {
  # Reusable name prefix for all resources
  name_prefix = "${var.project_name}-${var.environment}"
  # Short suffix for globally-unique names
  suffix = random_id.suffix.hex
}

# ── Module: Storage ───────────────────────────────────────────
# S3 buckets for photos, processed images, and the frontend
module "storage" {
  source = "./modules/storage"

  name_prefix       = local.name_prefix
  suffix            = local.suffix
  photo_retention_days = var.photo_retention_days
}

# ── Module: Database ──────────────────────────────────────────
# DynamoDB tables for faces, guests, photos, and couple faces
module "database" {
  source = "./modules/database"

  name_prefix = local.name_prefix
}

# ── Module: Rekognition ───────────────────────────────────────
# Creates the Rekognition face collection used for indexing
# and searching guest faces
module "rekognition" {
  source = "./modules/rekognition"

  collection_id = var.rekognition_collection_id
  aws_region    = var.aws_region
}

# ── Module: Auth ──────────────────────────────────────────────
# Cognito User Pool and App Client for guest authentication
module "auth" {
  source = "./modules/auth"

  name_prefix           = local.name_prefix
  project_name          = var.project_name
  pre_signup_lambda_arn = module.lambdas.pre_signup_lambda_arn
}

# ── Module: Notifications ─────────────────────────────────────
# SNS topic and SES configuration for couple photo alerts
module "notifications" {
  source = "./modules/notifications"

  name_prefix    = local.name_prefix
  from_email     = var.notification_email_from
  couple_name    = var.couple_name
  wedding_date   = var.wedding_date
}

# ── Module: Lambdas ───────────────────────────────────────────
# All Lambda functions (depends on storage, database, rekognition)
module "lambdas" {
  source = "./modules/lambdas"

  name_prefix = local.name_prefix

  # Storage
  photos_upload_bucket_name = module.storage.photos_upload_bucket_name
  photos_upload_bucket_arn  = module.storage.photos_upload_bucket_arn

  # Database
  faces_table_name        = module.database.faces_table_name
  faces_table_arn         = module.database.faces_table_arn
  guests_table_name       = module.database.guests_table_name
  guests_table_arn        = module.database.guests_table_arn
  photos_table_name       = module.database.photos_table_name
  photos_table_arn        = module.database.photos_table_arn
  couple_faces_table_name = module.database.couple_faces_table_name
  couple_faces_table_arn  = module.database.couple_faces_table_arn
  tickets_table_name      = module.database.tickets_table_name
  tickets_table_arn       = module.database.tickets_table_arn

  # Rekognition
  rekognition_collection_id  = var.rekognition_collection_id
  rekognition_min_confidence = var.rekognition_min_confidence

  # Notifications
  sns_topic_arn = module.notifications.sns_topic_arn

  # Config
  max_concurrency       = var.lambda_max_concurrency
  from_email            = var.notification_email_from
  photo_url_expiry_hours = var.photo_url_expiry_hours
  couple_name           = var.couple_name
  wedding_date          = var.wedding_date
  aws_region            = var.aws_region
  cognito_user_pool_id  = module.auth.user_pool_id
}

# ── Module: API Gateway ───────────────────────────────────────
# HTTP API wiring all Lambda functions to REST endpoints
module "api" {
  source = "./modules/api"

  name_prefix = local.name_prefix

  # Lambda function ARNs to integrate
  upload_handler_invoke_arn   = module.lambdas.upload_handler_invoke_arn
  upload_handler_function_name = module.lambdas.upload_handler_function_name

  search_handler_invoke_arn   = module.lambdas.search_handler_invoke_arn
  search_handler_function_name = module.lambdas.search_handler_function_name

  couple_detector_invoke_arn   = module.lambdas.couple_detector_invoke_arn
  couple_detector_function_name = module.lambdas.couple_detector_function_name

  tickets_handler_invoke_arn   = module.lambdas.tickets_handler_invoke_arn
  tickets_handler_function_name = module.lambdas.tickets_handler_function_name

  # Cognito authorizer
  cognito_user_pool_endpoint  = module.auth.user_pool_endpoint
  cognito_user_pool_id        = module.auth.user_pool_id
  cognito_user_pool_client_id = module.auth.user_pool_client_id

  aws_region = var.aws_region
}

# ── Frontend S3 bucket policy ─────────────────────────────────
# Must be created after CDN so we have the distribution ARN.
resource "aws_s3_bucket_policy" "frontend" {
  bucket = module.storage.frontend_bucket_id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${module.storage.frontend_bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = module.cdn.cloudfront_distribution_arn
        }
      }
    }]
  })
  depends_on = [module.cdn]
}

# ── Module: CDN ───────────────────────────────────────────────
# CloudFront distribution serving frontend + proxying API
module "cdn" {
  source = "./modules/cdn"

  name_prefix = local.name_prefix

  frontend_bucket_domain_name     = module.storage.frontend_bucket_regional_domain_name
  frontend_bucket_id              = module.storage.frontend_bucket_id
  api_gateway_url                 = module.api.api_url

  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn
}
