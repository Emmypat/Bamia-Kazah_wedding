"""
tickets_handler — Lambda for attendance ticket management.

Routes:
  POST   /tickets           — Guest creates a ticket (auth required)
  GET    /tickets           — Admin lists all tickets (admin only)
  PUT    /tickets/{id}      — Admin approves/rejects a ticket (admin only)
  GET    /tickets/{id}      — Guest views their ticket (auth required)
"""

import json
import boto3
import base64
import os
import random
import string
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

TICKETS_TABLE = os.environ['TICKETS_TABLE']
PHOTOS_BUCKET = os.environ['PHOTOS_BUCKET']


# ── Helpers ────────────────────────────────────────────────────

def cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    }


def respond(status_code, body):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(body, default=str),
    }


def get_user_claims(event):
    claims = (
        event.get('requestContext', {})
             .get('authorizer', {})
             .get('jwt', {})
             .get('claims', {})
    )
    user_id = claims.get('sub', '')
    groups_raw = claims.get('cognito:groups', '')
    if isinstance(groups_raw, list):
        groups = groups_raw
    else:
        groups = [g.strip() for g in str(groups_raw).strip('[]').split(',') if g.strip()]
    is_admin = 'admins' in groups
    return user_id, is_admin


def generate_ticket_id(table):
    """Generate a unique WED-XXXX ticket ID."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(10):
        candidate = 'WED-' + ''.join(random.choices(chars, k=4))
        resp = table.get_item(Key={'ticketId': candidate})
        if 'Item' not in resp:
            return candidate
    raise RuntimeError('Failed to generate unique ticket ID after 10 attempts')


# ── Route handlers ──────────────────────────────────────────────

def create_ticket(event):
    """POST /tickets — guest submits name, phone, and selfie."""
    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    guest_name = (body.get('guestName') or '').strip()
    phone = (body.get('phone') or '').strip()
    selfie_b64 = body.get('selfieImage') or ''
    content_type = body.get('contentType') or 'image/jpeg'

    if not guest_name:
        return respond(400, {'error': 'guestName is required'})
    if not selfie_b64:
        return respond(400, {'error': 'selfieImage is required'})

    user_id, _ = get_user_claims(event)

    table = dynamodb.Table(TICKETS_TABLE)
    ticket_id = generate_ticket_id(table)

    # Decode and upload selfie
    if ',' in selfie_b64:
        selfie_b64 = selfie_b64.split(',', 1)[1]
    try:
        selfie_bytes = base64.b64decode(selfie_b64)
    except Exception:
        return respond(400, {'error': 'Invalid base64 selfie image'})

    ext = content_type.split('/')[-1].split(';')[0].strip()
    if ext == 'jpeg':
        ext = 'jpg'
    selfie_key = f'ticket-selfies/{ticket_id}.{ext}'

    s3.put_object(
        Bucket=PHOTOS_BUCKET,
        Key=selfie_key,
        Body=selfie_bytes,
        ContentType=content_type,
    )

    now = datetime.utcnow().isoformat() + 'Z'
    item = {
        'ticketId': ticket_id,
        'guestName': guest_name,
        'phone': phone,
        'selfieKey': selfie_key,
        'status': 'pending',
        'createdAt': now,
        'userId': user_id,
    }
    table.put_item(Item=item)

    return respond(200, {
        'ticketId': ticket_id,
        'guestName': guest_name,
        'status': 'pending',
        'createdAt': now,
    })


def list_tickets(event):
    """GET /tickets — admin lists all tickets with selfie presigned URLs."""
    _, is_admin = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table = dynamodb.Table(TICKETS_TABLE)
    # Paginate if needed (wedding has finite guests — single scan is fine)
    resp = table.scan()
    tickets = resp.get('Items', [])

    # Attach presigned selfie URLs
    for ticket in tickets:
        if ticket.get('selfieKey'):
            try:
                ticket['selfieUrl'] = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': PHOTOS_BUCKET, 'Key': ticket['selfieKey']},
                    ExpiresIn=3600,
                )
            except Exception:
                ticket['selfieUrl'] = None

    tickets.sort(key=lambda t: t.get('createdAt', ''), reverse=True)
    return respond(200, {'tickets': tickets, 'count': len(tickets)})


def update_ticket(event, ticket_id):
    """PUT /tickets/{id} — admin approves or rejects a ticket."""
    _, is_admin = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    status = (body.get('status') or '').strip()
    if status not in ('approved', 'rejected'):
        return respond(400, {'error': "status must be 'approved' or 'rejected'"})

    table = dynamodb.Table(TICKETS_TABLE)

    # Check ticket exists
    existing = table.get_item(Key={'ticketId': ticket_id})
    if 'Item' not in existing:
        return respond(404, {'error': 'Ticket not found'})

    now = datetime.utcnow().isoformat() + 'Z'
    table.update_item(
        Key={'ticketId': ticket_id},
        UpdateExpression='SET #s = :s, verifiedAt = :v',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':s': status, ':v': now},
    )

    return respond(200, {'ticketId': ticket_id, 'status': status, 'verifiedAt': now})


def get_ticket(event, ticket_id):
    """GET /tickets/{id} — guest or admin views a single ticket."""
    user_id, is_admin = get_user_claims(event)

    table = dynamodb.Table(TICKETS_TABLE)
    resp = table.get_item(Key={'ticketId': ticket_id})
    ticket = resp.get('Item')

    if not ticket:
        return respond(404, {'error': 'Ticket not found'})

    # Guests can only view their own tickets
    if not is_admin and ticket.get('userId') != user_id:
        return respond(403, {'error': 'You can only view your own ticket'})

    # Strip internal fields for public response
    ticket.pop('selfieKey', None)
    ticket.pop('userId', None)

    return respond(200, ticket)


# ── Lambda entry point ──────────────────────────────────────────

def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET').upper()
    raw_path = event.get('rawPath', '')

    # OPTIONS preflight
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    # Route: /tickets
    if raw_path == '/tickets':
        if method == 'POST':
            return create_ticket(event)
        if method == 'GET':
            return list_tickets(event)
        return respond(405, {'error': 'Method not allowed'})

    # Route: /tickets/{id}
    if raw_path.startswith('/tickets/'):
        ticket_id = raw_path[len('/tickets/'):]
        if not ticket_id:
            return respond(400, {'error': 'Ticket ID required'})
        if method == 'PUT':
            return update_ticket(event, ticket_id)
        if method == 'GET':
            return get_ticket(event, ticket_id)
        return respond(405, {'error': 'Method not allowed'})

    return respond(404, {'error': 'Not found'})
