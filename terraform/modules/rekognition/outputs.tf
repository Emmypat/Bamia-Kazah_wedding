output "collection_id" {
  description = "Rekognition collection ID"
  value       = aws_rekognition_collection.wedding_faces.collection_id
}

output "collection_arn" {
  description = "Rekognition collection ARN"
  value       = aws_rekognition_collection.wedding_faces.arn
}
