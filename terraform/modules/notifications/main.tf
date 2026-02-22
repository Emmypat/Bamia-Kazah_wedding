##############################################################
# modules/notifications/main.tf
#
# SNS topic for couple photo alerts + SES email identity.
#
# FLOW:
# 1. Photo uploaded → couple_detector Lambda runs
# 2. Couple detected → Lambda publishes message to SNS topic
# 3. SNS delivers message to email_notifier Lambda subscriber
# 4. Lambda queries DynamoDB for all guest emails
# 5. SES sends each guest a beautiful HTML email
#
# WHY SNS BETWEEN LAMBDAS?
# Decoupling: the upload handler doesn't wait for emails to send.
# If email sending fails, it doesn't affect the upload response.
# SNS also enables adding more subscribers later (SMS, push, etc).
#
# SES SANDBOX NOTE:
# New AWS accounts are in SES sandbox mode:
# - Can only send TO verified email addresses
# - To send to anyone, request production access:
#   AWS Console → SES → Account dashboard → Request production access
##############################################################

# SNS Topic: fires when couple is detected in a photo
resource "aws_sns_topic" "couple_photo_alerts" {
  name = "${var.name_prefix}-couple-photo-alerts"

  # Optional: encrypt SNS messages at rest
  # kms_master_key_id = "alias/aws/sns"

  tags = {
    Name = "Couple Photo Alert Topic"
  }
}

# SNS Topic Policy: defines who can publish/subscribe
resource "aws_sns_topic_policy" "couple_photo_alerts" {
  arn    = aws_sns_topic.couple_photo_alerts.arn
  policy = data.aws_iam_policy_document.sns_topic_policy.json
}

data "aws_iam_policy_document" "sns_topic_policy" {
  statement {
    sid    = "AllowLambdaPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.couple_photo_alerts.arn]
  }
}

# SES Email Identity: verify the sender email address
# After terraform apply, AWS will send a verification email.
# You must click the link before SES will send from this address.
resource "aws_ses_email_identity" "sender" {
  email = var.from_email
}
