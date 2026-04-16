"""
tickets_handler — Lambda for attendance ticket management.

Routes:
  POST   /tickets                   — Guest creates a ticket (auth required)
  GET    /tickets                   — Admin lists all tickets (admin only)
  PUT    /tickets/{id}              — Admin approves/rejects/revokes/checkin (admin only)
  GET    /tickets/{id}              — Guest views their ticket (auth required)
  DELETE /tickets/{id}              — Admin deletes a rejected ticket (admin only)
  GET    /tickets/{id}/view         — Public view of a ticket (no auth)
  GET    /my-ticket                 — Public phone lookup of own ticket (no auth)
  GET    /tickets/preapproved       — Admin lists pre-approved phones (admin only)
  POST   /tickets/preapprove        — Admin adds pre-approved phone(s) (admin only)
  DELETE /tickets/preapprove/{id}   — Admin removes a pre-approved record (admin only)
  GET    /tickets/export            — Admin exports tickets as CSV (admin only)
  POST   /tickets/issue             — Admin or Coordinator issues a ticket directly
  PUT    /tickets/default-image     — Admin sets the default ticket image (admin only)
  POST   /coordinators              — Admin creates a Coordinator account (admin only)
  GET    /coordinators              — Admin lists all Coordinators (admin only)
  GET    /coordinators/me           — Coordinator fetches their own quota (coordinator)
  PUT    /coordinators/{id}/quota   — Admin updates a Coordinator's quota (admin only)
"""

import json
import boto3
import base64
import os
import re
import uuid
import random
import string
import io
import csv
from datetime import datetime

s3        = boto3.client('s3')
cognito   = boto3.client('cognito-idp')
ses       = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'eu-west-1'))
dynamodb  = boto3.resource('dynamodb')

TICKETS_TABLE        = os.environ['TICKETS_TABLE']
PHOTOS_BUCKET        = os.environ['PHOTOS_BUCKET']
PREAPPROVED_TABLE    = os.environ.get('PREAPPROVED_TABLE', '')
COORDINATOR_TABLE    = os.environ.get('COORDINATOR_TABLE', '')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', '')
FROM_EMAIL           = os.environ.get('FROM_EMAIL', '')

DEFAULT_IMAGE_KEY = 'tickets/default-wedding-image.jpg'


# ── Helpers ────────────────────────────────────────────────────

def cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    }


def respond(status_code, body):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(body, default=str),
    }


def respond_csv(filename, csv_content):
    return {
        'statusCode': 200,
        'headers': {
            **cors_headers(),
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename="{filename}"',
        },
        'body': csv_content,
        'isBase64Encoded': False,
    }


def get_user_claims(event):
    claims = (
        event.get('requestContext', {})
             .get('authorizer', {})
             .get('jwt', {})
             .get('claims', {})
    )
    user_id  = claims.get('sub', '')
    username = claims.get('username', '') or claims.get('email', '')
    groups_raw = claims.get('cognito:groups', '')
    if isinstance(groups_raw, list):
        groups = groups_raw
    else:
        groups = [g.strip() for g in str(groups_raw).strip('[]').split(',') if g.strip()]
    is_admin       = 'admins' in groups or 'superadmins' in groups
    is_coordinator = 'coordinators' in groups
    return user_id, is_admin, is_coordinator


def get_issuer_email(event):
    """Extract issuer's email/username from JWT claims."""
    claims = (event.get('requestContext', {})
                   .get('authorizer', {})
                   .get('jwt', {})
                   .get('claims', {}))
    return claims.get('username', '') or claims.get('email', '')


def normalize_phone(phone):
    """Canonicalize Nigerian phone number to digits only (e.g. 2348012345678)."""
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('0') and len(digits) == 11:
        digits = '234' + digits[1:]
    return digits


def generate_ticket_id(table):
    """Generate a unique WED-XXXX ticket ID."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(10):
        candidate = 'WED-' + ''.join(random.choices(chars, k=4))
        resp = table.get_item(Key={'ticketId': candidate})
        if 'Item' not in resp:
            return candidate
    raise RuntimeError('Failed to generate unique ticket ID after 10 attempts')


def attach_selfie_url(ticket):
    """Pop selfieKey, generate a presigned URL, add selfieUrl. Mutates ticket dict."""
    selfie_key = ticket.pop('selfieKey', None)
    if selfie_key:
        try:
            ticket['selfieUrl'] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': PHOTOS_BUCKET, 'Key': selfie_key},
                ExpiresIn=3600,
            )
        except Exception:
            ticket['selfieUrl'] = None
    else:
        ticket['selfieUrl'] = None


def find_ticket_by_phone(phone_normalized):
    """Scan tickets table for normalized phone. Returns most recent ticket dict or None."""
    from boto3.dynamodb.conditions import Attr
    table = dynamodb.Table(TICKETS_TABLE)
    local_fmt = '0' + phone_normalized[3:] if phone_normalized.startswith('234') and len(phone_normalized) == 13 else phone_normalized
    for candidate in dict.fromkeys([phone_normalized, local_fmt]):
        resp = table.scan(FilterExpression=Attr('phone').eq(candidate))
        items = resp.get('Items', [])
        if items:
            items.sort(key=lambda t: t.get('createdAt', ''), reverse=True)
            return items[0]
    return None


def check_preapproval(phone_normalized):
    """Return an unused preapproved_guests record for this phone, or None."""
    if not PREAPPROVED_TABLE:
        return None
    from boto3.dynamodb.conditions import Attr
    table = dynamodb.Table(PREAPPROVED_TABLE)
    resp = table.scan(
        FilterExpression=Attr('phone').eq(phone_normalized) & Attr('used').eq(False)
    )
    items = resp.get('Items', [])
    if not items:
        return None
    items.sort(key=lambda r: r.get('added_at', ''))
    return items[0]


def mark_preapproval_used(preapproval_id):
    """Mark a preapproved_guests record as used."""
    if not PREAPPROVED_TABLE:
        return
    table = dynamodb.Table(PREAPPROVED_TABLE)
    now = datetime.utcnow().isoformat() + 'Z'
    table.update_item(
        Key={'id': preapproval_id},
        UpdateExpression='SET used = :t, used_at = :now',
        ExpressionAttributeValues={':t': True, ':now': now},
    )


def upload_image_b64(selfie_b64, content_type, key):
    """Decode base64 data (with or without data URI prefix) and upload to S3. Returns key."""
    if ',' in selfie_b64:
        selfie_b64 = selfie_b64.split(',', 1)[1]
    selfie_bytes = base64.b64decode(selfie_b64)
    s3.put_object(
        Bucket=PHOTOS_BUCKET,
        Key=key,
        Body=selfie_bytes,
        ContentType=content_type,
    )
    return key


# ── Quota exhaustion alert ─────────────────────────────────────

def _send_quota_exhausted_alert(coordinator_name, quota):
    """Email all super admins when a coordinator uses their last ticket."""
    if not FROM_EMAIL or not COGNITO_USER_POOL_ID:
        return
    try:
        resp = cognito.list_users_in_group(
            UserPoolId=COGNITO_USER_POOL_ID,
            GroupName='superadmins',
        )
        admin_emails = [
            next((a['Value'] for a in u['Attributes'] if a['Name'] == 'email'), None)
            for u in resp.get('Users', [])
        ]
        admin_emails = [e for e in admin_emails if e]
    except Exception as ex:
        print(f'[WARN] Could not list superadmins for quota alert: {ex}')
        return
    if not admin_emails:
        return
    subject = f'Coordinator quota exhausted — {coordinator_name}'
    text = (
        f'{coordinator_name} has used all {quota} of their ticket quota and can no longer '
        f'issue tickets. Log in to the admin panel to grant them more tickets.'
    )
    try:
        ses.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': admin_emails},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Text': {'Data': text, 'Charset': 'UTF-8'}},
            },
        )
    except Exception as ex:
        print(f'[WARN] Failed to send quota exhausted alert: {ex}')


# ── Route handlers ──────────────────────────────────────────────

def create_ticket(event):
    """POST /tickets — guest submits name, phone, and selfie."""
    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    guest_name = (body.get('guestName') or '').strip()
    phone_raw  = (body.get('phone') or '').strip()
    phone      = normalize_phone(phone_raw)
    selfie_b64 = body.get('selfieImage') or ''
    content_type = body.get('contentType') or 'image/jpeg'

    if not guest_name:
        return respond(400, {'error': 'guestName is required'})
    if not selfie_b64:
        return respond(400, {'error': 'selfieImage is required'})

    # ── Duplicate prevention ─────────────────────────────────
    existing = find_ticket_by_phone(phone)
    if existing:
        # Build a safe summary to return (no internal keys)
        safe = {k: existing[k] for k in ('ticketId', 'guestName', 'phone', 'status', 'createdAt') if k in existing}
        selfie_key = existing.get('selfieKey')
        if selfie_key:
            try:
                safe['selfieUrl'] = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': PHOTOS_BUCKET, 'Key': selfie_key},
                    ExpiresIn=3600,
                )
            except Exception:
                safe['selfieUrl'] = None
        return respond(200, {'existing': True, 'ticket': safe})

    user_id, _, __ = get_user_claims(event)

    table = dynamodb.Table(TICKETS_TABLE)
    ticket_id = generate_ticket_id(table)

    # Upload selfie
    ext = content_type.split('/')[-1].split(';')[0].strip()
    if ext == 'jpeg':
        ext = 'jpg'
    selfie_key = f'ticket-selfies/{ticket_id}.{ext}'
    try:
        upload_image_b64(selfie_b64, content_type, selfie_key)
    except Exception:
        return respond(400, {'error': 'Invalid base64 selfie image'})

    now = datetime.utcnow().isoformat() + 'Z'

    # ── Auto-approval check ──────────────────────────────────
    preapproval = check_preapproval(phone)
    status      = 'approved' if preapproval else 'pending'
    approved_by = 'auto' if preapproval else None
    approved_at = now if preapproval else None

    item = {
        'ticketId':  ticket_id,
        'guestName': guest_name,
        'phone':     phone,
        'selfieKey': selfie_key,
        'status':    status,
        'createdAt': now,
        'userId':    user_id,
    }
    if approved_by:
        item['approved_by'] = approved_by
        item['approved_at'] = approved_at

    table.put_item(Item=item)

    if preapproval:
        mark_preapproval_used(preapproval['id'])

    return respond(200, {
        'ticketId':   ticket_id,
        'guestName':  guest_name,
        'status':     status,
        'createdAt':  now,
        'approved_by': approved_by,
        'approved_at': approved_at,
        'autoApproved': preapproval is not None,
    })


def list_tickets(event):
    """GET /tickets — admin lists all tickets with selfie presigned URLs."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table = dynamodb.Table(TICKETS_TABLE)
    resp = table.scan()
    tickets = resp.get('Items', [])

    for ticket in tickets:
        selfie_key = ticket.get('selfieKey')
        if selfie_key:
            try:
                ticket['selfieUrl'] = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': PHOTOS_BUCKET, 'Key': selfie_key},
                    ExpiresIn=3600,
                )
            except Exception:
                ticket['selfieUrl'] = None

    tickets.sort(key=lambda t: t.get('createdAt', ''), reverse=True)
    return respond(200, {'tickets': tickets, 'count': len(tickets)})


def update_ticket(event, ticket_id):
    """PUT /tickets/{id} — admin approves/rejects/revokes a ticket, or checks in a guest."""
    user_id, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    table = dynamodb.Table(TICKETS_TABLE)
    existing = table.get_item(Key={'ticketId': ticket_id})
    if 'Item' not in existing:
        return respond(404, {'error': 'Ticket not found'})

    now = datetime.utcnow().isoformat() + 'Z'

    # ── Check-in branch ─────────────────────────────────────
    if body.get('checkin') is True:
        ticket = existing['Item']
        if ticket.get('checkedIn'):
            return respond(200, {
                'ticketId': ticket_id,
                'alreadyCheckedIn': True,
                'checkedInAt': ticket.get('checkedInAt', ''),
            })
        table.update_item(
            Key={'ticketId': ticket_id},
            UpdateExpression='SET checkedIn = :t, checkedInAt = :now',
            ExpressionAttributeValues={':t': True, ':now': now},
        )
        return respond(200, {'ticketId': ticket_id, 'checkedIn': True, 'checkedInAt': now})

    # ── Approve / Reject / Revoke branch ────────────────────
    status = (body.get('status') or '').strip()
    if status not in ('approved', 'rejected', 'pending'):
        return respond(400, {'error': "status must be 'approved', 'rejected', or 'pending'"})

    if status == 'approved':
        table.update_item(
            Key={'ticketId': ticket_id},
            UpdateExpression='SET #s = :s, verifiedAt = :v, approved_by = :ab, approved_at = :aa',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'approved',
                ':v': now,
                ':ab': 'admin',
                ':aa': now,
            },
        )
    else:
        table.update_item(
            Key={'ticketId': ticket_id},
            UpdateExpression='SET #s = :s, verifiedAt = :v',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':s': status, ':v': now},
        )

    return respond(200, {'ticketId': ticket_id, 'status': status, 'verifiedAt': now})


def get_ticket(event, ticket_id):
    """GET /tickets/{id} — guest or admin views a single ticket."""
    user_id, is_admin, __ = get_user_claims(event)

    table = dynamodb.Table(TICKETS_TABLE)
    resp = table.get_item(Key={'ticketId': ticket_id})
    ticket = resp.get('Item')

    if not ticket:
        return respond(404, {'error': 'Ticket not found'})

    if not is_admin and ticket.get('userId') != user_id:
        return respond(403, {'error': 'You can only view your own ticket'})

    ticket.pop('userId', None)
    attach_selfie_url(ticket)
    return respond(200, ticket)


def get_ticket_public(ticket_id):
    """GET /tickets/{id}/view — unauthenticated public view of a ticket."""
    table = dynamodb.Table(TICKETS_TABLE)
    resp = table.get_item(Key={'ticketId': ticket_id})
    ticket = resp.get('Item')
    if not ticket:
        return respond(404, {'error': 'Ticket not found'})

    selfie_url = None
    if ticket.get('selfieKey'):
        try:
            selfie_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': PHOTOS_BUCKET, 'Key': ticket['selfieKey']},
                ExpiresIn=3600,
            )
        except Exception:
            pass

    return respond(200, {
        'ticketId':   ticket['ticketId'],
        'guestName':  ticket.get('guestName', ''),
        'status':     ticket.get('status', ''),
        'createdAt':  ticket.get('createdAt', ''),
        'verifiedAt': ticket.get('verifiedAt', ''),
        'approved_by': ticket.get('approved_by', ''),
        'approved_at': ticket.get('approved_at', ''),
        'checkedIn':   ticket.get('checkedIn', False),
        'checkedInAt': ticket.get('checkedInAt', ''),
        'selfieUrl':   selfie_url,
    })


def get_ticket_by_phone(event):
    """GET /my-ticket?phone= — public lookup of a ticket by phone number."""
    params = event.get('queryStringParameters') or {}
    phone_raw = (params.get('phone') or '').strip()
    if not phone_raw:
        return respond(400, {'error': 'phone query parameter is required'})

    normalized = normalize_phone(phone_raw)
    local_fmt = '0' + normalized[3:] if normalized.startswith('234') and len(normalized) == 13 else normalized

    from boto3.dynamodb.conditions import Attr
    table = dynamodb.Table(TICKETS_TABLE)
    items = []
    for candidate in dict.fromkeys([normalized, local_fmt, phone_raw]):
        resp = table.scan(FilterExpression=Attr('phone').eq(candidate))
        items = resp.get('Items', [])
        if items:
            break
    if not items:
        return respond(404, {'error': 'No ticket found for this phone number'})

    items.sort(key=lambda t: t.get('createdAt', ''), reverse=True)
    ticket = items[0]

    selfie_url = None
    if ticket.get('selfieKey'):
        try:
            selfie_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': PHOTOS_BUCKET, 'Key': ticket['selfieKey']},
                ExpiresIn=3600,
            )
        except Exception:
            pass

    return respond(200, {
        'ticketId':    ticket['ticketId'],
        'guestName':   ticket.get('guestName', ''),
        'phone':       ticket.get('phone', ''),
        'status':      ticket.get('status', ''),
        'createdAt':   ticket.get('createdAt', ''),
        'verifiedAt':  ticket.get('verifiedAt', ''),
        'approved_by': ticket.get('approved_by', ''),
        'approved_at': ticket.get('approved_at', ''),
        'checkedIn':   ticket.get('checkedIn', False),
        'checkedInAt': ticket.get('checkedInAt', ''),
        'selfieUrl':   selfie_url,
    })


def delete_ticket(event, ticket_id):
    """DELETE /tickets/{id} — admin only, rejected tickets only."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table = dynamodb.Table(TICKETS_TABLE)
    existing = table.get_item(Key={'ticketId': ticket_id})
    if 'Item' not in existing:
        return respond(404, {'error': 'Ticket not found'})

    ticket = existing['Item']
    if ticket.get('status') != 'rejected':
        return respond(400, {'error': 'Only rejected tickets can be deleted'})

    selfie_key = ticket.get('selfieKey')
    if selfie_key:
        try:
            s3.delete_object(Bucket=PHOTOS_BUCKET, Key=selfie_key)
        except Exception:
            pass

    table.delete_item(Key={'ticketId': ticket_id})
    return respond(200, {'ticketId': ticket_id, 'deleted': True})


# ── Pre-approved phone management ──────────────────────────────

def list_preapproved(event):
    """GET /tickets/preapproved — admin lists pre-approved phone records."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not PREAPPROVED_TABLE:
        return respond(200, {'records': [], 'count': 0})

    table = dynamodb.Table(PREAPPROVED_TABLE)
    resp = table.scan()
    records = resp.get('Items', [])
    records.sort(key=lambda r: r.get('added_at', ''), reverse=True)
    return respond(200, {'records': records, 'count': len(records)})


def add_preapproved(event):
    """POST /tickets/preapprove — admin adds one or more pre-approved phones."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not PREAPPROVED_TABLE:
        return respond(500, {'error': 'Pre-approved table not configured'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    # Support single: { phone, guestName } or bulk: { phones: [...], guestNames: [...] }
    phones_raw  = body.get('phones') or ([body['phone']] if body.get('phone') else [])
    guest_names = body.get('guestNames') or ([body.get('guestName', '')] * len(phones_raw))

    if not phones_raw:
        return respond(400, {'error': 'phone or phones[] is required'})

    preapproved_table = dynamodb.Table(PREAPPROVED_TABLE)
    tickets_table = dynamodb.Table(TICKETS_TABLE)
    now = datetime.utcnow().isoformat() + 'Z'
    added = []
    auto_approved = []

    for i, ph in enumerate(phones_raw):
        normalized = normalize_phone(str(ph).strip())
        if not normalized:
            continue
        name = (guest_names[i] if i < len(guest_names) else '').strip()
        record = {
            'id':         str(uuid.uuid4()),
            'phone':      normalized,
            'guestName':  name,
            'added_at':   now,
            'used':       False,
            'used_at':    None,
        }
        preapproved_table.put_item(Item=record)
        added.append({'id': record['id'], 'phone': normalized, 'guestName': name})

        # Auto-approve any existing pending ticket for this phone
        existing = find_ticket_by_phone(normalized)
        if existing and existing.get('status') == 'pending':
            tickets_table.update_item(
                Key={'ticketId': existing['ticketId']},
                UpdateExpression='SET #s = :approved, approved_by = :by, approved_at = :now',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':approved': 'approved', ':by': 'auto', ':now': now},
            )
            mark_preapproval_used(record['id'])
            auto_approved.append(existing['ticketId'])

    return respond(200, {'added': added, 'count': len(added), 'auto_approved': auto_approved})


def remove_preapproved(event, preapprove_id):
    """DELETE /tickets/preapprove/{id} — admin removes a pre-approved record."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not PREAPPROVED_TABLE:
        return respond(500, {'error': 'Pre-approved table not configured'})

    table = dynamodb.Table(PREAPPROVED_TABLE)
    existing = table.get_item(Key={'id': preapprove_id})
    if 'Item' not in existing:
        return respond(404, {'error': 'Pre-approved record not found'})

    table.delete_item(Key={'id': preapprove_id})
    return respond(200, {'id': preapprove_id, 'deleted': True})


# ── CSV Export ─────────────────────────────────────────────────

def export_tickets_csv(event):
    """GET /tickets/export — admin downloads all approved tickets as CSV."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table = dynamodb.Table(TICKETS_TABLE)
    resp = table.scan()
    tickets = resp.get('Items', [])
    tickets.sort(key=lambda t: t.get('createdAt', ''))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Ticket ID', 'Guest Name', 'Phone', 'Status',
        'Created At', 'Approved At', 'Approved By',
        'Issued By Role', 'Issued By Email', 'Issued By Name',
        'Checked In', 'Checked In At',
    ])
    for t in tickets:
        writer.writerow([
            t.get('ticketId', ''),
            t.get('guestName', ''),
            t.get('phone', ''),
            t.get('status', ''),
            t.get('createdAt', ''),
            t.get('approved_at', ''),
            t.get('approved_by', ''),
            t.get('issuedByRole', ''),
            t.get('issuedByEmail', ''),
            t.get('issuedByName', ''),
            'Yes' if t.get('checkedIn') else 'No',
            t.get('checkedInAt', ''),
        ])

    return respond_csv('tickets-export.csv', output.getvalue())


# ── Admin-issued tickets ────────────────────────────────────────

def issue_ticket(event):
    """POST /tickets/issue — admin or coordinator issues a ticket on behalf of a guest."""
    issuer_id, is_admin, is_coordinator = get_user_claims(event)
    if not is_admin and not is_coordinator:
        return respond(403, {'error': 'Admin or Coordinator access required'})

    # ── Coordinator quota check ──────────────────────────────────
    if is_coordinator and not is_admin:
        if not COORDINATOR_TABLE:
            return respond(500, {'error': 'Coordinator table not configured'})
        coord_table = dynamodb.Table(COORDINATOR_TABLE)
        coord = coord_table.get_item(Key={'userId': issuer_id}).get('Item')
        if not coord or not coord.get('isActive', True):
            return respond(403, {'error': 'Coordinator account not found or inactive.'})
        quota_used  = int(coord.get('quotaUsed', 0))
        quota_total = int(coord.get('quotaTotal', 0))
        if quota_used >= quota_total:
            return respond(403, {
                'error': 'Ticket quota exhausted. Contact an admin to increase your limit.',
                'quotaExhausted': True,
                'quotaUsed': quota_used,
                'quotaTotal': quota_total,
            })

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    guest_name   = (body.get('guestName') or '').strip()
    phone_raw    = (body.get('phone') or '').strip()
    phone        = normalize_phone(phone_raw) if phone_raw else ''
    selfie_b64   = body.get('selfieImage') or ''
    content_type = body.get('contentType') or 'image/jpeg'

    if not guest_name:
        return respond(400, {'error': 'guestName is required'})

    # Duplicate check
    if phone:
        existing = find_ticket_by_phone(phone)
        if existing:
            safe = {k: existing[k] for k in ('ticketId', 'guestName', 'phone', 'status', 'createdAt') if k in existing}
            return respond(200, {'existing': True, 'ticket': safe})

    table = dynamodb.Table(TICKETS_TABLE)
    ticket_id = generate_ticket_id(table)

    now = datetime.utcnow().isoformat() + 'Z'

    # Determine selfie: use provided or fall back to default wedding image
    if selfie_b64:
        ext = content_type.split('/')[-1].split(';')[0].strip()
        if ext == 'jpeg':
            ext = 'jpg'
        selfie_key = f'ticket-selfies/{ticket_id}.{ext}'
        try:
            upload_image_b64(selfie_b64, content_type, selfie_key)
        except Exception:
            return respond(400, {'error': 'Invalid base64 selfie image'})
    else:
        selfie_key = DEFAULT_IMAGE_KEY

    issuer_email = get_issuer_email(event)
    issued_role  = 'coordinator' if (is_coordinator and not is_admin) else 'superadmin'

    # Look up coordinator name (if coordinator)
    issuer_name = issuer_email
    if is_coordinator and not is_admin and COORDINATOR_TABLE:
        try:
            coord = dynamodb.Table(COORDINATOR_TABLE).get_item(Key={'userId': issuer_id}).get('Item')
            if coord:
                issuer_name = coord.get('name', issuer_email)
        except Exception:
            pass

    item = {
        'ticketId':       ticket_id,
        'guestName':      guest_name,
        'phone':          phone,
        'selfieKey':      selfie_key,
        'status':         'approved',
        'createdAt':      now,
        'userId':         '',
        'approved_by':    'admin_issued',
        'approved_at':    now,
        'issuedByRole':   issued_role,
        'issuedByEmail':  issuer_email,
        'issuedByName':   issuer_name,
    }
    if is_coordinator and not is_admin:
        item['coordinatorId'] = issuer_id

    table.put_item(Item=item)

    # ── Increment coordinator quota usage ────────────────────────────
    if is_coordinator and not is_admin and COORDINATOR_TABLE:
        try:
            dynamodb.Table(COORDINATOR_TABLE).update_item(
                Key={'userId': issuer_id},
                UpdateExpression='SET quotaUsed = quotaUsed + :one',
                ExpressionAttributeValues={':one': 1},
            )
            # Alert super admins if quota is now exhausted
            if quota_used + 1 >= quota_total:
                _send_quota_exhausted_alert(issuer_name, quota_total)
        except Exception as e:
            print(f'[WARN] Failed to increment coordinator quota: {e}')

    return respond(200, {
        'ticketId':      ticket_id,
        'guestName':     guest_name,
        'phone':         phone,
        'status':        'approved',
        'createdAt':     now,
        'approved_by':   'admin_issued',
        'approved_at':   now,
        'issuedByRole':  issued_role,
        'issuedByEmail': issuer_email,
        'issuedByName':  issuer_name,
    })


# ── Default image ───────────────────────────────────────────────

def set_default_image(event):
    """PUT /tickets/default-image — admin uploads the default ticket selfie image."""
    _, is_admin, __ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    image_b64    = body.get('image') or ''
    content_type = body.get('contentType') or 'image/jpeg'

    if not image_b64:
        return respond(400, {'error': 'image (base64) is required'})

    try:
        upload_image_b64(image_b64, content_type, DEFAULT_IMAGE_KEY)
    except Exception:
        return respond(400, {'error': 'Invalid base64 image'})

    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': PHOTOS_BUCKET, 'Key': DEFAULT_IMAGE_KEY},
            ExpiresIn=3600,
        )
    except Exception:
        url = None

    return respond(200, {'key': DEFAULT_IMAGE_KEY, 'previewUrl': url})


# ── Lambda entry point ──────────────────────────────────────────

def lambda_handler(event, context):
    method   = event.get('requestContext', {}).get('http', {}).get('method', 'GET').upper()
    raw_path = event.get('rawPath', '')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    # /my-ticket (public phone lookup)
    if raw_path == '/my-ticket':
        if method == 'GET':
            return get_ticket_by_phone(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets (exact)
    if raw_path == '/tickets':
        if method == 'POST':
            return create_ticket(event)
        if method == 'GET':
            return list_tickets(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/preapproved (exact) — list pre-approved phones
    if raw_path == '/tickets/preapproved':
        if method == 'GET':
            return list_preapproved(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/preapprove (exact) — add pre-approved phone(s)
    if raw_path == '/tickets/preapprove':
        if method == 'POST':
            return add_preapproved(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/preapprove/{id} — remove a pre-approved record
    if raw_path.startswith('/tickets/preapprove/'):
        preapprove_id = raw_path[len('/tickets/preapprove/'):]
        if not preapprove_id:
            return respond(400, {'error': 'Pre-approve record ID required'})
        if method == 'DELETE':
            return remove_preapproved(event, preapprove_id)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/export — CSV download
    if raw_path == '/tickets/export':
        if method == 'GET':
            return export_tickets_csv(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/issue — admin-issued ticket
    if raw_path == '/tickets/issue':
        if method == 'POST':
            return issue_ticket(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/default-image — set default selfie image
    if raw_path == '/tickets/default-image':
        if method == 'PUT':
            return set_default_image(event)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/{id}/view (public, no auth)
    if raw_path.startswith('/tickets/') and raw_path.endswith('/view'):
        ticket_id = raw_path[len('/tickets/'):-len('/view')]
        if not ticket_id:
            return respond(400, {'error': 'Ticket ID required'})
        if method == 'GET':
            return get_ticket_public(ticket_id)
        return respond(405, {'error': 'Method not allowed'})

    # /tickets/{id}
    if raw_path.startswith('/tickets/'):
        ticket_id = raw_path[len('/tickets/'):]
        if not ticket_id:
            return respond(400, {'error': 'Ticket ID required'})
        if method == 'PUT':
            return update_ticket(event, ticket_id)
        if method == 'GET':
            return get_ticket(event, ticket_id)
        if method == 'DELETE':
            return delete_ticket(event, ticket_id)
        return respond(405, {'error': 'Method not allowed'})

    return respond(404, {'error': 'Not found'})
