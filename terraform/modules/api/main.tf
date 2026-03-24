##############################################################
# modules/api/main.tf
#
# API Gateway v2 (HTTP API)
#
# WHY HTTP API (v2) over REST API (v1)?
# - ~70% cheaper ($1/million vs $3.50/million requests)
# - Simpler configuration
# - Native JWT authorizer (works directly with Cognito)
# - Slightly less features (no usage plans, no API keys)
#   — but we don't need those for a wedding app
#
# ROUTES:
# POST /upload          — Upload a photo (auth required)
# POST /search          — Search by selfie (auth required)
# GET  /photos          — List my photos (auth required)
# GET  /photos/{key}    — Get presigned URL (auth required)
# POST /register-couple — Register couple faces (admin only)
# GET  /health          — Health check (public)
##############################################################

# ── HTTP API ──────────────────────────────────────────────────
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"
  description   = "Wedding Photo Platform API"

  # CORS configuration
  # In production, restrict allow_origins to your CloudFront domain
  cors_configuration {
    allow_origins  = ["*"] # TODO: Replace with ["https://your-cloudfront-url.cloudfront.net"]
    allow_methods  = ["GET", "POST", "OPTIONS"]
    allow_headers  = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"]
    expose_headers = ["Content-Type", "X-Amz-Date"]
    max_age        = 3600
  }
}

# ── JWT Authorizer ────────────────────────────────────────────
# Validates the JWT token from Cognito on every protected route.
# Clients send: Authorization: Bearer <jwt_token>
# API Gateway validates the token without calling Lambda —
# this is fast and free (no extra Lambda invocations).
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    # The issuer is your Cognito User Pool's URL
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
    # Audience must match the client_id claim in Cognito access tokens
    audience = [var.cognito_user_pool_client_id]
  }
}

# ── Stage ─────────────────────────────────────────────────────
# A "stage" is a named version of your API (like dev/prod).
# "$default" is a special stage that matches all paths.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true # Automatically deploy when routes change

  # Access logging: records every API request
  # Great for debugging and monitoring wedding day traffic
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      duration       = "$context.responseLatency"
      userAgent      = "$context.identity.userAgent"
      errorMessage   = "$context.error.message"
    })
  }

  # Throttling: prevents abuse and controls costs
  default_route_settings {
    throttling_burst_limit  = 1000 # Max concurrent requests
    throttling_rate_limit   = 500  # Requests per second
    detailed_metrics_enabled = false # Enable for detailed CloudWatch metrics (extra cost)
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.name_prefix}"
  retention_in_days = 14
}

# ── Route + Integration Helpers ───────────────────────────────
# We repeat this pattern for each route:
# Route → Integration → Lambda function
# The integration specifies HOW to call the Lambda.

# Helper local: common integration settings
locals {
  integration_type         = "AWS_PROXY"          # Pass raw request to Lambda
  integration_content_type = "application/json"
  payload_format           = "2.0"                # Lambda payload format v2 (recommended)
}

# ── Route: POST /upload ───────────────────────────────────────
resource "aws_apigatewayv2_integration" "upload" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = local.integration_type
  integration_uri        = var.upload_handler_invoke_arn
  payload_format_version = local.payload_format
}

resource "aws_apigatewayv2_route" "upload" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /upload"
  target             = "integrations/${aws_apigatewayv2_integration.upload.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "api_upload" {
  statement_id  = "AllowAPIGWInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = var.upload_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/upload"
}

# ── Route: POST /search ───────────────────────────────────────
resource "aws_apigatewayv2_integration" "search" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = local.integration_type
  integration_uri        = var.search_handler_invoke_arn
  payload_format_version = local.payload_format
}

resource "aws_apigatewayv2_route" "search" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /search"
  target             = "integrations/${aws_apigatewayv2_integration.search.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "api_search" {
  statement_id  = "AllowAPIGWInvokeSearch"
  action        = "lambda:InvokeFunction"
  function_name = var.search_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/search"
}

# ── Route: POST /register-couple (uses search handler to register) ──
resource "aws_apigatewayv2_integration" "register_couple" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = local.integration_type
  integration_uri        = var.upload_handler_invoke_arn  # upload handler handles registration too
  payload_format_version = local.payload_format
}

resource "aws_apigatewayv2_route" "register_couple" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /register-couple"
  target             = "integrations/${aws_apigatewayv2_integration.register_couple.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Route: GET /photos ───────────────────────────────────────
# Lists all photos uploaded by the authenticated guest.
# Handled by search_handler (which also handles POST /search).
resource "aws_apigatewayv2_integration" "list_photos" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = local.integration_type
  integration_uri        = var.search_handler_invoke_arn
  payload_format_version = local.payload_format
}

resource "aws_apigatewayv2_route" "list_photos" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /photos"
  target             = "integrations/${aws_apigatewayv2_integration.list_photos.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "api_list_photos" {
  statement_id  = "AllowAPIGWInvokeListPhotos"
  action        = "lambda:InvokeFunction"
  function_name = var.search_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/photos"
}

# ── Route: GET /health (public, no auth) ─────────────────────
resource "aws_apigatewayv2_integration" "health" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = local.integration_type
  integration_uri        = var.upload_handler_invoke_arn
  payload_format_version = local.payload_format
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
  # No authorization_type → public route
}

resource "aws_lambda_permission" "api_health" {
  statement_id  = "AllowAPIGWInvokeHealth"
  action        = "lambda:InvokeFunction"
  function_name = var.upload_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/health"
}
