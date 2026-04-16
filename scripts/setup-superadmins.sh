#!/bin/bash
# setup-superadmins.sh — Create / verify the two Super Admin accounts.
#
# Accounts:
#   patkatech@gmail.com   (primary admin)
#   bakobamai@gmail.com   (primary admin)
#
# What this script does:
#   1. Creates the Cognito user if it doesn't already exist.
#   2. Forces FORCE_CHANGE_PASSWORD status so the user must set a new
#      password on their first login (or after a reset).
#   3. Adds the user to both "admins" and "superadmins" Cognito groups.
#   4. Ensures email_verified = true so the account can log in.
#
# Safe to rerun — all operations are idempotent.
#
# Usage:
#   bash scripts/setup-superadmins.sh
#
# Requirements:
#   AWS CLI configured with credentials that have Cognito admin permissions.

set -e

POOL_ID="eu-west-1_vGQmvqD9f"
REGION="eu-west-1"
TEMP_PASS="WeddingAdmin@2026!"   # Temporary — must be changed on first login

SUPER_ADMINS=(
  "patkatech@gmail.com"
  "bakobamai@gmail.com"
)

echo "======================================================"
echo " Wedding Platform — Super Admin Setup"
echo " Pool: $POOL_ID  |  Region: $REGION"
echo "======================================================"
echo ""

for EMAIL in "${SUPER_ADMINS[@]}"; do
  echo "▸ Processing: $EMAIL"
  echo "  ─────────────────────────────────────────────"

  # ── Step 1: Create user (skip if already exists) ──────────────
  echo "  [1/4] Creating Cognito user..."
  CREATE_OUTPUT=$(aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --temporary-password "$TEMP_PASS" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
        Name=name,Value="Super Admin" \
    --message-action SUPPRESS \
    --region "$REGION" 2>&1) && echo "      ✓ User created" \
    || {
      if echo "$CREATE_OUTPUT" | grep -q "UsernameExistsException"; then
        echo "      ℹ User already exists — proceeding to update"
      else
        echo "      ✗ Unexpected error: $CREATE_OUTPUT"
        continue
      fi
    }

  # ── Step 2: Set/reset to temporary password (forces FORCE_CHANGE_PASSWORD) ──
  echo "  [2/4] Resetting password to temporary (force-change on login)..."
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --password "$TEMP_PASS" \
    --no-permanent \
    --region "$REGION" \
    && echo "      ✓ Password set — user must change on first login" \
    || echo "      ✗ Failed to reset password (check permissions)"

  # ── Step 3: Ensure email_verified = true ──────────────────────
  echo "  [3/4] Verifying email attribute..."
  aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$POOL_ID" \
    --username "$EMAIL" \
    --user-attributes \
        Name=email_verified,Value=true \
    --region "$REGION" \
    && echo "      ✓ Email marked as verified" \
    || echo "      ✗ Failed to update email_verified"

  # ── Step 4: Add to Cognito groups ────────────────────────────
  echo "  [4/4] Assigning to 'admins' and 'superadmins' groups..."
  for GROUP in admins superadmins; do
    aws cognito-idp admin-add-user-to-group \
      --user-pool-id "$POOL_ID" \
      --username "$EMAIL" \
      --group-name "$GROUP" \
      --region "$REGION" \
      && echo "      ✓ Added to '$GROUP'" \
      || echo "      ✗ Failed to add to '$GROUP'"
  done

  echo ""
done

echo "======================================================"
echo " DONE"
echo "======================================================"
echo ""
echo " Both accounts are ready. Each user must log in and"
echo " set a new password using the temporary password below."
echo ""
echo " Temporary password: $TEMP_PASS"
echo ""
echo " Login URL:  https://d3fgz6gxizt2sl.cloudfront.net/admin-login"
echo ""
echo " Accounts:"
for EMAIL in "${SUPER_ADMINS[@]}"; do
  echo "   • $EMAIL"
done
echo ""
echo " To send a password reset link instead (if the user"
echo " prefers), run:"
echo "   aws cognito-idp admin-reset-user-password \\"
echo "     --user-pool-id $POOL_ID \\"
echo "     --username <email> \\"
echo "     --region $REGION"
echo ""
