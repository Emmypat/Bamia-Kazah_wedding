##############################################################
# modules/storage/main.tf
#
# Creates all S3 buckets for the platform:
#   1. photos_upload   — guests upload here, Lambda processes it
#   2. frontend        — hosts the React static site
#
# Design decisions:
# - Versioning on photos bucket: protects against accidental
#   deletion. Wedding photos are irreplaceable.
# - All buckets private by default. CloudFront uses an OAC
#   (Origin Access Control) to access the frontend bucket —
#   guests can't access S3 directly, only via CloudFront.
# - CORS on photos bucket allows the frontend JS to upload
#   directly (though we route through Lambda for validation).
# - Server-side encryption on all buckets (SSE-S3 = free,
#   SSE-KMS = extra cost, overkill for wedding photos).
##############################################################

# ── Photos Upload Bucket ──────────────────────────────────────
# This is where all guest-uploaded photos land.
resource "aws_s3_bucket" "photos_upload" {
  bucket = "${var.name_prefix}-photos-${var.suffix}"

  # Protect against accidental terraform destroy
  # Comment this out if you need to destroy the bucket
  lifecycle {
    prevent_destroy = false # Set to true for real wedding day!
  }

  tags = {
    Name    = "Wedding Photos Upload"
    Purpose = "Guest photo uploads"
  }
}

# Versioning: keeps old versions of objects.
# If a photo is accidentally overwritten, you can restore it.
resource "aws_s3_bucket_versioning" "photos_upload" {
  bucket = aws_s3_bucket.photos_upload.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption at rest — all objects encrypted with AES-256
resource "aws_s3_bucket_server_side_encryption_configuration" "photos_upload" {
  bucket = aws_s3_bucket.photos_upload.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # Free. KMS is ~$1/10,000 requests — not worth it here.
    }
    bucket_key_enabled = true # Reduces KMS API calls if you ever switch to KMS
  }
}

# Block ALL public access — photos are private, accessed via presigned URLs only
resource "aws_s3_bucket_public_access_block" "photos_upload" {
  bucket = aws_s3_bucket.photos_upload.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS: allows the browser to make requests to this bucket.
# Even though uploads go via API Gateway→Lambda, we set this
# as a safety net for any direct upload scenarios.
resource "aws_s3_bucket_cors_configuration" "photos_upload" {
  bucket = aws_s3_bucket.photos_upload.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"] # TODO: Restrict to your CloudFront domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lifecycle rule: automatically delete old uploads to save storage costs.
# Wedding photos are precious but 90 days after the wedding, guests
# have had time to download. Adjust retention_days to 0 to keep forever.
resource "aws_s3_bucket_lifecycle_configuration" "photos_upload" {
  count  = var.photo_retention_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.photos_upload.id

  rule {
    id     = "expire-old-uploads"
    status = "Enabled"

    # Apply to all objects (no filter prefix)
    filter {
      prefix = ""
    }

    expiration {
      days = var.photo_retention_days
    }

    # Also clean up incomplete multipart uploads (saves space)
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Clean up old versions after 30 days
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ── Frontend Bucket ───────────────────────────────────────────
# Hosts the static React build files (HTML, CSS, JS).
# Not directly public — CloudFront serves it via OAC.
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.name_prefix}-frontend-${var.suffix}"

  tags = {
    Name    = "Wedding Platform Frontend"
    Purpose = "Static website hosting"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Frontend bucket is also private — CloudFront handles delivery
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudFront to read from this bucket using OAC (Origin Access Control).
# OAC is the modern replacement for OAI — more secure and supports SSE-KMS.
# The actual CloudFront OAC is created in the CDN module; we reference it here.
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}

data "aws_iam_policy_document" "frontend_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    # Condition: only allow requests from OUR CloudFront distribution.
    # This prevents other CloudFront distributions from accessing this bucket.
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}
