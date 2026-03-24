##############################################################
# modules/auth/main.tf
#
# AWS Cognito for guest authentication.
#
# WHY COGNITO?
# - Managed auth: AWS handles password hashing, tokens, MFA
# - Free tier: 50,000 MAUs free — more than enough for a wedding
# - JWT tokens: integrates directly with API Gateway authorizer
# - No auth server to maintain
#
# FLOW FOR GUESTS:
# 1. Guest visits site, clicks "Register"
# 2. Enters name + email + password
# 3. Cognito sends email verification code
# 4. Guest confirms code → account active
# 5. Guest logs in → gets JWT access token
# 6. Frontend attaches token to all API requests
# 7. API Gateway validates token against this User Pool
#
# ADMIN FLOW (couple/photographer):
# Admin user is manually created, assigned to "admins" group.
# Admin group grants access to /register-couple endpoint.
##############################################################

resource "aws_cognito_user_pool" "guests" {
  name = "${var.name_prefix}-guests"

  # Use email as the username — easier for guests than usernames
  username_attributes = ["email"]

  # Auto-verify emails (send a confirmation code)
  auto_verified_attributes = ["email"]

  # Password policy — slightly relaxed for guests
  # They're at a wedding, not creating a bank account
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = false  # Relax for ease
    require_symbols                  = false  # Relax for ease
    require_uppercase                = false  # Relax for ease
    temporary_password_validity_days = 7
  }

  # What happens when a user signs up
  # ALLOW_USER_PASSWORD_AUTH: standard username+password flow
  # ALLOW_REFRESH_TOKEN_AUTH: lets the frontend refresh tokens silently
  # ALLOW_USER_SRP_AUTH: Secure Remote Password (more secure, used by Amplify)
  user_pool_add_ons {
    advanced_security_mode = "OFF" # OFF = free; AUDIT/ENFORCED = $5+/month
  }

  # Schema: define custom attributes
  schema {
    name                = "name"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  # Email configuration — uses Cognito's built-in email by default
  # For production, configure SES here for better deliverability
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT" # Switch to DEVELOPER + SES for custom from address
  }

  # Customise verification email subject
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code for ${var.project_name}"
    email_message        = "Welcome! Your verification code is: {####}"
  }

  tags = {
    Name = "Wedding Guest User Pool"
  }
}

# ── App Client ────────────────────────────────────────────────
# An app client is what your frontend uses to interact with the user pool.
# It has its own ID and optionally a secret.
# For browser-based apps, we DON'T use a client secret (can't be kept secret in JS).
resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.name_prefix}-frontend-client"
  user_pool_id = aws_cognito_user_pool.guests.id

  # No client secret for browser apps
  generate_secret = false

  # Auth flows the client is allowed to use
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",  # Standard login
    "ALLOW_USER_SRP_AUTH",       # Amplify default (more secure)
    "ALLOW_REFRESH_TOKEN_AUTH",  # Silent token refresh
  ]

  # Token validity
  access_token_validity  = 8   # 8 hours — covers a full wedding day
  id_token_validity      = 8
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors (don't reveal if email exists)
  prevent_user_existence_errors = "ENABLED"
}

# ── Admin Group ───────────────────────────────────────────────
# Users in this group can access admin endpoints (register couple faces).
# Add the couple/photographer to this group after deployment.
resource "aws_cognito_user_group" "admins" {
  name         = "admins"
  user_pool_id = aws_cognito_user_pool.guests.id
  description  = "Wedding admin users (couple, photographer)"
  precedence   = 1 # Lower number = higher priority if user is in multiple groups
}
