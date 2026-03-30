##############################################################
# modules/database/main.tf
#
# DynamoDB tables for the wedding platform.
#
# WHY DYNAMODB?
# - Serverless: no servers to manage, scales automatically
# - PAY_PER_REQUEST: you only pay for actual reads/writes
#   (perfect for a wedding — big spike on the day, then quiet)
# - Single-digit millisecond latency: fast face lookups
# - No schema enforcement needed — flexible for our use case
#
# DATA MODEL OVERVIEW:
#
# faces table:     faceId → {photoKey, guestId, uploadedAt}
# guests table:    email → {name, registeredAt, faceId}
# photos table:    photoKey → {uploadedBy, faces[], isCouple}
# couple_faces:    faceId → {personName, registeredAt}
#
# The faceId comes from AWS Rekognition when you index a face.
# It's the link between the AI world (Rekognition) and our data.
##############################################################

# ── Faces Table ───────────────────────────────────────────────
# Maps Rekognition face IDs to photos and guests.
# When a photo is uploaded and faces are indexed, we write here:
#   faceId (from Rekognition) → photoKey, guestId, uploadedAt
#
# This is how "find photos containing face X" works:
#   1. Search with selfie → Rekognition returns matching faceIds
#   2. Query this table for each faceId → get photoKeys
#   3. Generate presigned URLs for those photoKeys
resource "aws_dynamodb_table" "faces" {
  name         = "${var.name_prefix}-faces"
  billing_mode = "PAY_PER_REQUEST" # No capacity planning needed — pay per read/write

  # Primary key: faceId is unique per indexed face
  hash_key = "faceId"

  attribute {
    name = "faceId"
    type = "S" # String
  }

  # GSI: allows querying "all faces uploaded by guest X"
  # Useful for showing a guest their own uploads
  attribute {
    name = "guestId"
    type = "S"
  }

  global_secondary_index {
    name            = "guestId-index"
    hash_key        = "guestId"
    projection_type = "ALL" # Include all attributes in the index
  }

  # Point-in-time recovery: can restore to any second in the last 35 days.
  # Critical for wedding data — if someone accidentally deletes records, 
  # you can restore them.
  point_in_time_recovery {
    enabled = true
  }

  # Encryption at rest with AWS-managed keys (free)
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Faces index table"
  }
}

# ── Guests Table ──────────────────────────────────────────────
# Stores guest registration data.
# PK: email (unique per guest — their login identifier)
# Attributes: name, registeredAt, faceId (optional — set when
#   guest uploads a selfie for registration)
resource "aws_dynamodb_table" "guests" {
  name         = "${var.name_prefix}-guests"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "email"

  attribute {
    name = "email"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Guest registry"
  }
}

# ── Photos Table ──────────────────────────────────────────────
# Metadata for every uploaded photo.
# PK: photoKey (S3 object key, e.g. "uploads/2025/06/15/uuid.jpg")
# Attributes:
#   - uploadedBy: guestId who uploaded it
#   - uploadedAt: ISO timestamp
#   - faces: list of faceIds detected in this photo
#   - isCouple: true if the couple appears in this photo
#   - faceCount: number of faces detected
resource "aws_dynamodb_table" "photos" {
  name         = "${var.name_prefix}-photos"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "photoKey"

  attribute {
    name = "photoKey"
    type = "S"
  }

  # GSI: find all photos uploaded by a specific guest
  attribute {
    name = "uploadedBy"
    type = "S"
  }

  global_secondary_index {
    name            = "uploadedBy-index"
    hash_key        = "uploadedBy"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Photo metadata"
  }
}

# ── Tickets Table ─────────────────────────────────────────────
# Attendance ticket requests from guests.
# PK: ticketId (format WED-XXXX)
# Attributes: guestName, phone, selfieKey, status, createdAt, userId
resource "aws_dynamodb_table" "tickets" {
  name         = "${var.name_prefix}-tickets"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "ticketId"

  attribute {
    name = "ticketId"
    type = "S"
  }

  # GSI: find all tickets for a specific Cognito user
  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-index"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Attendance tickets"
  }
}

# ── Pre-approved Guests Table ─────────────────────────────────
# Stores phone numbers pre-approved by the admin before they register.
# When a guest submits a ticket, if their phone is in this table
# (and not yet used), the ticket is auto-approved instantly.
# PK: id (UUID) — phone is not the PK so the same phone can be
# added again if needed (e.g. after being marked used).
resource "aws_dynamodb_table" "preapproved_guests" {
  name         = "${var.name_prefix}-preapproved-guests"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Pre-approved guests"
  }
}

# ── Couple Faces Table ────────────────────────────────────────
# Stores the registered face IDs of the wedding couple.
# When a photo is processed, we check if any of these faceIds
# appear in the photo → if yes, it's a "couple photo" → notify all.
#
# Why a separate table? 
# - The couple's faceIds are special — they trigger notifications
# - Keeping them separate makes the couple_detector Lambda simpler
# - Admin can add/remove faces without touching the main faces table
resource "aws_dynamodb_table" "couple_faces" {
  name         = "${var.name_prefix}-couple-faces"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "faceId"

  attribute {
    name = "faceId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Couple face registry"
  }
}
