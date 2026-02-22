output "cloudfront_domain_name" {
  description = "CloudFront domain name (e.g. abc123.cloudfront.net)"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN (used in S3 bucket policy)"
  value       = aws_cloudfront_distribution.main.arn
}
