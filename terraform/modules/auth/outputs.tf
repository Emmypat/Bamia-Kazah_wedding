output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.guests.id
}

output "user_pool_client_id" {
  description = "Cognito App Client ID for frontend"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint for JWT issuer URL"
  value       = aws_cognito_user_pool.guests.endpoint
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.guests.arn
}
