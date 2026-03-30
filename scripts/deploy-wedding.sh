#!/bin/bash
# deploy-wedding.sh — Deploy a full wedding stack for one couple
#
# Usage:
#   bash scripts/deploy-wedding.sh \
#     --slug       bamai-kazah \
#     --couple     "Bamai & Kazah" \
#     --date       2026-04-11 \
#     --email      emmypat4rl@gmail.com \
#     --admin      patkatech@gmail.com
#
# What it does:
#   1. Deploys a full isolated AWS stack (Lambda, S3, Cognito, CloudFront, etc.)
#   2. Builds and deploys the frontend
#   3. Creates the admin user in Cognito
#   4. Prints the DNS CNAME you need to add at DomainKing

set -e

# ── Defaults ──────────────────────────────────────────────────
REGION="eu-west-1"
BASE_DOMAIN="pkweddings.com.ng"
CERT_ARN="arn:aws:acm:us-east-1:106083617032:certificate/c4d90d0e-cdc6-4bc4-91dd-5cb0dceb8423"
TFSTATE_BUCKET="wedding-photos-tfstate-106083617032"
TEMP_PASS="Admin@1234"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Parse arguments ───────────────────────────────────────────
SLUG=""
COUPLE_NAME=""
WEDDING_DATE=""
NOTIFICATION_EMAIL=""
ADMIN_EMAIL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --slug)    SLUG="$2";               shift 2 ;;
    --couple)  COUPLE_NAME="$2";        shift 2 ;;
    --date)    WEDDING_DATE="$2";       shift 2 ;;
    --email)   NOTIFICATION_EMAIL="$2"; shift 2 ;;
    --admin)   ADMIN_EMAIL="$2";        shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Validate ──────────────────────────────────────────────────
if [[ -z "$SLUG" || -z "$COUPLE_NAME" || -z "$WEDDING_DATE" || -z "$NOTIFICATION_EMAIL" || -z "$ADMIN_EMAIL" ]]; then
  echo "ERROR: All arguments are required."
  echo ""
  echo "Usage:"
  echo "  bash scripts/deploy-wedding.sh \\"
  echo "    --slug      bamai-kazah \\"
  echo "    --couple    \"Bamai & Kazah\" \\"
  echo "    --date      2026-04-11 \\"
  echo "    --email     you@gmail.com \\"
  echo "    --admin     admin@gmail.com"
  exit 1
fi

SUBDOMAIN="${SLUG}.${BASE_DOMAIN}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        Deploying wedding: $SLUG"
echo "║        Domain: $SUBDOMAIN"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Terraform deploy ──────────────────────────────────
echo "▶ [1/4] Deploying infrastructure..."

cd "$PROJECT_DIR/terraform"

terraform init -reconfigure \
  -backend-config="bucket=${TFSTATE_BUCKET}" \
  -backend-config="key=${SLUG}/terraform.tfstate" \
  -backend-config="region=${REGION}" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=wedding-photos-terraform-locks" \
  > /dev/null 2>&1

terraform apply -auto-approve \
  -var="project_name=wp-${SLUG}" \
  -var="couple_name=${COUPLE_NAME}" \
  -var="wedding_date=${WEDDING_DATE}" \
  -var="couple_email_1=${NOTIFICATION_EMAIL}" \
  -var="couple_email_2=${NOTIFICATION_EMAIL}" \
  -var="notification_email_from=${NOTIFICATION_EMAIL}" \
  -var="domain_name=${SUBDOMAIN}" \
  -var="certificate_arn=${CERT_ARN}" \
  -var="rekognition_collection_id=wedding-faces-${SLUG}"

# ── Capture outputs ───────────────────────────────────────────
CF_DOMAIN=$(terraform output -raw cloudfront_url | sed 's|https://||')
CF_ID=$(terraform output -raw cloudfront_distribution_id)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
POOL_ID=$(terraform output -raw cognito_user_pool_id)

echo "   ✓ Infrastructure deployed"
echo "   CloudFront: $CF_DOMAIN"

# ── Step 2: Verify SES ────────────────────────────────────────
echo ""
echo "▶ [2/4] Verifying SES email..."
aws ses verify-email-identity \
  --email-address "$NOTIFICATION_EMAIL" \
  --region "$REGION" 2>/dev/null || true
echo "   ✓ SES verification sent to $NOTIFICATION_EMAIL (click the link in your inbox)"

# ── Step 3: Build & deploy frontend ──────────────────────────
echo ""
echo "▶ [3/4] Building and deploying frontend..."

cd "$PROJECT_DIR/frontend"

cat > .env <<EOF
VITE_COGNITO_USER_POOL_ID=$(cd "$PROJECT_DIR/terraform" && terraform output -raw cognito_user_pool_id)
VITE_COGNITO_CLIENT_ID=$(cd "$PROJECT_DIR/terraform" && terraform output -raw cognito_user_pool_client_id)
VITE_AWS_REGION=${REGION}
VITE_API_URL=https://${SUBDOMAIN}
EOF

npm run build > /dev/null 2>&1

aws s3 sync build/ "s3://${FRONTEND_BUCKET}" --delete > /dev/null 2>&1
aws cloudfront create-invalidation \
  --distribution-id "$CF_ID" \
  --paths "/*" > /dev/null 2>&1

echo "   ✓ Frontend deployed"

# ── Step 4: Create admin user ─────────────────────────────────
echo ""
echo "▶ [4/4] Creating admin user..."

aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --temporary-password "$TEMP_PASS" \
  --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region "$REGION" > /dev/null 2>&1 \
  && echo "   ✓ Admin user created" \
  || echo "   ℹ Admin user already exists"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --group-name admins \
  --region "$REGION" > /dev/null 2>&1

echo "   ✓ Added to admins group"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  DEPLOYMENT COMPLETE                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Wedding:       $COUPLE_NAME"
echo "  App URL:       https://${SUBDOMAIN}"
echo "  Admin login:   https://${SUBDOMAIN}/admin-login"
echo "  Admin email:   $ADMIN_EMAIL"
echo "  Temp password: $TEMP_PASS"
echo ""
echo "  ⚠  DNS — Add this record at DomainKing:"
echo ""
echo "     Type:  CNAME"
echo "     Name:  $SLUG"
echo "     Value: $CF_DOMAIN"
echo ""
echo "  (App won't load until DNS record is added)"
echo ""
