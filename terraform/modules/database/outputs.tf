output "faces_table_name" {
  value = aws_dynamodb_table.faces.name
}
output "faces_table_arn" {
  value = aws_dynamodb_table.faces.arn
}
output "guests_table_name" {
  value = aws_dynamodb_table.guests.name
}
output "guests_table_arn" {
  value = aws_dynamodb_table.guests.arn
}
output "photos_table_name" {
  value = aws_dynamodb_table.photos.name
}
output "photos_table_arn" {
  value = aws_dynamodb_table.photos.arn
}
output "couple_faces_table_name" {
  value = aws_dynamodb_table.couple_faces.name
}
output "couple_faces_table_arn" {
  value = aws_dynamodb_table.couple_faces.arn
}
