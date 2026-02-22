output "api_url" {
  description = "API Gateway base URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_execution_arn" {
  description = "API Gateway execution ARN (for Lambda permissions)"
  value       = aws_apigatewayv2_api.main.execution_arn
}
