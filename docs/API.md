# API Reference

All endpoints are prefixed with your API Gateway URL (e.g. `https://abc123.execute-api.eu-west-1.amazonaws.com`).

Protected routes require: `Authorization: Bearer <jwt_access_token>`

---

## GET /health

Public health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-06-15T14:30:00Z"
}
```

---

## POST /upload

Upload a wedding photo. The image is stored in S3 and faces are indexed in Rekognition.

**Auth:** Required

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...",
  "contentType": "image/jpeg",
  "filename": "photo.jpg"
}
```

**Response:**
```json
{
  "message": "Photo uploaded successfully",
  "photoKey": "uploads/2025/06/15/abc123.jpg",
  "facesDetected": 3,
  "uploadedAt": "2025-06-15T14:30:00Z"
}
```

**Errors:**
- `400` — Missing image, invalid file type, invalid base64
- `413` — File too large (max 20MB)
- `401` — Not authenticated

---

## POST /search

Search for photos using a selfie. The selfie is NOT stored.

**Auth:** Required

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "photos": [
    {
      "photoKey": "uploads/2025/06/15/abc123.jpg",
      "url": "https://wedding-photos-prod.s3.amazonaws.com/uploads/...?X-Amz-Signature=...",
      "expiresAt": "2025-06-17T14:30:00Z"
    }
  ],
  "matchCount": 5,
  "searchedAt": "2025-06-15T15:00:00Z"
}
```

**Errors:**
- `400` — Missing image, no face detected in selfie
- `401` — Not authenticated

---

## GET /photos

List all photos uploaded by the authenticated user.

**Auth:** Required

**Response:**
```json
{
  "photos": [
    {
      "photoKey": "uploads/2025/06/15/abc123.jpg",
      "url": "https://...",
      "uploadedAt": "2025-06-15T14:30:00Z",
      "faceCount": 3,
      "isCouple": true
    }
  ],
  "count": 12
}
```

---

## POST /register-couple

Register a couple member's face for automatic detection. **Admin group required.**

**Auth:** Required (admin Cognito group)

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "contentType": "image/jpeg",
  "personName": "Sarah"
}
```

**Response:**
```json
{
  "message": "Successfully registered face for Sarah",
  "faceId": "1234abcd-...",
  "personName": "Sarah"
}
```

**Errors:**
- `422` — No face detected in the image (use a clear, front-facing photo)

---

## Authentication

This API uses Cognito JWT tokens.

**Login flow:**
1. Register at `POST /register` (handled by Cognito via Amplify SDK)
2. Confirm email with verification code
3. Sign in → receive `accessToken`
4. Attach to all requests: `Authorization: Bearer <accessToken>`

Tokens expire after 8 hours. The frontend handles refresh automatically via AWS Amplify.
