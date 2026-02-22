"""
Search Handler Lambda
======================
Triggered by: API Gateway POST /search

Allows a guest to find all photos they appear in by uploading a selfie.

Privacy-first design:
- The selfie is NOT stored or indexed in Rekognition
- We use SearchFacesByImage (which searches without storing)
- Only the matched photo URLs are returned
- The selfie bytes exist only in memory during this invocation

Process:
1. Receive base64-encoded selfie
2. Call Rekognition SearchFacesByImage (finds matching indexed faces)
3. For each matched faceId, query DynamoDB for the photo key
4. Generate presigned S3 URLs for each matched photo (time-limited)
5. Return list of URLs to the frontend

Environment variables:
- PHOTOS_BUCKET: S3 bucket with photos
- FACES_TABLE: DynamoDB faces table
- REKOGNITION_COLLECTION_ID: Rekognition collection to search
- REKOGNITION_MIN_CONFIDENCE: Minimum match confidence
- PHOTO_URL_EXPIRY_HOURS: URL validity in hours
"""

import json
import base64
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients (reused across warm invocations)
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
rekognition = boto3.client("rekognition")

# Environment
PHOTOS_BUCKET = os.environ["PHOTOS_BUCKET"]
FACES_TABLE = os.environ["FACES_TABLE"]
REKOGNITION_COLLECTION_ID = os.environ["REKOGNITION_COLLECTION_ID"]
REKOGNITION_MIN_CONFIDENCE = float(os.environ.get("REKOGNITION_MIN_CONFIDENCE", "90"))
PHOTO_URL_EXPIRY_HOURS = int(os.environ.get("PHOTO_URL_EXPIRY_HOURS", "48"))

faces_table = dynamodb.Table(FACES_TABLE)


def lambda_handler(event: dict, context) -> dict:
    """Entry point for search requests."""
    route_key = event.get("routeKey", "")
    logger.info(f"Search handler called: {route_key}")

    if route_key == "POST /search":
        return handle_search(event)
    elif route_key == "GET /photos":
        return handle_list_photos(event)
    else:
        return error_response(404, "Route not found")


def handle_search(event: dict) -> dict:
    """
    Main search flow: selfie → matching photos.

    Expected request body:
    {
        "image": "<base64 selfie>",
        "contentType": "image/jpeg"
    }

    Returns:
    {
        "photos": [
            {
                "photoKey": "uploads/2025/06/15/abc123.jpg",
                "url": "https://s3.amazonaws.com/...",
                "expiresAt": "2025-06-17T12:00:00Z"
            }
        ],
        "matchCount": 5,
        "searchedAt": "2025-06-15T14:30:00Z"
    }
    """
    # Parse request
    try:
        body = parse_body(event)
    except ValueError as e:
        return error_response(400, str(e))

    image_b64 = body.get("image")
    if not image_b64:
        return error_response(400, "Missing 'image' field")

    # Decode selfie
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        return error_response(400, "Invalid base64 image data")

    # Search Rekognition for matching faces
    # SearchFacesByImage: searches the collection for faces matching the input image
    # WITHOUT indexing the selfie — it's never stored.
    matched_face_ids = search_faces(image_bytes)
    logger.info(f"Found {len(matched_face_ids)} matching face IDs")

    if not matched_face_ids:
        return success_response({
            "photos": [],
            "matchCount": 0,
            "message": "No matching photos found. Try a clearer selfie or check if you've been captured in any photos yet.",
            "searchedAt": utc_now(),
        })

    # Look up photos for each matched faceId
    photo_keys = get_photos_for_faces(matched_face_ids)
    logger.info(f"Found {len(photo_keys)} photos containing matched faces")

    # Generate presigned URLs for each photo
    # Presigned URLs are time-limited, signed S3 URLs that allow
    # anyone to download the specific object — no AWS credentials needed.
    expiry_seconds = PHOTO_URL_EXPIRY_HOURS * 3600
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=PHOTO_URL_EXPIRY_HOURS)).isoformat()

    photos = []
    for photo_key in photo_keys:
        try:
            url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": PHOTOS_BUCKET, "Key": photo_key},
                ExpiresIn=expiry_seconds,
            )
            photos.append({
                "photoKey": photo_key,
                "url": url,
                "expiresAt": expires_at,
            })
        except ClientError as e:
            logger.warning(f"Failed to generate presigned URL for {photo_key}: {e}")

    return success_response({
        "photos": photos,
        "matchCount": len(photos),
        "searchedAt": utc_now(),
    })


def search_faces(image_bytes: bytes) -> list[str]:
    """
    Search the Rekognition collection for faces matching the selfie.

    SearchFacesByImage:
    - Detects the largest face in the input image
    - Searches the collection for similar faces
    - Returns matches with similarity scores

    We filter by MinFaceMatchThreshold to avoid false positives.
    """
    try:
        response = rekognition.search_faces_by_image(
            CollectionId=REKOGNITION_COLLECTION_ID,
            Image={"Bytes": image_bytes},
            MaxFaces=100,  # Max faces to return — should be enough for any wedding
            FaceMatchThreshold=REKOGNITION_MIN_CONFIDENCE,
        )
        # Extract faceIds from the matched faces
        matches = response.get("FaceMatches", [])
        logger.info(f"Rekognition returned {len(matches)} face matches")
        for match in matches:
            logger.debug(f"  FaceId: {match['Face']['FaceId']}, Similarity: {match['Similarity']:.1f}%")

        return [m["Face"]["FaceId"] for m in matches]

    except rekognition.exceptions.InvalidParameterException:
        # No face found in the selfie
        logger.warning("No face detected in selfie")
        return []
    except ClientError as e:
        logger.error(f"Rekognition search failed: {e}")
        return []


def get_photos_for_faces(face_ids: list[str]) -> list[str]:
    """
    Query DynamoDB to find all photos containing the given faceIds.

    We do batch GetItem calls since DynamoDB doesn't support
    "WHERE faceId IN (...)" syntax directly. For large result sets,
    we'd use a GSI scan instead.
    """
    photo_keys = set()  # Use set to deduplicate (same photo, multiple faces)

    # DynamoDB batch_get_item supports up to 100 items per call
    batch_size = 100
    for i in range(0, len(face_ids), batch_size):
        batch = face_ids[i:i + batch_size]
        try:
            response = dynamodb.batch_get_item(
                RequestItems={
                    faces_table.name: {
                        "Keys": [{"faceId": fid} for fid in batch],
                        "ProjectionExpression": "photoKey",
                    }
                }
            )
            items = response.get("Responses", {}).get(faces_table.name, [])
            for item in items:
                if "photoKey" in item:
                    photo_keys.add(item["photoKey"])
        except ClientError as e:
            logger.error(f"DynamoDB batch_get failed: {e}")

    return list(photo_keys)


def handle_list_photos(event: dict) -> dict:
    """
    GET /photos — List all photos uploaded by the authenticated guest.
    Returns presigned URLs for the guest's own uploads.
    """
    guest_id = extract_guest_id(event)
    if not guest_id:
        return error_response(401, "Unauthorized")

    photos_table = dynamodb.Table(os.environ.get("PHOTOS_TABLE", "photos"))

    try:
        # Use the uploadedBy-index GSI to find photos by this guest
        response = photos_table.query(
            IndexName="uploadedBy-index",
            KeyConditionExpression=Key("uploadedBy").eq(guest_id),
        )
        items = response.get("Items", [])
    except ClientError as e:
        logger.error(f"DynamoDB query failed: {e}")
        return error_response(500, "Failed to retrieve photos")

    # Generate presigned URLs
    expiry_seconds = PHOTO_URL_EXPIRY_HOURS * 3600
    photos = []
    for item in items:
        try:
            url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": PHOTOS_BUCKET, "Key": item["photoKey"]},
                ExpiresIn=expiry_seconds,
            )
            photos.append({
                "photoKey": item["photoKey"],
                "url": url,
                "uploadedAt": item.get("uploadedAt"),
                "faceCount": item.get("faceCount", 0),
                "isCouple": item.get("isCouple", False),
            })
        except ClientError:
            pass

    return success_response({"photos": photos, "count": len(photos)})


# ─────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────

def extract_guest_id(event: dict):
    try:
        return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        return None


def parse_body(event: dict) -> dict:
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
        raise ValueError(f"Invalid JSON: {e}")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def success_response(data: dict, status_code: int = 200) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(data),
    }


def error_response(status_code: int, message: str) -> dict:
    logger.warning(f"Error {status_code}: {message}")
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"error": message}),
    }
