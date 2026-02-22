"""
Couple Detector Lambda
=======================
Triggered by: S3 ObjectCreated event (new photo uploaded)

This function runs asynchronously after a photo is uploaded.
The guest's upload response comes back immediately — this runs
in the background without making them wait.

Process:
1. Extract the S3 object key from the event
2. Load all registered couple face IDs from DynamoDB
3. Search the photo for any of the couple's faces using Rekognition
4. If couple faces are found:
   a. Update the photo record in DynamoDB: isCouple = True
   b. Publish a message to SNS to trigger email notifications
5. Log all detection results for debugging

Environment variables:
- COUPLE_FACES_TABLE: DynamoDB table with couple face IDs
- PHOTOS_TABLE: DynamoDB table for photo metadata
- REKOGNITION_COLLECTION_ID: Rekognition collection
- REKOGNITION_MIN_CONFIDENCE: Minimum confidence for matches
- SNS_TOPIC_ARN: SNS topic to publish couple photo alerts
"""

import json
import os
import logging
import urllib.parse

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
rekognition = boto3.client("rekognition")
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")
s3 = boto3.client("s3")

# Environment
COUPLE_FACES_TABLE = os.environ["COUPLE_FACES_TABLE"]
PHOTOS_TABLE = os.environ["PHOTOS_TABLE"]
REKOGNITION_COLLECTION_ID = os.environ["REKOGNITION_COLLECTION_ID"]
REKOGNITION_MIN_CONFIDENCE = float(os.environ.get("REKOGNITION_MIN_CONFIDENCE", "90"))
SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]

# DynamoDB tables
couple_faces_table = dynamodb.Table(COUPLE_FACES_TABLE)
photos_table = dynamodb.Table(PHOTOS_TABLE)


def lambda_handler(event: dict, context) -> dict:
    """
    Process S3 event: check if newly uploaded photo contains the couple.

    S3 event structure:
    {
        "Records": [
            {
                "s3": {
                    "bucket": { "name": "wedding-photos-prod-abc123" },
                    "object": { "key": "uploads/2025/06/15/uuid.jpg" }
                }
            }
        ]
    }
    """
    records = event.get("Records", [])
    results = []

    for record in records:
        try:
            bucket = record["s3"]["bucket"]["name"]
            # S3 URL-encodes the key (e.g. spaces become +)
            key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
            logger.info(f"Processing new photo: s3://{bucket}/{key}")

            result = process_photo(bucket, key)
            results.append(result)

        except Exception as e:
            logger.error(f"Error processing record: {e}", exc_info=True)
            results.append({"error": str(e)})

    return {"processedCount": len(results), "results": results}


def process_photo(bucket: str, photo_key: str) -> dict:
    """
    Check if the couple appears in a photo and trigger notifications.

    Returns a dict with detection results.
    """
    # Step 1: Get all registered couple face IDs from DynamoDB
    couple_face_ids = get_couple_face_ids()

    if not couple_face_ids:
        logger.info("No couple faces registered yet — skipping detection")
        return {"photoKey": photo_key, "coupleDetected": False, "reason": "No couple faces registered"}

    # Step 2: Search the photo for matching faces in Rekognition
    # We search the entire collection and then filter for couple faces
    try:
        response = rekognition.search_faces_by_image(
            CollectionId=REKOGNITION_COLLECTION_ID,
            Image={
                "S3Object": {
                    "Bucket": bucket,
                    "Name": photo_key,
                }
            },
            MaxFaces=50,
            FaceMatchThreshold=REKOGNITION_MIN_CONFIDENCE,
        )
        matched_face_ids = {m["Face"]["FaceId"] for m in response.get("FaceMatches", [])}
        logger.info(f"Rekognition matched {len(matched_face_ids)} faces in photo")

    except rekognition.exceptions.InvalidParameterException:
        # No face detected in this photo (could be a landscape shot)
        logger.info(f"No faces detected in {photo_key}")
        return {"photoKey": photo_key, "coupleDetected": False, "reason": "No faces in photo"}
    except ClientError as e:
        logger.error(f"Rekognition error for {photo_key}: {e}")
        return {"photoKey": photo_key, "coupleDetected": False, "error": str(e)}

    # Step 3: Check if any of the matched faces are couple faces
    couple_matches = set(couple_face_ids) & matched_face_ids
    couple_detected = len(couple_matches) > 0

    logger.info(f"Couple detected in {photo_key}: {couple_detected} (matched: {couple_matches})")

    if couple_detected:
        # Step 4a: Update photo metadata to mark as couple photo
        update_photo_as_couple(photo_key)

        # Step 4b: Publish to SNS to trigger email notifications
        publish_couple_alert(photo_key, list(couple_matches))

    return {
        "photoKey": photo_key,
        "coupleDetected": couple_detected,
        "matchedFaceIds": list(couple_matches),
    }


def get_couple_face_ids() -> list[str]:
    """
    Fetch all registered couple face IDs from DynamoDB.

    We scan the table since it's tiny (2-4 faces max).
    In production with a larger table, we'd use a Query with an index.
    """
    try:
        response = couple_faces_table.scan(
            ProjectionExpression="faceId"
        )
        return [item["faceId"] for item in response.get("Items", [])]
    except ClientError as e:
        logger.error(f"Failed to get couple faces: {e}")
        return []


def update_photo_as_couple(photo_key: str):
    """Mark a photo as containing the couple in DynamoDB."""
    try:
        photos_table.update_item(
            Key={"photoKey": photo_key},
            UpdateExpression="SET isCouple = :true",
            ExpressionAttributeValues={":true": True},
        )
        logger.info(f"Marked {photo_key} as couple photo")
    except ClientError as e:
        logger.error(f"Failed to update photo record: {e}")


def publish_couple_alert(photo_key: str, matched_face_ids: list[str]):
    """
    Publish a message to SNS to trigger guest email notifications.

    The SNS message is consumed by the email_notifier Lambda.
    Using SNS here means:
    - Multiple subscribers can be added later (SMS, push notifications, etc.)
    - Email sending failures don't affect this function
    - Retries are handled by SNS/Lambda automatically
    """
    message = {
        "photoKey": photo_key,
        "matchedFaceIds": matched_face_ids,
        "detectedAt": _utc_now(),
    }

    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="Couple Photo Detected",
            Message=json.dumps(message),
        )
        logger.info(f"Published couple alert to SNS for photo: {photo_key}")
    except ClientError as e:
        logger.error(f"Failed to publish to SNS: {e}")


def _utc_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
