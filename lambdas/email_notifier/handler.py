"""
Email Notifier Lambda
======================
Triggered by: SNS topic (when couple is detected in a photo)

Sends a beautiful HTML email to ALL registered guests with:
- A link to view the couple photo
- A download button
- Wedding branding

Process:
1. Parse the SNS message to get the photo key
2. Generate a presigned S3 URL for the photo
3. Scan DynamoDB for all registered guest emails
4. Send HTML email via SES to each guest
5. Handle rate limiting (SES default: 14 emails/sec, max 200/day in sandbox)

SES Sandbox Note:
- Default: can only send to verified email addresses
- Submit production access request to send to anyone:
  AWS Console → SES → Account dashboard → Request production access

Environment variables:
- GUESTS_TABLE: DynamoDB guests table
- PHOTOS_BUCKET: S3 bucket for presigned URL generation
- FROM_EMAIL: Verified SES sender email
- COUPLE_NAME: "Sarah & James" (for email content)
- WEDDING_DATE: "June 15, 2025" (for email content)
- PHOTO_URL_EXPIRY_HOURS: How long presigned URLs last
"""

import json
import os
import time
import logging
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses")

# Environment
GUESTS_TABLE = os.environ["GUESTS_TABLE"]
PHOTOS_BUCKET = os.environ["PHOTOS_BUCKET"]
FROM_EMAIL = os.environ["FROM_EMAIL"]
COUPLE_NAME = os.environ.get("COUPLE_NAME", "The Happy Couple")
WEDDING_DATE = os.environ.get("WEDDING_DATE", "")
PHOTO_URL_EXPIRY_HOURS = int(os.environ.get("PHOTO_URL_EXPIRY_HOURS", "48"))

guests_table = dynamodb.Table(GUESTS_TABLE)

# SES rate limiting: send at most N emails per second to avoid throttling
SES_SEND_RATE = 10  # emails per second (safe default, increase after production access)


def lambda_handler(event: dict, context) -> dict:
    """
    Process SNS event containing couple photo detection alert.

    SNS wraps the message in:
    {
        "Records": [{
            "Sns": {
                "Message": "{\"photoKey\": \"...\", ...}",
                "Subject": "Couple Photo Detected"
            }
        }]
    }
    """
    results = {"sent": 0, "failed": 0, "skipped": 0}

    for record in event.get("Records", []):
        try:
            # Parse SNS message
            sns_message = json.loads(record["Sns"]["Message"])
            photo_key = sns_message["photoKey"]
            logger.info(f"Processing couple photo notification for: {photo_key}")

            # Generate presigned URL (valid for PHOTO_URL_EXPIRY_HOURS)
            photo_url = generate_presigned_url(photo_key)
            if not photo_url:
                logger.error(f"Could not generate URL for {photo_key}")
                continue

            # Get all registered guests
            guests = get_all_guests()
            logger.info(f"Sending notification to {len(guests)} guests")

            # Send email to each guest with rate limiting
            batch_results = send_emails_to_guests(guests, photo_key, photo_url)
            results["sent"] += batch_results["sent"]
            results["failed"] += batch_results["failed"]

        except Exception as e:
            logger.error(f"Error processing SNS record: {e}", exc_info=True)

    logger.info(f"Email notification results: {results}")
    return results


def generate_presigned_url(photo_key: str) -> str:
    """Generate a time-limited presigned URL to view the photo."""
    try:
        expiry_seconds = PHOTO_URL_EXPIRY_HOURS * 3600
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": PHOTOS_BUCKET, "Key": photo_key},
            ExpiresIn=expiry_seconds,
        )
        logger.info(f"Generated presigned URL, expires in {PHOTO_URL_EXPIRY_HOURS}h")
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return None


def get_all_guests() -> list[dict]:
    """
    Scan the guests DynamoDB table to get all registered guest emails.

    We use scan because we want ALL guests.
    For very large tables (>1MB), we'd handle pagination.
    """
    try:
        items = []
        response = guests_table.scan(
            ProjectionExpression="email, #n",
            ExpressionAttributeNames={"#n": "name"}  # 'name' is a reserved word in DynamoDB
        )
        items.extend(response.get("Items", []))

        # Handle DynamoDB pagination (if table > 1MB, scan returns paginated results)
        while "LastEvaluatedKey" in response:
            response = guests_table.scan(
                ProjectionExpression="email, #n",
                ExpressionAttributeNames={"#n": "name"},
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            items.extend(response.get("Items", []))

        return items
    except ClientError as e:
        logger.error(f"Failed to scan guests table: {e}")
        return []


def send_emails_to_guests(guests: list[dict], photo_key: str, photo_url: str) -> dict:
    """
    Send notification emails to all guests with rate limiting.

    SES has a sending rate limit (default ~14 emails/sec for sandbox).
    We batch sends and add small delays to stay within limits.
    """
    sent = 0
    failed = 0
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=PHOTO_URL_EXPIRY_HOURS)).strftime(
        "%B %d, %Y at %I:%M %p UTC"
    )

    for i, guest in enumerate(guests):
        email = guest.get("email")
        name = guest.get("name", "Guest")

        if not email:
            continue

        try:
            html_body = build_email_html(name, photo_url, expires_at)
            text_body = build_email_text(name, photo_url, expires_at)

            ses.send_email(
                Source=f"{COUPLE_NAME}'s Wedding <{FROM_EMAIL}>",
                Destination={"ToAddresses": [email]},
                Message={
                    "Subject": {
                        "Data": f"📸 {COUPLE_NAME} appear in a new wedding photo!",
                        "Charset": "UTF-8",
                    },
                    "Body": {
                        "Html": {"Data": html_body, "Charset": "UTF-8"},
                        "Text": {"Data": text_body, "Charset": "UTF-8"},
                    },
                },
            )
            sent += 1
            logger.info(f"Email sent to {email}")

        except ses.exceptions.MessageRejected as e:
            logger.warning(f"Email rejected for {email}: {e}")
            failed += 1
        except ClientError as e:
            logger.error(f"Failed to send email to {email}: {e}")
            failed += 1

        # Rate limiting: after every N emails, pause briefly
        if (i + 1) % SES_SEND_RATE == 0:
            time.sleep(1)  # 1 second pause every SES_SEND_RATE emails

    return {"sent": sent, "failed": failed}


def build_email_html(guest_name: str, photo_url: str, expires_at: str) -> str:
    """
    Build a beautiful HTML email for the couple photo notification.
    Uses inline CSS for maximum email client compatibility.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wedding Photo Notification</title>
</head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background-color:#f9f7f4;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f7f4;padding:40px 20px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);
                      overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#d4a7a7 0%,#c49a9a 100%);
                       padding:40px 40px 30px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">💒</div>
              <h1 style="margin:0;font-size:26px;color:#ffffff;
                         font-weight:400;letter-spacing:2px;
                         text-transform:uppercase;">
                {COUPLE_NAME}
              </h1>
              {"<p style='margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);'>" + WEDDING_DATE + "</p>" if WEDDING_DATE else ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:18px;color:#4a4a4a;">
                Dear {guest_name},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#666666;line-height:1.7;">
                A new photo featuring <strong>{COUPLE_NAME}</strong> has just been
                captured at the wedding! 🎉 Click the button below to view and
                download it before the link expires.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="{photo_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#d4a7a7,#c49a9a);
                              color:#ffffff;text-decoration:none;padding:16px 40px;
                              border-radius:50px;font-size:16px;font-weight:600;
                              letter-spacing:0.5px;">
                      📸 View Photo
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <div style="background:#fdf5f5;border-radius:8px;padding:16px;
                          border-left:4px solid #d4a7a7;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#888888;">
                  ⏰ This link expires on <strong>{expires_at}</strong>.
                  Download your photo before then!
                </p>
              </div>

              <p style="margin:0;font-size:14px;color:#999999;line-height:1.6;">
                You can also visit the wedding photo platform to search for
                all photos you appear in using your selfie.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f7f4;padding:24px 40px;text-align:center;
                       border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#bbbbbb;">
                With love, {COUPLE_NAME} 💕<br>
                You received this because you registered for the wedding photo platform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def build_email_text(guest_name: str, photo_url: str, expires_at: str) -> str:
    """Plain text fallback for email clients that don't support HTML."""
    return f"""Dear {guest_name},

A new photo featuring {COUPLE_NAME} has been captured at the wedding!

View and download the photo here:
{photo_url}

This link expires on {expires_at}.

With love,
{COUPLE_NAME} 💕

---
You received this because you registered for the wedding photo platform.
"""
