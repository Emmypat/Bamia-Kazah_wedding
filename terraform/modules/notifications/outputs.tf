output "sns_topic_arn" {
  description = "ARN of the couple photo alert SNS topic"
  value       = aws_sns_topic.couple_photo_alerts.arn
}

output "ses_identity_arn" {
  description = "ARN of the verified SES email identity"
  value       = aws_ses_email_identity.sender.arn
}
