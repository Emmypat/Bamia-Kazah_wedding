output "photos_upload_bucket_name" {
  description = "Name of the S3 bucket for photo uploads"
  value       = aws_s3_bucket.photos_upload.bucket
}

output "photos_upload_bucket_arn" {
  description = "ARN of the photos upload bucket (used in Lambda IAM policies)"
  value       = aws_s3_bucket.photos_upload.arn
}

output "frontend_bucket_name" {
  description = "Name of the frontend static site bucket"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_id" {
  description = "ID of the frontend bucket (used by CloudFront OAC)"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "ARN of the frontend bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_regional_domain_name" {
  description = "Regional domain name for CloudFront origin (e.g. bucket.s3.eu-west-1.amazonaws.com)"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}
