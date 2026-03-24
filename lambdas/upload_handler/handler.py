"""
Upload Handler Lambda
======================
Triggered by: API Gateway POST /upload

This function handles photo uploads from wedding guests:
1. Receives a base64-encoded image in the request body
2. Validates file type and size
3. Generates a unique S3 key and uploads the photo
4. Calls AWS Rekognition to detect and index all faces in the photo
5. Stores face→photo mappings in DynamoDB
6. Stores photo metadata in DynamoDB
7. Returns a success response with the photo key

Also handles:
- POST /register-couple: Admin registers a couple's face
- GET /health: Health check endpoint

Environment variables required:
- PHOTOS_BUCKET: S3 bucket name for photo storage
- FACES_TABLE: DynamoDB table for face→photo mapping
- PHOTOS_TABLE: DynamoDB table for photo metadata
- REKOGNITION_COLLECTION_ID: Rekognition face collection
- REKOGNITION_MIN_CONFIDENCE: Minimum face match confidence (0-100)
- PHOTO_URL_EXPIRY_HOURS: Presigned URL validity in hours
"""

import json
import base64
import hashlib
import os
import logging
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.exceptions import ClientError

# ── Logging ─────────────────────────────────────────────────────
# Lambda captures stdout/stderr to CloudWatch automatically.
# Use structured logging for easy querying in CloudWatch Insights.
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ── AWS Clients ──────────────────────────────────────────────────
# Initialised at module level (outside handler) so they're reused
# across Lambda invocations (warm starts). This saves ~100ms per call.
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
rekognition = boto3.client("rekognition")

# ── Environment Variables ────────────────────────────────────────
PHOTOS_BUCKET = os.environ["PHOTOS_BUCKET"]
FACES_TABLE = os.environ["FACES_TABLE"]
PHOTOS_TABLE = os.environ["PHOTOS_TABLE"]
REKOGNITION_COLLECTION_ID = os.environ["REKOGNITION_COLLECTION_ID"]
REKOGNITION_MIN_CONFIDENCE = float(os.environ.get("REKOGNITION_MIN_CONFIDENCE", "90"))
PHOTO_URL_EXPIRY_HOURS = int(os.environ.get("PHOTO_URL_EXPIRY_HOURS", "48"))

# ── DynamoDB Table References ────────────────────────────────────
faces_table = dynamodb.Table(FACES_TABLE)
photos_table = dynamodb.Table(PHOTOS_TABLE)

# ── Constants ────────────────────────────────────────────────────
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def lambda_handler(event: dict, context) -> dict:
    """
    Main Lambda entry point. Routes to the appropriate handler
    based on the HTTP method and path.

    API Gateway sends events in "payload format 2.0" structure:
    {
        "routeKey": "POST /upload",
        "requestContext": { "authorizer": { "jwt": { "claims": {...} } } },
        "body": "...",
        "isBase64Encoded": False
    }
    """
    route_key = event.get("routeKey", "")
    logger.info(f"Received request: {route_key}")

    if route_key == "GET /health":
        return health_check()
    elif route_key == "POST /upload":
        return handle_upload(event)
    elif route_key == "POST /register-couple":
        return handle_register_couple(event)
    else:
        return error_response(404, f"Route not found: {route_key}")


# ─────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────

def health_check() -> dict:
    """Simple health check — returns 200 OK."""
    return success_response({"status": "ok", "timestamp": utc_now()})


# ─────────────────────────────────────────────────────────────────
# UPLOAD HANDLER
# ─────────────────────────────────────────────────────────────────

def handle_upload(event: dict) -> dict:
    """
    Process a photo upload from a guest.

    Expected request body (JSON):
    {
        "image": "<base64-encoded image data>",
        "contentType": "image/jpeg",
        "filename": "photo.jpg"   (optional)
    }
    """
    # Extract authenticated user info from JWT claims
    # API Gateway populates this from the Cognito JWT token
    guest_id = extract_guest_id(event)
    if not guest_id:
        return error_response(401, "Unauthorized: missing or invalid token")

    # Parse request body
    try:
        body = parse_body(event)
    except ValueError as e:
        return error_response(400, f"Invalid request body: {str(e)}")

    # Validate required fields
    image_b64 = body.get("image")
    content_type = body.get("contentType", "image/jpeg").lower()

    if not image_b64:
        return error_response(400, "Missing 'image' field in request body")

    if content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(400, f"Unsupported file type: {content_type}. Allowed: {list(ALLOWED_CONTENT_TYPES.keys())}")

    # Decode base64 image
    try:
        # Handle data URIs like "data:image/jpeg;base64,/9j/4AAQ..."
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {e}")
        return error_response(400, "Invalid base64 image data")

    # Check file size
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        return error_response(413, f"File too large. Max size: {MAX_FILE_SIZE_BYTES // (1024*1024)}MB")

    # Generate a deterministic S3 key from the file's SHA-256 hash.
    # This ensures identical photos always map to the same key,
    # so duplicate uploads are detected with a single DynamoDB lookup.
    ext = ALLOWED_CONTENT_TYPES[content_type]
    file_hash = hashlib.sha256(image_bytes).hexdigest()
    photo_key = f"uploads/{file_hash}{ext}"

    # Duplicate check: if this exact photo was already uploaded, return
    # the existing record without re-uploading or re-indexing faces.
    existing = photos_table.get_item(Key={"photoKey": photo_key}).get("Item")
    if existing:
        logger.info(f"Duplicate photo detected: {photo_key}")
        return success_response({
            "message": "Photo already uploaded",
            "photoKey": photo_key,
            "facesDetected": int(existing.get("faceCount", 0)),
            "uploadedAt": existing.get("uploadedAt", utc_now()),
            "duplicate": True,
        })

    # Upload to S3
    try:
        s3.put_object(
            Bucket=PHOTOS_BUCKET,
            Key=photo_key,
            Body=image_bytes,
            ContentType=content_type,
            Metadata={
                "uploaded-by": guest_id,
                "uploaded-at": utc_now(),
            }
        )
        logger.info(f"Uploaded photo to S3: {photo_key}")
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        return error_response(500, "Failed to upload photo")

    # Index faces with Rekognition
    face_ids = index_faces(photo_key, image_bytes)
    logger.info(f"Indexed {len(face_ids)} faces in photo {photo_key}")

    # Store face→photo mappings in DynamoDB
    store_face_mappings(face_ids, photo_key, guest_id)

    # Store photo metadata in DynamoDB
    store_photo_metadata(photo_key, guest_id, face_ids)

    return success_response({
        "message": "Photo uploaded successfully",
        "photoKey": photo_key,
        "facesDetected": len(face_ids),
        "uploadedAt": utc_now(),
        "duplicate": False,
    })


def index_faces(photo_key: str, image_bytes: bytes) -> list[str]:
    """
    Send the photo to Rekognition to detect and index all faces.

    IndexFaces:
    - Detects faces in the image
    - Stores face vectors in our collection (for future searches)
    - Returns a FaceId for each indexed face

    We use the S3 key as ExternalImageId so we can later
    find which photo a faceId belongs to.
    """
    try:
        response = rekognition.index_faces(
            CollectionId=REKOGNITION_COLLECTION_ID,
            Image={"Bytes": image_bytes},
            ExternalImageId=photo_key.replace("/", "_"),  # Can't have / in ExternalImageId
            DetectionAttributes=["DEFAULT"],  # DEFAULT = just face bounding boxes
            MaxFaces=20,  # Max faces per photo (20 should be enough for group shots)
            QualityFilter="AUTO",  # Skip faces that are too blurry/small to match well
        )
        # Return list of FaceIds that were successfully indexed
        return [f["Face"]["FaceId"] for f in response.get("FaceRecords", [])]

    except ClientError as e:
        # Log but don't fail the upload — photo is saved even if face indexing fails
        logger.warning(f"Rekognition IndexFaces failed for {photo_key}: {e}")
        return []


def store_face_mappings(face_ids: list, photo_key: str, guest_id: str):
    """
    Store each faceId → photoKey mapping in DynamoDB.

    This is how the search works later:
    Selfie → Rekognition SearchFacesByImage → list of faceIds
    → Query faces table for each faceId → get photoKeys
    → Generate presigned URLs for each photo
    """
    timestamp = utc_now()

    with faces_table.batch_writer() as batch:
        for face_id in face_ids:
            batch.put_item(Item={
                "faceId": face_id,
                "photoKey": photo_key,
                "guestId": guest_id,
                "uploadedAt": timestamp,
            })


def store_photo_metadata(photo_key: str, guest_id: str, face_ids: list):
    """Store metadata about the uploaded photo."""
    photos_table.put_item(Item={
        "photoKey": photo_key,
        "uploadedBy": guest_id,
        "uploadedAt": utc_now(),
        "faces": face_ids,
        "faceCount": len(face_ids),
        "isCouple": False,  # Will be updated by couple_detector Lambda
    })


# ─────────────────────────────────────────────────────────────────
# REGISTER COUPLE HANDLER
# ─────────────────────────────────────────────────────────────────

def handle_register_couple(event: dict) -> dict:
    """
    Admin endpoint: register a couple member's face.

    This indexes the couple's face and stores the faceId in
    DynamoDB couple_faces table. The couple_detector Lambda
    will then check against this table for every new photo.

    Expected body:
    {
        "image": "<base64 image of one couple member>",
        "contentType": "image/jpeg",
        "personName": "Sarah"
    }

    Must be called by a user in the 'admins' Cognito group.
    """
    # TODO: In production, verify the user is in the 'admins' Cognito group
    # by checking event.requestContext.authorizer.jwt.claims["cognito:groups"]

    try:
        body = parse_body(event)
    except ValueError as e:
        return error_response(400, f"Invalid request body: {str(e)}")

    image_b64 = body.get("image")
    content_type = body.get("contentType", "image/jpeg").lower()
    person_name = body.get("personName", "Unknown")

    if not image_b64:
        return error_response(400, "Missing 'image' field")

    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        return error_response(400, "Invalid base64 image data")

    # Index the couple member's face
    face_ids = index_faces(f"couple/{person_name}", image_bytes)

    if not face_ids:
        return error_response(422, "No face detected in the image. Please use a clear, front-facing photo.")

    # Store in couple_faces table (used by couple_detector Lambda)
    couple_faces_table = dynamodb.Table(
        os.environ.get("COUPLE_FACES_TABLE", f"couple-faces")
    )

    for face_id in face_ids:
        couple_faces_table.put_item(Item={
            "faceId": face_id,
            "personName": person_name,
            "registeredAt": utc_now(),
        })

    logger.info(f"Registered couple face for {person_name}: {face_ids}")

    return success_response({
        "message": f"Successfully registered face for {person_name}",
        "faceId": face_ids[0],
        "personName": person_name,
    })


# ─────────────────────────────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────────────────────────────

def extract_guest_id(event: dict) -> Optional[str]:
    """
    Extract the guest's identifier from the JWT token claims.
    Cognito puts user info in: event.requestContext.authorizer.jwt.claims
    We use the 'sub' claim (a unique UUID per user) as guest ID.
    """
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        return claims.get("sub")  # 'sub' = subject = unique user ID
    except (KeyError, TypeError):
        return None


def parse_body(event: dict) -> dict:
    """Parse the Lambda event body (JSON string or dict)."""
    body = event.get("body", "{}")
    if not body:
        return {}
    if isinstance(body, dict):
        return body
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")
    try:
        return json.loads(body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Body is not valid JSON: {e}")


def utc_now() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def success_response(data: dict, status_code: int = 200) -> dict:
    """Format a successful API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # CloudFront handles CORS in production
        },
        "body": json.dumps(data),
    }


def error_response(status_code: int, message: str) -> dict:
    """Format an error API Gateway response."""
    logger.warning(f"Returning {status_code}: {message}")
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({"error": message}),
    }
