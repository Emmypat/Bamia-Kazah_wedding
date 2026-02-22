##############################################################
# modules/rekognition/main.tf
#
# Creates the AWS Rekognition Face Collection.
#
# WHY REKOGNITION?
# AWS Rekognition is a managed AI service for facial analysis.
# It handles the hard ML work — we just call its API.
# Cost: ~$0.001 per face detection/search. For a 100-person
# wedding with 500 photos, that's about $0.50 total. Cheap!
#
# HOW FACE COLLECTIONS WORK:
# A "collection" is like a database of faces:
#   - IndexFaces: adds a face from a photo to the collection
#   - SearchFaces: finds similar faces in the collection
#   - SearchFacesByImage: searches without needing a stored face
#
# We use one collection for ALL guest faces.
# The couple's faces are also in this collection (indexed during
# registration) and tracked separately in DynamoDB.
#
# TERRAFORM NOTE:
# aws_rekognition_collection was added in AWS provider v5.8.
# If you get "resource not found" errors, ensure provider >= 5.8.
##############################################################

resource "aws_rekognition_collection" "wedding_faces" {
  collection_id = var.collection_id

  tags = {
    Name    = "Wedding Face Collection"
    Purpose = "Guest face indexing and search"
  }
}
