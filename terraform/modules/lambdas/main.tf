##############################################################
# modules/lambdas/main.tf
#
# All Lambda functions + their IAM roles and CloudWatch logs.
#
# LAMBDA FUNCTIONS:
#   1. upload_handler    — receives photo from API, indexes faces
#   2. search_handler    — selfie search, returns matching photos
#   3. couple_detector   — S3-triggered, detects couple in photos
#   4. email_notifier    — SNS-triggered, emails guests
#
# IAM DESIGN:
# We use a single IAM role shared across all Lambdas, following
# least-privilege: only grant what each function needs.
# In a stricter setup, each function would have its own role.
# For a wedding app, the shared role simplifies management.
##############################################################

data "aws_caller_identity" "current" {}

# ── Lambda Execution Role ─────────────────────────────────────
# All Lambda functions assume this role when executing.
resource "aws_iam_role" "lambda_exec" {
  name = "${var.name_prefix}-lambda-exec-role"

  # Trust policy: only Lambda service can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy: all the specific AWS services our Lambdas need
resource "aws_iam_role_policy" "lambda_custom" {
  name = "${var.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3: read and write photos bucket
      {
        Sid    = "S3PhotosAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.photos_upload_bucket_arn,
          "${var.photos_upload_bucket_arn}/*"
        ]
      },
      # DynamoDB: full access to all our tables
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          var.faces_table_arn,
          "${var.faces_table_arn}/index/*",
          var.guests_table_arn,
          "${var.guests_table_arn}/index/*",
          var.photos_table_arn,
          "${var.photos_table_arn}/index/*",
          var.couple_faces_table_arn,
          var.tickets_table_arn,
          "${var.tickets_table_arn}/index/*",
          var.preapproved_table_arn,
          "${var.preapproved_table_arn}/index/*",
          var.coordinators_table_arn,
          "${var.coordinators_table_arn}/index/*",
          var.quota_enhancements_table_arn,
          "${var.quota_enhancements_table_arn}/index/*"
        ]
      },
      # Rekognition: face indexing and searching
      {
        Sid    = "RekognitionAccess"
        Effect = "Allow"
        Action = [
          "rekognition:IndexFaces",
          "rekognition:SearchFaces",
          "rekognition:SearchFacesByImage",
          "rekognition:DetectFaces",
          "rekognition:ListFaces",
          "rekognition:DeleteFaces"
        ]
        Resource = "arn:aws:rekognition:${var.aws_region}:${data.aws_caller_identity.current.account_id}:collection/${var.rekognition_collection_id}"
      },
      # SES: send emails
      {
        Sid      = "SESAccess"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*" # SES doesn't support resource-level permissions for SendEmail
      },
      # SNS: publish to couple alert topic
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = var.sns_topic_arn
      },
      # Cognito: user management for coordinators + guest password reset
      {
        Sid    = "CognitoUserManagement"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsersInGroup"
        ]
        Resource = "arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.cognito_user_pool_id}"
      }
    ]
  })
}

# ── Helper: Package Lambda code ───────────────────────────────
# Terraform's archive provider zips our Python code automatically.
# In production you'd use a CI/CD pipeline to build and deploy,
# but this approach is convenient for initial deployment.

data "archive_file" "upload_handler" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/upload_handler"
  output_path = "${path.module}/../../.build/upload_handler.zip"
}

data "archive_file" "search_handler" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/search_handler"
  output_path = "${path.module}/../../.build/search_handler.zip"
}

data "archive_file" "couple_detector" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/couple_detector"
  output_path = "${path.module}/../../.build/couple_detector.zip"
}

data "archive_file" "email_notifier" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/email_notifier"
  output_path = "${path.module}/../../.build/email_notifier.zip"
}

data "archive_file" "pre_signup" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/pre_signup"
  output_path = "${path.module}/../../.build/pre_signup.zip"
}

data "archive_file" "tickets_handler" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/tickets_handler"
  output_path = "${path.module}/../../.build/tickets_handler.zip"
}

# ── Lambda 1: Upload Handler ──────────────────────────────────
resource "aws_lambda_function" "upload_handler" {
  function_name    = "${var.name_prefix}-upload-handler"
  filename         = data.archive_file.upload_handler.output_path
  source_code_hash = data.archive_file.upload_handler.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler" # filename.function_name
  runtime          = "python3.11"

  # Memory: 512MB gives a good balance of speed vs cost.
  # Rekognition is a network call — extra memory won't help much.
  # Lambda pricing is memory × duration, so 512MB is reasonable.
  memory_size = 512
  timeout     = 30 # 30s max — API Gateway times out at 29s anyway

  # Cap concurrent executions to prevent runaway costs
  reserved_concurrent_executions = var.max_concurrency

  environment {
    variables = {
      PHOTOS_BUCKET              = var.photos_upload_bucket_name
      FACES_TABLE                = var.faces_table_name
      PHOTOS_TABLE               = var.photos_table_name
      REKOGNITION_COLLECTION_ID  = var.rekognition_collection_id
      REKOGNITION_MIN_CONFIDENCE = tostring(var.rekognition_min_confidence)
      PHOTO_URL_EXPIRY_HOURS     = tostring(var.photo_url_expiry_hours)
      AWS_ACCOUNT_ID             = data.aws_caller_identity.current.account_id
      COGNITO_USER_POOL_ID       = var.cognito_user_pool_id
    }
  }

  tags = { Name = "Upload Handler" }
}

resource "aws_cloudwatch_log_group" "upload_handler" {
  name              = "/aws/lambda/${aws_lambda_function.upload_handler.function_name}"
  retention_in_days = 14 # 14 days: enough to debug issues after the wedding
}

# ── Lambda 2: Search Handler ──────────────────────────────────
resource "aws_lambda_function" "search_handler" {
  function_name    = "${var.name_prefix}-search-handler"
  filename         = data.archive_file.search_handler.output_path
  source_code_hash = data.archive_file.search_handler.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 512
  timeout          = 30
  reserved_concurrent_executions = var.max_concurrency

  environment {
    variables = {
      PHOTOS_BUCKET              = var.photos_upload_bucket_name
      FACES_TABLE                = var.faces_table_name
      PHOTOS_TABLE               = var.photos_table_name
      REKOGNITION_COLLECTION_ID  = var.rekognition_collection_id
      REKOGNITION_MIN_CONFIDENCE = tostring(var.rekognition_min_confidence)
      PHOTO_URL_EXPIRY_HOURS     = tostring(var.photo_url_expiry_hours)
    }
  }

  tags = { Name = "Search Handler" }
}

resource "aws_cloudwatch_log_group" "search_handler" {
  name              = "/aws/lambda/${aws_lambda_function.search_handler.function_name}"
  retention_in_days = 14
}

# ── Lambda 3: Couple Detector ─────────────────────────────────
resource "aws_lambda_function" "couple_detector" {
  function_name    = "${var.name_prefix}-couple-detector"
  filename         = data.archive_file.couple_detector.output_path
  source_code_hash = data.archive_file.couple_detector.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 512
  timeout          = 60 # Longer: needs to query DynamoDB + publish to SNS

  environment {
    variables = {
      COUPLE_FACES_TABLE         = var.couple_faces_table_name
      PHOTOS_TABLE               = var.photos_table_name
      REKOGNITION_COLLECTION_ID  = var.rekognition_collection_id
      REKOGNITION_MIN_CONFIDENCE = tostring(var.rekognition_min_confidence)
      SNS_TOPIC_ARN              = var.sns_topic_arn
    }
  }

  tags = { Name = "Couple Detector" }
}

resource "aws_cloudwatch_log_group" "couple_detector" {
  name              = "/aws/lambda/${aws_lambda_function.couple_detector.function_name}"
  retention_in_days = 14
}

# S3 trigger: run couple_detector when a new photo is uploaded
resource "aws_s3_bucket_notification" "photo_upload_trigger" {
  bucket = var.photos_upload_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.couple_detector.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/" # Only trigger on photos, not other objects
  }

  depends_on = [aws_lambda_permission.allow_s3_couple_detector]
}

resource "aws_lambda_permission" "allow_s3_couple_detector" {
  statement_id  = "AllowS3InvokeCoupleDetector"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.couple_detector.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.photos_upload_bucket_arn
}

# ── Lambda 4: Email Notifier ──────────────────────────────────
resource "aws_lambda_function" "email_notifier" {
  function_name    = "${var.name_prefix}-email-notifier"
  filename         = data.archive_file.email_notifier.output_path
  source_code_hash = data.archive_file.email_notifier.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 256  # Less memory needed — no image processing
  timeout          = 300  # 5 min: may need to email many guests

  environment {
    variables = {
      GUESTS_TABLE   = var.guests_table_name
      PHOTOS_BUCKET  = var.photos_upload_bucket_name
      FROM_EMAIL     = var.from_email
      COUPLE_NAME    = var.couple_name
      WEDDING_DATE   = var.wedding_date
      PHOTO_URL_EXPIRY_HOURS = tostring(var.photo_url_expiry_hours)
    }
  }

  tags = { Name = "Email Notifier" }
}

resource "aws_cloudwatch_log_group" "email_notifier" {
  name              = "/aws/lambda/${aws_lambda_function.email_notifier.function_name}"
  retention_in_days = 14
}

# SNS trigger: run email_notifier when couple photo is detected
resource "aws_sns_topic_subscription" "email_notifier" {
  topic_arn = var.sns_topic_arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.email_notifier.arn
}

resource "aws_lambda_permission" "allow_sns_email_notifier" {
  statement_id  = "AllowSNSInvokeEmailNotifier"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_notifier.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = var.sns_topic_arn
}

# ── Lambda 5: Pre-Signup Trigger ──────────────────────────────
# Auto-confirms all Cognito registrations so guests can sign up
# with either email or phone (via synthetic email) without needing
# to verify a real email inbox.
resource "aws_lambda_function" "pre_signup" {
  function_name    = "${var.name_prefix}-pre-signup"
  filename         = data.archive_file.pre_signup.output_path
  source_code_hash = data.archive_file.pre_signup.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 128
  timeout          = 5

  tags = { Name = "Pre-Signup Trigger" }
}

resource "aws_cloudwatch_log_group" "pre_signup" {
  name              = "/aws/lambda/${aws_lambda_function.pre_signup.function_name}"
  retention_in_days = 14
}

# Note: the Lambda permission allowing Cognito to invoke this function
# is created in the auth module to avoid a circular dependency.

# ── Lambda 6: Tickets Handler ─────────────────────────────────
resource "aws_lambda_function" "tickets_handler" {
  function_name    = "${var.name_prefix}-tickets-handler"
  filename         = data.archive_file.tickets_handler.output_path
  source_code_hash = data.archive_file.tickets_handler.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 256
  timeout          = 30
  reserved_concurrent_executions = var.max_concurrency

  environment {
    variables = {
      TICKETS_TABLE              = var.tickets_table_name
      PHOTOS_BUCKET              = var.photos_upload_bucket_name
      PREAPPROVED_TABLE          = var.preapproved_table_name
      COORDINATOR_TABLE          = var.coordinators_table_name
      QUOTA_ENHANCEMENTS_TABLE   = var.quota_enhancements_table_name
      COGNITO_USER_POOL_ID       = var.cognito_user_pool_id
      FROM_EMAIL                 = var.from_email
      SITE_URL                   = var.site_url
    }
  }

  tags = { Name = "Tickets Handler" }
}

# ── Lambda 7: Coordinators Handler ────────────────────────────
data "archive_file" "coordinators_handler" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/coordinators_handler"
  output_path = "${path.module}/../../.build/coordinators_handler.zip"
}

resource "aws_lambda_function" "coordinators_handler" {
  function_name    = "${var.name_prefix}-coordinators-handler"
  filename         = data.archive_file.coordinators_handler.output_path
  source_code_hash = data.archive_file.coordinators_handler.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = 256
  timeout          = 30
  reserved_concurrent_executions = var.max_concurrency

  environment {
    variables = {
      COORDINATOR_TABLE        = var.coordinators_table_name
      QUOTA_ENHANCEMENTS_TABLE = var.quota_enhancements_table_name
      TICKETS_TABLE            = var.tickets_table_name
      COGNITO_USER_POOL_ID     = var.cognito_user_pool_id
      FROM_EMAIL               = var.from_email
      SITE_URL                 = var.site_url
    }
  }

  tags = { Name = "Coordinators Handler" }
}

resource "aws_cloudwatch_log_group" "coordinators_handler" {
  name              = "/aws/lambda/${aws_lambda_function.coordinators_handler.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "tickets_handler" {
  name              = "/aws/lambda/${aws_lambda_function.tickets_handler.function_name}"
  retention_in_days = 14
}
