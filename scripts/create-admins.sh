#!/bin/bash
# create-admins.sh — Create the three wedding admin accounts in Cognito
# Safe to rerun: skips users that already exist.
#
# Usage:  bash scripts/create-admins.sh
#
# Accounts created:
#   admin1@bamiakazah.wedding  (temp password: Admin@1234 — must change on first login)
#   admin2@bamiakazah.wedding
#   admin3@bamiakazah.wedding

set -e

POOL_ID="eu-west-1_n4ZjXMOfq"
TEMP_PASS="Admin@1234"
REGION="eu-west-1"
ADMINS=(
  "admin1@bamiakazah.wedding"
  "admin2@bamiakazah.wedding"
  "admin3@bamiakazah.wedding"
)

echo "Creating admin accounts in Cognito pool: $POOL_ID"
echo ""

for EMAIL in "${ADMINS[@]}"; do
  echo "→ $EMAIL"

  # Create the user (skip if already exists)
  aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --temporary-password "$TEMP_PASS" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
    --message-action SUPPRESS \
    --region "$REGION" 2>/dev/null \
    && echo "  ✓ User created" \
    || echo "  ℹ User already exists — skipping creation"

  # Add to admins group (idempotent)
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --group-name admins \
    --region "$REGION" \
    && echo "  ✓ Added to admins group"

  echo ""
done

echo "Done! All admin accounts ready."
echo ""
echo "Login at: https://dil5ih5xgoo14.cloudfront.net/admin-login"
echo "Temporary password: $TEMP_PASS"
echo "Each admin must set a new password on first login."
