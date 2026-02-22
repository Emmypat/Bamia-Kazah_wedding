##############################################################
# modules/cdn/main.tf
#
# CloudFront CDN distribution
#
# WHY CLOUDFRONT?
# - Serves frontend files from edge locations (fast globally)
# - HTTPS termination (free SSL certificate via ACM)
# - Protects S3 bucket (guests can't access S3 directly)
# - Caches static assets (faster loads, fewer S3 requests)
# - Routes /api/* to API Gateway seamlessly
#   → Frontend uses one base URL for everything
#
# TWO-ORIGIN PATTERN:
# Origin 1: S3 frontend bucket  → serves HTML/CSS/JS
# Origin 2: API Gateway          → serves /api/* requests
# This means the frontend can call /api/upload instead of
# the full API Gateway URL — simplifies configuration.
##############################################################

# CloudFront Origin Access Control (OAC)
# Replaces the older OAI — allows CloudFront to read from S3
# without making the bucket public.
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.name_prefix}-oac"
  description                       = "OAC for wedding platform frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Wedding Photo Platform"
  default_root_object = "index.html" # Serve index.html when visiting /

  # Custom domain aliases (only if domain_name is set)
  aliases = var.domain_name != "" ? [var.domain_name] : []

  # ── Origin 1: S3 Frontend ──────────────────────────────────
  origin {
    domain_name              = var.frontend_bucket_domain_name
    origin_id                = "S3Frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # ── Origin 2: API Gateway ──────────────────────────────────
  # Extract hostname from API Gateway URL
  origin {
    domain_name = replace(
      replace(var.api_gateway_url, "https://", ""),
      "/${regex("[^/]+$", var.api_gateway_url)}",
      ""
    )
    origin_id = "APIGateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── Default cache behaviour: serve frontend ────────────────
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Frontend"
    viewer_protocol_policy = "redirect-to-https" # Always upgrade HTTP to HTTPS
    compress               = true                # Gzip static assets

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # ── /api/* behaviour: proxy to API Gateway ────────────────
  ordered_cache_behavior {
    path_pattern    = "/api/*"
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]
    target_origin_id       = "APIGateway"
    viewer_protocol_policy = "https-only"
    compress               = true

    # Disable caching for API requests — always fresh data
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    # Forward the Authorization header (for Cognito JWT)
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin", "Content-Type"]
      cookies {
        forward = "none"
      }
    }
  }

  # ── Custom error pages (for React SPA routing) ────────────
  # React apps use client-side routing. When a user goes directly
  # to /gallery, CloudFront would return 403 (no such S3 object).
  # We redirect 403/404 to index.html so React can handle the route.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # Price class: which edge locations to use
  # PriceClass_100 = US + Europe only (cheapest, ~$0.01/10GB)
  # PriceClass_200 = + Asia/Middle East
  # PriceClass_All = all locations (most expensive)
  price_class = "PriceClass_100"

  # SSL/HTTPS configuration
  viewer_certificate {
    # Use custom cert if domain_name is set, otherwise use default CloudFront cert
    acm_certificate_arn      = var.certificate_arn != "" ? var.certificate_arn : null
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    ssl_support_method       = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = var.certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  # Geo restriction: none (guests may come from anywhere)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = { Name = "Wedding Platform CDN" }
}

# Cache policy: pre-built AWS policy for optimized caching
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}
