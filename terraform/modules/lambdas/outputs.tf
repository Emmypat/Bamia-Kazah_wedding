output "upload_handler_invoke_arn" {
  value = aws_lambda_function.upload_handler.invoke_arn
}
output "upload_handler_function_name" {
  value = aws_lambda_function.upload_handler.function_name
}
output "search_handler_invoke_arn" {
  value = aws_lambda_function.search_handler.invoke_arn
}
output "search_handler_function_name" {
  value = aws_lambda_function.search_handler.function_name
}
output "couple_detector_invoke_arn" {
  value = aws_lambda_function.couple_detector.invoke_arn
}
output "couple_detector_function_name" {
  value = aws_lambda_function.couple_detector.function_name
}
output "email_notifier_invoke_arn" {
  value = aws_lambda_function.email_notifier.invoke_arn
}
