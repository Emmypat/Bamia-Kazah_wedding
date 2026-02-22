##############################################################
# variables.tf
#
# All configurable inputs for the root module.
# Values are set in terraform.tfvars (which is gitignored).
# See terraform.tfvars.example for a template.
##############################################################

variable "aws_region" {
  description = "AWS region to deploy all resources. Choose one close to your guests."
  type        = string
  default     = "eu-west-1" # Ireland — good for UK/European weddings
}

variable "project_name" {
  description = "Short name used to prefix all resource names. Keep it lowercase, no spaces."
  type        = string
  default     = "wedding-photos"
}

variable "environment" {
  description = "Deployment environment. Affects resource naming and some configs."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# ── Couple Information ────────────────────────────────────────

variable "couple_name" {
  description = "Names of the couple, used in email subjects and UI headings."
  type        = string
  default     = "The Happy Couple"
}

variable "wedding_date" {
  description = "Wedding date in YYYY-MM-DD format. Used in UI and emails."
  type        = string
  default     = "2025-06-15"
}

variable "couple_email_1" {
  description = "Email address for partner 1. Will receive notifications."
  type        = string
}

variable "couple_email_2" {
  description = "Email address for partner 2. Will receive notifications."
  type        = string
}

# ── Notifications ─────────────────────────────────────────────

variable "notification_email_from" {
  description = <<-EOT
    The 'From' email address for SES notifications.
    IMPORTANT: This email must be verified in AWS SES before sending.
    In SES sandbox mode (default), recipient emails must also be verified.
    To send to anyone, submit an SES production access request.
  EOT
  type        = string
}

# ── Domain (Optional) ─────────────────────────────────────────

variable "domain_name" {
  description = <<-EOT
    Optional custom domain for CloudFront (e.g. "photos.yourwedding.com").
    Leave empty to use the auto-generated CloudFront URL.
    If set, you must also provide certificate_arn.
  EOT
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = <<-EOT
    ARN of an ACM certificate for your custom domain.
    Must be in us-east-1 (CloudFront requirement).
    Leave empty if not using a custom domain.
  EOT
  type        = string
  default     = ""
}

# ── Rekognition ───────────────────────────────────────────────

variable "rekognition_collection_id" {
  description = <<-EOT
    ID for the Rekognition face collection.
    This is the database where all indexed guest faces are stored.
    Must be lowercase, alphanumeric, hyphens allowed.
  EOT
  type        = string
  default     = "wedding-faces"
}

variable "rekognition_min_confidence" {
  description = "Minimum confidence % for face detection (0-100). Higher = stricter matching."
  type        = number
  default     = 90

  validation {
    condition     = var.rekognition_min_confidence >= 70 && var.rekognition_min_confidence <= 100
    error_message = "Confidence must be between 70 and 100."
  }
}

# ── File Handling ─────────────────────────────────────────────

variable "allowed_file_types" {
  description = "Allowed image MIME types for uploads."
  type        = list(string)
  default     = ["image/jpeg", "image/png", "image/webp", "image/heic"]
}

variable "max_file_size_mb" {
  description = "Maximum upload file size in MB."
  type        = number
  default     = 20
}

variable "photo_url_expiry_hours" {
  description = "How many hours presigned S3 URLs stay valid. Guests use these to download photos."
  type        = number
  default     = 48
}

# ── Cost Controls ─────────────────────────────────────────────

variable "lambda_max_concurrency" {
  description = <<-EOT
    Maximum concurrent Lambda executions (reserved concurrency).
    Prevents runaway costs if the platform gets unexpected traffic.
    100 concurrent uploads should be more than enough for a wedding.
  EOT
  type        = number
  default     = 100
}

variable "photo_retention_days" {
  description = "Days to keep original uploaded photos before S3 lifecycle deletes them. Set to 0 to keep forever."
  type        = number
  default     = 90
}
