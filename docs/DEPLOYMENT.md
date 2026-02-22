# Deployment Guide

Step-by-step guide to deploy the Wedding Photo Platform on AWS.

---

## Prerequisites

Install these tools before starting:

| Tool | Version | Install |
|---|---|---|
| AWS CLI | >= 2.x | https://aws.amazon.com/cli/ |
| Terraform | >= 1.5 | https://terraform.io/downloads |
| Node.js | >= 18 | https://nodejs.org |
| Python | >= 3.11 | https://python.org |

### Configure AWS CLI

```bash
aws configure
# Enter: AWS Access Key ID, Secret Key, Region (eu-west-1), Output (json)
```

Your IAM user needs these permissions:
- `AmazonS3FullAccess`
- `AmazonDynamoDBFullAccess`
- `AWSLambdaFullAccess`
- `AmazonAPIGatewayAdministrator`
- `CloudFrontFullAccess`
- `AmazonCognitoPowerUser`
- `AmazonRekognitionFullAccess`
- `AmazonSESFullAccess`
- `AmazonSNSFullAccess`
- `IAMFullAccess`

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/Emmypat/wedding-photo-platform
cd wedding-photo-platform
```

---

## Step 2: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # or use any editor
```

Fill in at minimum:
- `couple_email_1` and `couple_email_2`
- `notification_email_from` (the sender email)
- `couple_name` and `wedding_date`

---

## Step 3: Bootstrap Terraform State Backend

Run these commands **once** before `terraform init`:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket wedding-photos-terraform-state \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Enable versioning (protects state file history)
aws s3api put-bucket-versioning \
  --bucket wedding-photos-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket wedding-photos-terraform-state \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name wedding-photos-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

> **Note:** If you just want to get started quickly, comment out the `backend` block in `terraform/backend.tf` to use local state instead.

---

## Step 4: Deploy Infrastructure

```bash
cd terraform

# Initialise Terraform (downloads providers, configures backend)
terraform init

# Preview what will be created (safe, no changes)
terraform plan

# Deploy! (~5-10 minutes)
terraform apply
# Type 'yes' when prompted

# Save the outputs — you'll need them for frontend config
terraform output
```

Note the outputs:
- `cloudfront_url` — share this with guests
- `api_url` — API Gateway URL
- `cognito_user_pool_id`
- `cognito_user_pool_client_id`
- `frontend_bucket_name`
- `cloudfront_distribution_id`

---

## Step 5: Verify SES Email

1. Go to AWS Console → **SES** → **Verified identities**
2. Click **Create identity** → **Email address**
3. Enter your `notification_email_from` address
4. Check your email and click the verification link

> **Sandbox mode:** By default, SES can only send to verified emails. To send to all guests, go to: **SES → Account dashboard → Request production access**

---

## Step 6: Build & Deploy Frontend

```bash
cd ../frontend

# Copy and configure environment
cp .env.example .env
# Edit .env with values from terraform output:
#   VITE_API_URL = the api_url output
#   VITE_COGNITO_USER_POOL_ID = cognito_user_pool_id output
#   VITE_COGNITO_CLIENT_ID = cognito_user_pool_client_id output

# Install dependencies and build
npm install
npm run build

# Deploy to S3
BUCKET=$(cd ../terraform && terraform output -raw frontend_bucket_name)
aws s3 sync build/ s3://$BUCKET --delete

# Invalidate CloudFront cache so guests get the new version
DIST_ID=$(cd ../terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

---

## Step 7: Register Couple Faces

This step tells the AI which faces belong to the couple.

```bash
# First, create an admin user in Cognito
USER_POOL=$(cd terraform && terraform output -raw cognito_user_pool_id)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL \
  --username admin@youremail.com \
  --user-attributes Name=email,Value=admin@youremail.com Name=name,Value=Admin \
  --temporary-password TempPass123!

# Set a permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL \
  --username admin@youremail.com \
  --password YourPermanentPassword123! \
  --permanent

# Add to admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL \
  --username admin@youremail.com \
  --group-name admins
```

Then use the `/register-couple` API endpoint (see docs/API.md) to upload a clear photo of each couple member.

---

## Step 8: Test the Platform

```bash
# Health check
curl $(cd terraform && terraform output -raw api_url)/health

# Expected: {"status": "ok", "timestamp": "..."}
```

Then:
1. Visit the CloudFront URL in your browser
2. Register a guest account
3. Upload a test photo
4. Use search with a selfie

---

## Updating the Platform

To update Lambda code after changes:

```bash
cd terraform
terraform apply  # Re-zips and deploys Lambda code automatically
```

To update frontend:
```bash
cd frontend
npm run build
aws s3 sync build/ s3://YOUR_BUCKET --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Teardown

To destroy all AWS resources (⚠️ this deletes all photos!):

```bash
cd terraform
terraform destroy
```
