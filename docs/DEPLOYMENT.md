# Deployment Guide

Step-by-step instructions to deploy the Wedding Photo Platform to AWS.

## Prerequisites

Install these tools on your machine:

```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install

# Terraform
# Download from: https://developer.hashicorp.com/terraform/downloads

# Node.js (for frontend)
# Download from: https://nodejs.org (v18+)

# Python 3.11 (for local Lambda testing)
# Download from: https://python.org
```

---

## Step 1 — Configure AWS CLI

```bash
aws configure
# Enter:
# AWS Access Key ID: (from IAM user)
# AWS Secret Access Key: (from IAM user)
# Default region: eu-west-1
# Default output format: json
```

**IAM permissions needed:**
- AmazonS3FullAccess
- AmazonDynamoDBFullAccess
- AWSLambda_FullAccess
- AmazonAPIGatewayAdministrator
- AmazonRekognitionFullAccess
- AmazonCognitoPowerUser
- CloudFrontFullAccess
- AmazonSNSFullAccess
- AmazonSESFullAccess
- IAMFullAccess
- CloudWatchLogsFullAccess

---

## Step 2 — Bootstrap Terraform State

Create the S3 bucket and DynamoDB table for Terraform state storage.
Run these commands ONCE before `terraform init`:

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket wedding-photos-terraform-state \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket wedding-photos-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name wedding-photos-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

> **Alternative:** Comment out the `backend "s3"` block in `terraform/backend.tf` to use local state (simpler for solo development, but don't lose the `.tfstate` file!).

---

## Step 3 — Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Fill in your values
```

Key values to set:
- `couple_name` — e.g. `"Sarah & James"`
- `wedding_date` — e.g. `"2025-06-15"`
- `couple_email_1` / `couple_email_2`
- `notification_email_from` — must be verified in SES

---

## Step 4 — Deploy Infrastructure

```bash
cd terraform

# Initialise: downloads providers and modules
terraform init

# Preview changes (always review before applying!)
terraform plan

# Deploy! (~5-10 minutes)
terraform apply
```

Note the outputs after apply — you'll need these URLs.

---

## Step 5 — Verify SES Email

Before SES can send emails, verify your sender address:

1. Go to **AWS Console → SES → Verified identities**
2. Click **Create identity**
3. Select **Email address**, enter your `notification_email_from`
4. Check your email and click the verification link

> **SES Sandbox:** By default, SES can only send to verified addresses. To send to all guests, submit a **Production Access** request: AWS Console → SES → Account dashboard → Request production access.

---

## Step 6 — Build & Deploy Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment config from Terraform outputs
cp .env.example .env.local
# Edit .env.local with values from `terraform output`

# Build for production
npm run build

# Deploy to S3
aws s3 sync build/ s3://$(cd ../terraform && terraform output -raw frontend_bucket_name)

# Invalidate CloudFront cache (so new files are served immediately)
aws cloudfront create-invalidation \
  --distribution-id $(cd ../terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

---

## Step 7 — Create Admin User

Create an admin account for the couple/photographer:

```bash
USER_POOL_ID=$(cd terraform && terraform output -raw cognito_user_pool_id)

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@yourwedding.com \
  --user-attributes Name=email,Value=admin@yourwedding.com Name=name,Value="Wedding Admin" \
  --temporary-password "Temp1234!" \
  --message-action SUPPRESS

# Add to admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@yourwedding.com \
  --group-name admins
```

---

## Step 8 — Register Couple Faces

1. Log into the platform with your admin account
2. Call the `/register-couple` API endpoint with a clear photo of each partner:

```bash
API_URL=$(cd terraform && terraform output -raw api_url)
TOKEN="<your-jwt-token-from-login>"

# Register Partner 1
curl -X POST "$API_URL/register-couple" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<base64-encoded-photo>",
    "contentType": "image/jpeg",
    "personName": "Sarah"
  }'

# Register Partner 2 (same process)
```

See `docs/API.md` for full API reference.

---

## Step 9 — Test

1. Open your CloudFront URL (from `terraform output cloudfront_url`)
2. Register a guest account
3. Upload a test photo
4. Try the selfie search
5. Register couple faces and verify the email notification flow

---

## Teardown (After the Wedding)

When you no longer need the platform:

```bash
cd terraform

# ⚠️ This deletes EVERYTHING including photos!
# Make sure all guests have downloaded their photos first.
terraform destroy
```
