"""
coordinators_handler — Event Coordinator account and quota management.

Routes (all JWT-protected):
  POST   /coordinators              — Admin creates a coordinator account
  GET    /coordinators              — Admin lists all coordinators
  PUT    /coordinators/{id}         — Admin updates coordinator (activate/deactivate/rename)
  DELETE /coordinators/{id}         — Admin deactivates coordinator
  POST   /coordinators/{id}/enhance — Admin adds or reduces tickets in quota
  GET    /coordinators/{id}/tickets — Admin views tickets issued by this coordinator
  GET    /coordinator/quota         — Coordinator checks their own remaining quota

Environment variables required:
  COORDINATOR_TABLE        — DynamoDB table name for coordinator records
  QUOTA_ENHANCEMENTS_TABLE — DynamoDB table name for quota change audit log
  TICKETS_TABLE            — DynamoDB table name for tickets
  COGNITO_USER_POOL_ID     — Cognito User Pool ID
  FROM_EMAIL               — Verified SES email for outgoing notifications
  SITE_URL                 — Frontend URL (e.g. https://d3fgz6gxizt2sl.cloudfront.net)
"""

import json
import boto3
import os
import re
import uuid
import random
import string
from datetime import datetime

cognito  = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
ses      = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'eu-west-1'))

COORDINATOR_TABLE        = os.environ.get('COORDINATOR_TABLE', '')
QUOTA_ENHANCEMENTS_TABLE = os.environ.get('QUOTA_ENHANCEMENTS_TABLE', '')
TICKETS_TABLE            = os.environ.get('TICKETS_TABLE', '')
COGNITO_USER_POOL_ID     = os.environ.get('COGNITO_USER_POOL_ID', '')
FROM_EMAIL               = os.environ.get('FROM_EMAIL', '')
SITE_URL                 = os.environ.get('SITE_URL', '')
COORDINATOR_GROUP        = 'coordinators'


# ── Helpers ──────────────────────────────────────────────────────

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
    is_coordinator = COORDINATOR_GROUP in groups
    return user_id, username, is_admin, is_coordinator


def generate_temp_password():
    """Generate a temporary coordinator password that meets Cognito requirements."""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=6))
    return f'Coord@{suffix}!'


def now_iso():
    return datetime.utcnow().isoformat() + 'Z'


# ── Email helpers ─────────────────────────────────────────────────

def send_coordinator_welcome_email(email, name, temp_password, quota):
    """Send login credentials to a newly created coordinator."""
    if not FROM_EMAIL:
        return
    login_url = f'{SITE_URL}/coordinator/login' if SITE_URL else '/coordinator/login'
    subject = 'Your Event Coordinator Account — Bamai & Kazah Wedding'
    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:20px;color:#2D2020">
      <div style="background:linear-gradient(135deg,#7A1428,#5C0F1E);padding:32px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:26px">Bamai &amp; Kazah</h1>
        <p style="color:#C4956A;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">Event Coordinator Account</p>
      </div>
      <h2 style="color:#7A1428">Welcome, {name}!</h2>
      <p>You have been granted access as an <strong>Event Coordinator</strong> for the Bamai &amp; Kazah wedding. You can issue up to <strong>{quota} attendance tickets</strong>.</p>
      <div style="background:#F7EDE0;border:1px solid #EDE0D8;border-radius:10px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Login URL:</strong><br><a href="{login_url}" style="color:#7A1428">{login_url}</a></p>
        <p style="margin:8px 0"><strong>Email:</strong> {email}</p>
        <p style="margin:8px 0"><strong>Temporary Password:</strong> <code style="background:#fff;padding:3px 8px;border-radius:4px;font-size:14px">{temp_password}</code></p>
        <p style="margin:8px 0 0;font-size:12px;color:#7A6060">You will be asked to set a new password on your first login.</p>
      </div>
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:14px;margin:16px 0">
        <strong style="color:#92400E">⚠ Important:</strong>
        <span style="color:#78350F;font-size:13px"> Do not share your credentials. You can only issue tickets — you do not have access to other admin functions.</span>
      </div>
      <p style="color:#7A6060;font-size:12px;margin-top:24px">This is an automated message. If you did not expect this email, please contact the wedding administrator.</p>
    </body></html>
    """
    try:
        ses.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html, 'Charset': 'UTF-8'},
                    'Text': {'Data': f'Welcome {name}! Login at {login_url} with email {email} and temp password {temp_password}. Ticket quota: {quota}.', 'Charset': 'UTF-8'},
                },
            },
        )
    except Exception as e:
        print(f'[WARN] Failed to send welcome email to {email}: {e}')


def send_quota_enhanced_email(email, name, tickets_added, new_total, remaining, enhanced_by):
    """Notify coordinator when their quota is increased."""
    if not FROM_EMAIL:
        return
    login_url = f'{SITE_URL}/coordinator/login' if SITE_URL else '/coordinator/login'
    subject   = f'Your ticket quota has been updated — Bamai & Kazah Wedding'
    action    = 'increased' if tickets_added > 0 else 'reduced'
    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:20px;color:#2D2020">
      <div style="background:linear-gradient(135deg,#7A1428,#5C0F1E);padding:32px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:26px">Quota Update</h1>
        <p style="color:#C4956A;margin:8px 0 0;font-size:13px">Bamai &amp; Kazah Wedding</p>
      </div>
      <h2 style="color:#7A1428">Hello, {name}!</h2>
      <p>Your ticket quota has been <strong>{action}</strong> by <strong>{abs(tickets_added)} ticket{'s' if abs(tickets_added) != 1 else ''}</strong>.</p>
      <div style="background:#D1FAE5;border:1px solid #6EE7B7;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <div style="font-size:36px;font-weight:900;color:#065F46">{remaining}</div>
        <div style="color:#047857;font-size:14px">tickets remaining</div>
        <div style="color:#6B7280;font-size:12px;margin-top:4px">Total quota: {new_total}</div>
      </div>
      <p>Updated by: {enhanced_by}</p>
      <p><a href="{login_url}" style="color:#7A1428">Go to your dashboard</a></p>
    </body></html>
    """
    try:
        ses.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Html': {'Data': html, 'Charset': 'UTF-8'}},
            },
        )
    except Exception as e:
        print(f'[WARN] Failed to send quota email to {email}: {e}')


def send_quota_exhausted_alert(admin_emails, coordinator_name, quota):
    """Alert super admins when a coordinator exhausts their quota."""
    if not FROM_EMAIL or not admin_emails:
        return
    subject = f'⚠ Coordinator quota exhausted — {coordinator_name}'
    text    = f'{coordinator_name} has used all {quota} of their ticket quota. Log in to grant more tickets.'
    try:
        ses.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': admin_emails},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Text': {'Data': text, 'Charset': 'UTF-8'}},
            },
        )
    except Exception as e:
        print(f'[WARN] Failed to send quota exhausted alert: {e}')


# ── Route handlers ────────────────────────────────────────────────

def create_coordinator(event):
    """POST /coordinators — admin creates a new Event Coordinator account."""
    _, admin_email, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not COORDINATOR_TABLE or not COGNITO_USER_POOL_ID:
        return respond(500, {'error': 'Coordinator table or Cognito pool not configured'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    name         = (body.get('name') or '').strip()
    email        = (body.get('email') or '').strip().lower()
    phone        = (body.get('phone') or '').strip()
    initial_quota = int(body.get('initialQuota') or body.get('quota') or 0)

    if not name:
        return respond(400, {'error': 'name is required'})
    if not email or '@' not in email:
        return respond(400, {'error': 'valid email is required'})
    if initial_quota <= 0:
        return respond(400, {'error': 'initialQuota must be a positive integer'})

    # Check if Cognito user already exists
    try:
        existing_user = cognito.admin_get_user(UserPoolId=COGNITO_USER_POOL_ID, Username=email)
        # User exists — check if they're already a coordinator
        existing_groups = [g['GroupName'] for g in
                           cognito.admin_list_groups_for_user(
                               UserPoolId=COGNITO_USER_POOL_ID,
                               Username=email)['Groups']]
        if COORDINATOR_GROUP in existing_groups:
            return respond(409, {'error': f'A coordinator account for {email} already exists.'})
        # Promote existing user to coordinator
        cognito.admin_add_user_to_group(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            GroupName=COORDINATOR_GROUP,
        )
        attrs = {a['Name']: a['Value'] for a in existing_user['UserAttributes']}
        user_id = attrs['sub']
        temp_password = None  # Existing user already has a password
    except cognito.exceptions.UserNotFoundException:
        # Create new Cognito user
        temp_password = generate_temp_password()
        response = cognito.admin_create_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            TemporaryPassword=temp_password,
            MessageAction='SUPPRESS',
            UserAttributes=[
                {'Name': 'email',          'Value': email},
                {'Name': 'name',           'Value': name},
                {'Name': 'email_verified', 'Value': 'true'},
            ],
        )
        attrs   = {a['Name']: a['Value'] for a in response['User']['Attributes']}
        user_id = attrs['sub']
        cognito.admin_add_user_to_group(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            GroupName=COORDINATOR_GROUP,
        )

    now = now_iso()
    coord_table = dynamodb.Table(COORDINATOR_TABLE)

    # Check if DynamoDB record already exists (by userId)
    existing_record = coord_table.get_item(Key={'userId': user_id}).get('Item')
    if existing_record:
        return respond(409, {'error': f'Coordinator record for {email} already exists.'})

    record = {
        'userId':          user_id,
        'email':           email,
        'name':            name,
        'phone':           phone,
        'initialQuota':    initial_quota,
        'quotaTotal':      initial_quota,
        'quotaUsed':       0,
        'isActive':        True,
        'createdBy':       admin_email,
        'createdAt':       now,
        'lastLogin':       None,
        'cognitoUsername': email,
    }
    coord_table.put_item(Item=record)

    if temp_password:
        send_coordinator_welcome_email(email, name, temp_password, initial_quota)

    return respond(200, {
        **{k: v for k, v in record.items() if k != 'lastLogin'},
        'tempPassword':    temp_password,
        'emailSent':       bool(temp_password and FROM_EMAIL),
    })


def list_coordinators(event):
    """GET /coordinators — admin lists all coordinators."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not COORDINATOR_TABLE:
        return respond(200, {'coordinators': [], 'count': 0})

    table   = dynamodb.Table(COORDINATOR_TABLE)
    resp    = table.scan()
    coords  = resp.get('Items', [])
    coords.sort(key=lambda c: c.get('createdAt', ''), reverse=True)

    # Attach remaining quota
    for c in coords:
        c['quotaRemaining'] = int(c.get('quotaTotal', 0)) - int(c.get('quotaUsed', 0))

    return respond(200, {'coordinators': coords, 'count': len(coords)})


def update_coordinator(event, coord_id):
    """PUT /coordinators/{id} — admin updates coordinator details or active status."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    table = dynamodb.Table(COORDINATOR_TABLE)
    existing = table.get_item(Key={'userId': coord_id}).get('Item')
    if not existing:
        return respond(404, {'error': 'Coordinator not found'})

    update_expr_parts = []
    expr_values       = {}

    if 'isActive' in body:
        update_expr_parts.append('isActive = :active')
        expr_values[':active'] = bool(body['isActive'])
        # Reflect in Cognito
        try:
            if body['isActive']:
                cognito.admin_enable_user(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=existing['email'],
                )
            else:
                cognito.admin_disable_user(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=existing['email'],
                )
        except Exception as e:
            print(f'[WARN] Cognito enable/disable failed: {e}')

    if 'name' in body and body['name'].strip():
        update_expr_parts.append('#n = :name')
        expr_values[':name'] = body['name'].strip()

    if 'phone' in body:
        update_expr_parts.append('phone = :phone')
        expr_values[':phone'] = body['phone'].strip()

    if not update_expr_parts:
        return respond(400, {'error': 'No valid fields to update'})

    update_kwargs = {
        'Key': {'userId': coord_id},
        'UpdateExpression': 'SET ' + ', '.join(update_expr_parts),
        'ExpressionAttributeValues': expr_values,
        'ReturnValues': 'ALL_NEW',
    }
    if '#n = :name' in update_expr_parts:
        update_kwargs['ExpressionAttributeNames'] = {'#n': 'name'}

    result = table.update_item(**update_kwargs)
    updated = result.get('Attributes', {})
    updated['quotaRemaining'] = int(updated.get('quotaTotal', 0)) - int(updated.get('quotaUsed', 0))
    return respond(200, updated)


def deactivate_coordinator(event, coord_id):
    """DELETE /coordinators/{id} — admin deactivates a coordinator (soft delete)."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table    = dynamodb.Table(COORDINATOR_TABLE)
    existing = table.get_item(Key={'userId': coord_id}).get('Item')
    if not existing:
        return respond(404, {'error': 'Coordinator not found'})

    table.update_item(
        Key={'userId': coord_id},
        UpdateExpression='SET isActive = :f',
        ExpressionAttributeValues={':f': False},
    )
    try:
        cognito.admin_disable_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=existing['email'],
        )
    except Exception as e:
        print(f'[WARN] Cognito disable failed: {e}')

    return respond(200, {'userId': coord_id, 'isActive': False, 'deactivated': True})


def enhance_coordinator_quota(event, coord_id):
    """POST /coordinators/{id}/enhance — admin adds or reduces a coordinator's quota."""
    _, admin_email, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not COORDINATOR_TABLE:
        return respond(500, {'error': 'Coordinator table not configured'})

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON body'})

    tickets_added = body.get('add') or body.get('ticketsAdded')
    reason        = (body.get('reason') or '').strip()

    if tickets_added is None:
        return respond(400, {'error': '"add" (number of tickets to add or remove) is required'})
    tickets_added = int(tickets_added)

    coord_table = dynamodb.Table(COORDINATOR_TABLE)
    coord = coord_table.get_item(Key={'userId': coord_id}).get('Item')
    if not coord:
        return respond(404, {'error': 'Coordinator not found'})

    current_total = int(coord.get('quotaTotal', 0))
    quota_used    = int(coord.get('quotaUsed', 0))
    new_total     = current_total + tickets_added

    if new_total < quota_used:
        return respond(400, {
            'error': f'Cannot reduce quota below already-used amount ({quota_used} used). Minimum new total is {quota_used}.',
        })
    if new_total < 0:
        return respond(400, {'error': 'Quota total cannot go below 0.'})

    coord_table.update_item(
        Key={'userId': coord_id},
        UpdateExpression='SET quotaTotal = :qt',
        ExpressionAttributeValues={':qt': new_total},
    )

    # Write audit record
    now = now_iso()
    if QUOTA_ENHANCEMENTS_TABLE:
        enh_table = dynamodb.Table(QUOTA_ENHANCEMENTS_TABLE)
        enh_table.put_item(Item={
            'id':             str(uuid.uuid4()),
            'coordinatorId':  coord_id,
            'coordinatorName': coord.get('name', ''),
            'enhancedBy':     admin_email,
            'ticketsAdded':   tickets_added,
            'previousTotal':  current_total,
            'newTotal':       new_total,
            'reason':         reason,
            'createdAt':      now,
        })

    remaining = new_total - quota_used
    send_quota_enhanced_email(
        coord['email'], coord.get('name', ''),
        tickets_added, new_total, remaining, admin_email,
    )

    return respond(200, {
        'userId':        coord_id,
        'previousTotal': current_total,
        'newTotal':      new_total,
        'quotaUsed':     quota_used,
        'quotaRemaining': remaining,
        'ticketsAdded':  tickets_added,
    })


def get_coordinator_tickets(event, coord_id):
    """GET /coordinators/{id}/tickets — admin views tickets issued by a coordinator."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not TICKETS_TABLE:
        return respond(200, {'tickets': [], 'count': 0})

    from boto3.dynamodb.conditions import Attr
    table = dynamodb.Table(TICKETS_TABLE)
    resp  = table.scan(FilterExpression=Attr('coordinatorId').eq(coord_id))
    tickets = resp.get('Items', [])
    tickets.sort(key=lambda t: t.get('createdAt', ''), reverse=True)

    # Strip selfieKey
    for t in tickets:
        t.pop('selfieKey', None)

    return respond(200, {'tickets': tickets, 'count': len(tickets)})


def get_my_quota(event):
    """GET /coordinator/quota — coordinator checks their own quota."""
    user_id, _, is_admin, is_coordinator = get_user_claims(event)
    if not is_coordinator and not is_admin:
        return respond(403, {'error': 'Coordinator access required'})
    if not COORDINATOR_TABLE:
        return respond(500, {'error': 'Coordinator table not configured'})

    table = dynamodb.Table(COORDINATOR_TABLE)
    coord = table.get_item(Key={'userId': user_id}).get('Item')
    if not coord:
        return respond(404, {'error': 'Coordinator record not found. Contact an admin.'})

    if not coord.get('isActive', True):
        return respond(403, {'error': 'Your coordinator account has been deactivated. Contact an admin.'})

    quota_total = int(coord.get('quotaTotal', 0))
    quota_used  = int(coord.get('quotaUsed', 0))

    return respond(200, {
        'userId':         user_id,
        'name':           coord.get('name', ''),
        'email':          coord.get('email', ''),
        'quotaTotal':     quota_total,
        'quotaUsed':      quota_used,
        'quotaRemaining': quota_total - quota_used,
        'isActive':       coord.get('isActive', True),
    })


def get_quota_history(event, coord_id):
    """GET /coordinators/{id}/enhancements — admin views quota change history."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})
    if not QUOTA_ENHANCEMENTS_TABLE:
        return respond(200, {'enhancements': []})

    from boto3.dynamodb.conditions import Attr
    table = dynamodb.Table(QUOTA_ENHANCEMENTS_TABLE)
    resp  = table.scan(FilterExpression=Attr('coordinatorId').eq(coord_id))
    items = resp.get('Items', [])
    items.sort(key=lambda i: i.get('createdAt', ''), reverse=True)
    return respond(200, {'enhancements': items, 'count': len(items)})


def reset_coordinator_password(event, coord_id):
    """POST /coordinators/{id}/reset-password — admin sends new temp credentials."""
    _, _, is_admin, _ = get_user_claims(event)
    if not is_admin:
        return respond(403, {'error': 'Admin access required'})

    table = dynamodb.Table(COORDINATOR_TABLE)
    coord = table.get_item(Key={'userId': coord_id}).get('Item')
    if not coord:
        return respond(404, {'error': 'Coordinator not found'})

    temp_password = generate_temp_password()
    try:
        cognito.admin_set_user_password(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=coord['email'],
            Password=temp_password,
            Permanent=False,
        )
    except Exception as e:
        return respond(500, {'error': f'Failed to reset Cognito password: {str(e)}'})

    send_coordinator_welcome_email(
        coord['email'], coord.get('name', ''), temp_password, int(coord.get('quotaTotal', 0))
    )

    return respond(200, {
        'userId':       coord_id,
        'email':        coord['email'],
        'tempPassword': temp_password,
        'emailSent':    bool(FROM_EMAIL),
    })


# ── Lambda entry point ────────────────────────────────────────────

def lambda_handler(event, context):
    method   = event.get('requestContext', {}).get('http', {}).get('method', 'GET').upper()
    raw_path = event.get('rawPath', '')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    # GET /coordinator/quota — coordinator checks own quota (no trailing s)
    if raw_path == '/coordinator/quota':
        if method == 'GET':
            return get_my_quota(event)
        return respond(405, {'error': 'Method not allowed'})

    # POST /coordinators — create coordinator
    # GET  /coordinators — list coordinators
    if raw_path == '/coordinators':
        if method == 'POST':
            return create_coordinator(event)
        if method == 'GET':
            return list_coordinators(event)
        return respond(405, {'error': 'Method not allowed'})

    # /coordinators/{id}/enhance
    if raw_path.startswith('/coordinators/') and raw_path.endswith('/enhance'):
        coord_id = raw_path[len('/coordinators/'):-len('/enhance')]
        if not coord_id:
            return respond(400, {'error': 'Coordinator ID required'})
        if method == 'POST':
            return enhance_coordinator_quota(event, coord_id)
        return respond(405, {'error': 'Method not allowed'})

    # /coordinators/{id}/tickets
    if raw_path.startswith('/coordinators/') and raw_path.endswith('/tickets'):
        coord_id = raw_path[len('/coordinators/'):-len('/tickets')]
        if not coord_id:
            return respond(400, {'error': 'Coordinator ID required'})
        if method == 'GET':
            return get_coordinator_tickets(event, coord_id)
        return respond(405, {'error': 'Method not allowed'})

    # /coordinators/{id}/enhancements
    if raw_path.startswith('/coordinators/') and raw_path.endswith('/enhancements'):
        coord_id = raw_path[len('/coordinators/'):-len('/enhancements')]
        if not coord_id:
            return respond(400, {'error': 'Coordinator ID required'})
        if method == 'GET':
            return get_quota_history(event, coord_id)
        return respond(405, {'error': 'Method not allowed'})

    # /coordinators/{id}/reset-password
    if raw_path.startswith('/coordinators/') and raw_path.endswith('/reset-password'):
        coord_id = raw_path[len('/coordinators/'):-len('/reset-password')]
        if not coord_id:
            return respond(400, {'error': 'Coordinator ID required'})
        if method == 'POST':
            return reset_coordinator_password(event, coord_id)
        return respond(405, {'error': 'Method not allowed'})

    # /coordinators/{id} — update or deactivate
    if raw_path.startswith('/coordinators/'):
        coord_id = raw_path[len('/coordinators/'):]
        if not coord_id:
            return respond(400, {'error': 'Coordinator ID required'})
        if method == 'PUT':
            return update_coordinator(event, coord_id)
        if method == 'DELETE':
            return deactivate_coordinator(event, coord_id)
        return respond(405, {'error': 'Method not allowed'})

    return respond(404, {'error': 'Not found'})
