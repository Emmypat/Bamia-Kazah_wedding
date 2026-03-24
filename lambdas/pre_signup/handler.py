"""
Pre-signup Lambda trigger for Cognito.

Auto-confirms all user registrations so guests don't need to verify
an email address. This is appropriate for a wedding platform where
guests register with either email or phone (via synthetic email).
"""


def lambda_handler(event, context):
    # Auto-confirm the user — no email verification required
    event["response"]["autoConfirmUser"] = True
    # Auto-verify the email attribute so Cognito doesn't mark it unverified
    event["response"]["autoVerifyEmail"] = True
    return event
