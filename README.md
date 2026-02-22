# 💒 Wedding Photo Platform

> **Serverless AI-Powered Wedding Photo Sharing & Retrieval Platform on AWS**

A fully serverless platform that lets wedding guests upload photos, find every photo they appear in using a selfie, and automatically receive curated couple photos — all powered by AWS Rekognition facial recognition.

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC)](https://terraform.io)
[![Python](https://img.shields.io/badge/Lambda-Python_3.11-blue)](https://python.org)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB)](https://react.dev)

---

## 📸 What It Does

| Feature | How |
|---|---|
| Guest photo upload | Mobile-friendly drag & drop or camera capture |
| AI face search | Upload a selfie → find every photo you're in |
| Couple photo alerts | Auto-email all guests when the couple appears in a new photo |
| Secure downloads | Time-limited presigned S3 URLs |
| Guest auth | Cognito email/password registration |

---

## 🏗️ Architecture

```
Guests (mobile browser)
        │
        ▼
  CloudFront CDN  ◄── Serves frontend + proxies /api/*
        │
   ┌────┴────────────────────────┐
   │                             │
S3 Frontend Bucket        API Gateway (HTTP API)
   (React app)                   │
                          ┌──────┴──────────────────────┐
                          │                             │
                   POST /upload                   POST /search
                          │                             │
                   upload_handler               search_handler
                   Lambda                       Lambda
                          │                             │
                          ▼                             ▼
                   S3 Photos Bucket         Rekognition SearchFacesByImage
                          │                             │
                          ▼                             ▼
                   Rekognition              DynamoDB faces table
                   IndexFaces              → presigned S3 URLs
                          │
                          ▼ (S3 trigger, async)
                   couple_detector Lambda
                          │
                          ▼ (if couple found)
                   SNS Topic
                          │
                          ▼
                   email_notifier Lambda
                          │
                          ▼
                   SES → Guest emails
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Infrastructure | Terraform | Reproducible, version-controlled IaC |
| Compute | AWS Lambda (Python 3.11) | Serverless, pay-per-use |
| Storage | Amazon S3 | Durable, cheap object storage |
| AI/ML | AWS Rekognition | Managed facial recognition, no ML expertise needed |
| Database | Amazon DynamoDB | Serverless NoSQL, fast face lookups |
| API | API Gateway v2 (HTTP API) | ~70% cheaper than REST API |
| Auth | Amazon Cognito | Managed user authentication |
| CDN | Amazon CloudFront | Global edge delivery, HTTPS |
| Notifications | Amazon SNS + SES | Decoupled email pipeline |
| Frontend | React 18 + React Router | Component-based, SPA routing |

---

## 📁 Project Structure

```
wedding-photo-platform/
├── terraform/                  # All infrastructure as code
│   ├── main.tf                 # Root module (wires everything together)
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Important URLs & IDs after deploy
│   ├── providers.tf            # AWS provider config
│   ├── backend.tf              # S3 remote state config
│   └── modules/
│       ├── storage/            # S3 buckets
│       ├── database/           # DynamoDB tables
│       ├── rekognition/        # Face collection
│       ├── auth/               # Cognito user pool
│       ├── lambdas/            # Lambda functions + IAM
│       ├── api/                # API Gateway routes
│       ├── cdn/                # CloudFront distribution
│       └── notifications/      # SNS + SES
├── lambdas/
│   ├── upload_handler/         # Photo upload + face indexing
│   ├── search_handler/         # Selfie face search
│   ├── couple_detector/        # Couple presence detection
│   └── email_notifier/         # Guest email notifications
├── frontend/
│   └── src/
│       ├── pages/              # Home, Register, Upload, Search, Gallery
│       ├── components/         # Navbar
│       └── utils/              # API calls, auth helpers
└── docs/
    ├── DEPLOYMENT.md           # Step-by-step setup guide
    └── API.md                  # API reference
```

---

## 🚀 Quick Start

**Prerequisites:** AWS CLI, Terraform ≥1.5, Node.js ≥18, Python 3.11

```bash
# 1. Clone the repo
git clone https://github.com/Emmypat/wedding-photo-platform.git
cd wedding-photo-platform

# 2. Configure Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 3. Deploy infrastructure
terraform init
terraform plan
terraform apply

# 4. Deploy frontend
cd ../frontend
npm install
cp .env.example .env.local
# Fill .env.local with values from `terraform output`
npm run build
aws s3 sync build/ s3://$(cd ../terraform && terraform output -raw frontend_bucket_name)
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the complete step-by-step guide.

---

## 💰 Estimated Cost

For a typical 100-person wedding with ~500 photos:

| Service | Estimated Cost |
|---|---|
| Lambda invocations | ~$0.00 (within free tier) |
| S3 storage (500 photos @ 5MB avg) | ~$0.13/month |
| Rekognition (face indexing + search) | ~$1.00 total |
| API Gateway | ~$0.01 |
| CloudFront | ~$0.01 |
| DynamoDB | ~$0.00 (PAY_PER_REQUEST, free tier) |
| SES emails (500 guests × 5 alerts) | ~$0.00 (within free tier) |
| **Total** | **~$1.25 for the whole event** |

---

## 🔒 Security

- All S3 buckets are **private** — no public access
- Photos served via **time-limited presigned URLs** (48h by default)
- API Gateway requires **Cognito JWT auth** on all routes except `/health`
- **Selfies are never stored** — used in-memory for search only
- All data encrypted at rest (S3 SSE-S3, DynamoDB SSE)
- CloudFront enforces **HTTPS-only** (HTTP → HTTPS redirect)

---

## 📖 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Reference](docs/API.md)

---

## 🌟 Portfolio Notes

This project demonstrates:
- **Serverless architecture** on AWS with zero server management
- **Event-driven design** (S3 → Lambda → SNS → Lambda pipeline)
- **AI/ML integration** (AWS Rekognition facial recognition)
- **Infrastructure as Code** with Terraform modules and best practices
- **Security best practices** (least-privilege IAM, private S3, JWT auth)
- **Cost-optimised design** (PAY_PER_REQUEST DynamoDB, lifecycle rules, reserved concurrency)
- **Modern React** frontend with mobile-first design

---

*Built with ❤️ and a lot of serverless magic.*
