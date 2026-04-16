# Cherish — Wedding Day Companion Platform

> A fully serverless, AI-powered wedding event platform deployed on AWS. Handles guest photo sharing with facial recognition, digital event programmes, role-based ticketing, and multi-tier coordinator management — all under a custom domain, shipped for a live event.

**Live:** [bamai-kazah.pkweddings.com.ng](https://bamai-kazah.pkweddings.com.ng)

---

## What It Does

Cherish was built and deployed for a live Catholic wedding (450+ guests). It replaced paper programmes, printed photo albums, and manual check-in with a real-time mobile-first web application that guests could use directly from their phones — no app download required.

---

## Features

### Guest-Facing
| Feature | Description |
|---------|-------------|
| **AI Photo Matching** | Guest uploads a selfie → system searches every event photo using face recognition → returns every image they appear in |
| **Bulk Photo Upload** | Drag-and-drop upload with automatic face indexing via Rekognition |
| **Digital Programme** | Full ceremony guide: Mass timeline, order of reception, order of photographs, and all church readings (tabbed, mobile-optimised) |
| **Guest Tickets** | QR-code attendance tickets generated as downloadable PDFs with WhatsApp delivery notification |
| **Photo Gallery** | Browse the full event gallery |

### Staff & Admin
| Feature | Description |
|---------|-------------|
| **4-Tier RBAC** | Guest → Coordinator → Admin → Super Admin, enforced via Cognito Groups + JWT |
| **Coordinator Dashboard** | Ticket quota management with live usage tracking per coordinator |
| **Admin Dashboard** | Full guest list, manual ticket issuance, coordinator management |
| **QR Check-in** | Scan guest QR codes at the venue door using the device camera |
| **Email Notifications** | AWS SES triggers on registration, ticket issuance, and coordinator actions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, React Router v6 |
| Auth | AWS Cognito (User Pools + Groups) |
| API | AWS API Gateway (HTTP API) |
| Compute | AWS Lambda — Python 3.12 (7 functions) |
| AI / ML | AWS Rekognition (face detection, collection indexing, face search) |
| Storage | AWS S3 (photos + frontend static assets) |
| CDN | AWS CloudFront (edge delivery, SSL termination, custom domain) |
| Email | AWS SES (transactional notifications) |
| IaC | Terraform (fully parameterised, multi-event capable) |
| PDF | jsPDF + html2canvas (client-side ticket generation) |
| QR Codes | qrcode, html5-qrcode |

---

## Architecture

```
                        ┌──────────────────────────────┐
                        │     Browser (React 18 SPA)    │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │   CloudFront CDN (HTTPS)      │
                        │   custom domain + ACM cert    │
                        └──────┬───────────────┬────────┘
                               │               │
                    ┌──────────▼──┐     ┌──────▼──────────┐
                    │  S3 Bucket  │     │  API Gateway     │
                    │  (frontend) │     │  (HTTP API)      │
                    └─────────────┘     └──────┬──────────┘
                                               │
             ┌─────────────────────────────────┼────────────────────┐
             │                │                │                    │
     ┌───────▼──────┐ ┌───────▼──────┐ ┌──────▼───────┐ ┌─────────▼──────┐
     │upload_handler│ │search_handler│ │tickets_handler│ │coordinators_   │
     │              │ │              │ │               │ │handler         │
     │S3 + Rekognit.│ │Rekognition   │ │DynamoDB       │ │DynamoDB        │
     │face indexing │ │face search   │ │ticket store   │ │quota mgmt      │
     └──────────────┘ └──────────────┘ └───────────────┘ └────────────────┘
             │
     ┌───────▼──────────────────────────────────┐
     │  AWS Cognito User Pool                    │
     │  Groups: guests / coordinators /          │
     │          admins / superadmins             │
     └──────────────────────────────────────────┘
```

**Lambda Functions:**
- `upload_handler` — stores photos in S3, triggers Rekognition face indexing into a per-event collection
- `search_handler` — accepts a selfie, runs `SearchFacesByImage` against the collection, returns matched photo URLs
- `couple_detector` — indexes the couple's reference photos for gallery filtering
- `tickets_handler` — creates, retrieves, and validates QR-code attendance tickets
- `coordinators_handler` — manages coordinator accounts, quota assignments, and usage tracking
- `email_notifier` — SES-based transactional email on trigger events
- `pre_signup` — Cognito pre-signup trigger for the passwordless guest registration flow

---

## Infrastructure as Code

The entire AWS stack is defined in Terraform and fully parameterised for multi-event reuse. A single `terraform apply` provisions an isolated environment — separate Cognito pool, S3 bucket, Rekognition collection, and CloudFront distribution — with no shared state between events.

```bash
terraform apply \
  -var="project_name=wp-bamai-kazah" \
  -var="couple_name=Bamai & Kazah" \
  -var="wedding_date=2026-04-11" \
  -var="domain_name=bamai-kazah.pkweddings.com.ng" \
  -var="certificate_arn=arn:aws:acm:us-east-1:..."
```

---

## Deployment

```bash
# Full stack: infrastructure + frontend + admin user
bash scripts/deploy-wedding.sh \
  --slug    bamai-kazah \
  --couple  "Bamai & Kazah" \
  --date    2026-04-11 \
  --email   couple@example.com \
  --admin   admin@example.com

# Frontend-only redeploy
cd frontend && npm run build
aws s3 sync build/ s3://<frontend-bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

---

## Project Structure

```
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── pages/              # Home, Upload, Search, Gallery, Admin, Coordinator, Tickets
│       ├── components/         # Navbar, route guards
│       └── utils/              # Auth helpers, Axios API client
├── lambdas/                    # Python Lambda functions
│   ├── upload_handler/
│   ├── search_handler/
│   ├── tickets_handler/
│   ├── coordinators_handler/
│   ├── couple_detector/
│   ├── email_notifier/
│   └── pre_signup/
├── terraform/                  # Full AWS infrastructure as code
│   └── modules/
│       ├── cdn/                # CloudFront + S3 frontend
│       ├── api/                # API Gateway + Lambda integrations
│       ├── auth/               # Cognito User Pool + Groups
│       └── storage/            # S3 photo buckets + Rekognition collection
└── scripts/                    # Deployment automation
    ├── deploy-wedding.sh       # One-command full deployment
    └── setup-superadmins.sh   # Superadmin provisioning
```

---

## Highlights

- **Production-deployed** — used by 450+ guests at a live event on 11 April 2026
- **AI-powered photo retrieval** — sub-2s face search across hundreds of uploaded photos using AWS Rekognition
- **Fully serverless** — zero server management; scales automatically from zero to peak event traffic
- **One-command multi-tenant deployment** — each wedding gets a completely isolated AWS environment from a single Terraform configuration
- **4-tier RBAC** — Cognito Group-based access control with JWT inspection at the Lambda layer
- **Mobile-first** — designed for guests on phones, in church pews, with no app to download

---

## Author

Built by **Yerima Shettima** · [GitHub @Emmypat](https://github.com/Emmypat)
