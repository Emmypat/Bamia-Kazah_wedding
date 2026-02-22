# 💒 Wedding Photo Sharing Platform

> A serverless, AI-powered platform for sharing and retrieving wedding photos — built on AWS with Terraform.

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC)](https://terraform.io)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 🌟 Features

- **📸 Guest Photo Upload** — Upload photos from any device, with drag-and-drop or camera capture
- **🤳 Selfie-Based Retrieval** — Find every photo you appear in using facial recognition
- **💌 Couple Auto-Notifications** — All guests receive an email when a couple photo is detected
- **🔐 Secure & Private** — JWT auth via Cognito; photos accessed only via time-limited presigned URLs
- **☁️ Fully Serverless** — No servers to manage; scales from 1 to 1,000 concurrent guests
- **💰 Cost-Efficient** — Estimated cost for a 100-person wedding: **under $5 total**

---

## 🏗️ Architecture

```
Guests (Mobile Browser)
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │              CloudFront CDN                 │
 │  (HTTPS, edge caching, SPA routing)         │
 └──────────┬──────────────────────────────────┘
            │                    │
     /api/* │              /* (frontend) │
            ▼                    ▼
  ┌─────────────────┐   ┌─────────────────┐
  │  API Gateway v2 │   │  S3 (Frontend)  │
  │  (HTTP API)     │   │  React Build    │
  └────────┬────────┘   └─────────────────┘
           │
    ┌──────┴──────────────────────────┐
    │         Lambda Functions        │
    │                                 │
    │  ┌─────────────────────────┐    │
    │  │   upload_handler        │    │
    │  │   POST /upload          │    │
    │  └────────────┬────────────┘    │
    │               │                 │
    │  ┌─────────────────────────┐    │
    │  │   search_handler        │    │
    │  │   POST /search          │    │
    │  └────────────┬────────────┘    │
    │               │                 │
    │  ┌─────────────────────────┐    │
    │  │   couple_detector       │◄───┤─── S3 Event (ObjectCreated)
    │  │   (S3-triggered)        │    │
    │  └────────────┬────────────┘    │
    │               │ SNS             │
    │  ┌─────────────────────────┐    │
    │  │   email_notifier        │    │
    │  │   (SNS-triggered)       │    │
    │  └─────────────────────────┘    │
    └─────────────────────────────────┘
           │           │         │
           ▼           ▼         ▼
      ┌─────────┐ ┌─────────┐ ┌──────────────┐
      │   S3    │ │DynamoDB │ │ Rekognition  │
      │ (Photos)│ │(Metadata│ │(Face Collection│
      └─────────┘ └─────────┘ └──────────────┘
```

### Data Flow

**Photo Upload:**
```
Guest → POST /upload → Lambda → S3 (store) → Rekognition (IndexFaces) → DynamoDB (faceId→photoKey)
                                           → S3 Event → couple_detector → SNS → email_notifier → SES
```

**Selfie Search:**
```
Guest → POST /search → Lambda → Rekognition (SearchFacesByImage) → DynamoDB (faceId→photoKey)
                             → S3 (GeneratePresignedUrl) → Return URLs to guest
```

---

## 🛠️ Tech Stack

| Layer | Service | Why |
|---|---|---|
| **CDN** | CloudFront | Global edge delivery, HTTPS, SPA routing |
| **Auth** | Cognito | Managed JWT auth, free up to 50k MAUs |
| **API** | API Gateway v2 | HTTP API, 70% cheaper than REST API |
| **Compute** | Lambda (Python 3.11) | Event-driven, pay-per-request |
| **AI** | Rekognition | Managed face detection & matching |
| **Database** | DynamoDB | Serverless, fast lookups, pay-per-request |
| **Storage** | S3 | Durable photo storage, presigned URLs |
| **Email** | SES | Cost-effective transactional email |
| **Messaging** | SNS | Decoupled event-driven notifications |
| **IaC** | Terraform | Reproducible, documented infrastructure |
| **Frontend** | React 18 + Vite | Fast, mobile-friendly SPA |

---

## 📁 Project Structure

```
wedding-photo-platform/
├── terraform/
│   ├── main.tf              # Root module — wires everything together
│   ├── variables.tf         # All configurable inputs
│   ├── outputs.tf           # Post-deploy URLs and IDs
│   ├── providers.tf         # AWS provider config
│   ├── backend.tf           # S3 state backend
│   ├── terraform.tfvars.example
│   └── modules/
│       ├── storage/         # S3 buckets
│       ├── database/        # DynamoDB tables
│       ├── rekognition/     # Face collection
│       ├── auth/            # Cognito user pool
│       ├── lambdas/         # Lambda functions + IAM
│       ├── api/             # API Gateway routes
│       ├── cdn/             # CloudFront distribution
│       └── notifications/   # SNS + SES
├── lambdas/
│   ├── upload_handler/      # Photo upload + face indexing
│   ├── search_handler/      # Selfie search
│   ├── couple_detector/     # Couple face detection (S3-triggered)
│   └── email_notifier/      # Guest email sending (SNS-triggered)
├── frontend/
│   ├── src/
│   │   ├── pages/           # Home, Upload, Search, Gallery, Register, Login
│   │   ├── components/      # Navbar
│   │   └── utils/           # API client, auth helpers
│   └── public/
└── docs/
    ├── ARCHITECTURE.md      # Detailed design decisions
    ├── DEPLOYMENT.md        # Step-by-step deployment guide
    └── API.md               # Full API reference
```

---

## 🚀 Quick Start

### Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate permissions
- [Terraform](https://terraform.io/downloads) >= 1.5
- [Node.js](https://nodejs.org) >= 18 (for frontend)
- [Python 3.11](https://python.org) (for local Lambda testing)

### Deploy in 5 Steps

```bash
# 1. Clone and configure
git clone https://github.com/Emmypat/wedding-photo-platform
cd wedding-photo-platform/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 2. Bootstrap Terraform state (run once)
aws s3api create-bucket --bucket my-tf-state-bucket --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1
# (See docs/DEPLOYMENT.md for full bootstrap commands)

# 3. Deploy infrastructure
terraform init
terraform plan
terraform apply

# 4. Deploy frontend
cd ../frontend
cp .env.example .env
# Fill in .env from terraform outputs
npm install && npm run build
aws s3 sync build/ s3://$(terraform -chdir=../terraform output -raw frontend_bucket_name)
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=../terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# 5. Post-deploy setup (see docs/DEPLOYMENT.md)
# - Verify SES sender email
# - Register couple faces via API
# - Share the CloudFront URL with guests!
```

---

## 💰 Cost Estimate

For a typical 100-guest wedding with ~500 photos:

| Service | Usage | Estimated Cost |
|---|---|---|
| Lambda | ~2,000 invocations | ~$0.00 (free tier) |
| Rekognition | ~1,000 face operations | ~$1.00 |
| DynamoDB | ~5,000 read/writes | ~$0.01 |
| S3 | 500 photos (~5GB) | ~$0.12/month |
| SES | ~500 emails | ~$0.05 |
| CloudFront | ~10GB transfer | ~$0.85 |
| API Gateway | ~3,000 requests | ~$0.01 |
| **Total** | | **~$2–5** |

---

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) — Design decisions and data flows
- [Deployment Guide](docs/DEPLOYMENT.md) — Step-by-step setup
- [API Reference](docs/API.md) — All endpoints with examples

---

## 🔒 Security Notes

- Guest selfies are **never stored** — used only for in-memory Rekognition search
- All photos are **private** — accessed only via time-limited presigned S3 URLs
- API routes are protected with **Cognito JWT** authentication
- CloudFront enforces **HTTPS** for all traffic
- S3 buckets have **public access blocked** — no direct S3 access
- Terraform state is **encrypted at rest** in S3

---

## 📄 License

MIT — use freely for personal and commercial projects.

---

*Built with ❤️ as a portfolio project — a real system for a real wedding.*
