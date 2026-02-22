# API Reference

All endpoints are prefixed with your API Gateway URL (available from `terraform output api_url`).

Protected endpoints require a Cognito JWT token:
```
Authorization: Bearer <access_token>
```

---

## GET /health

Public. Health check.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2025-06-15T12:00:00Z" }
```

---

## POST /upload

Upload a photo. Faces are automatically indexed.

**Auth:** Required

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "contentType": "image/jpeg",
  "filename": "photo.jpg"
}
```

**Response 200:**
```json
{
  "message": "Photo uploaded successfully",
  "photoKey": "uploads/2025/06/15/abc123.jpg",
  "facesDetected": 3,
  "uploadedAt": "2025-06-15T14:30:00Z"
}
```

**Errors:**
- `400` — Missing image, invalid file type, or invalid base64
- `413` — File exceeds 20MB limit
- `401` — Not authenticated

---

## POST /search

Find all photos containing a face from a selfie.

**Auth:** Required

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "contentType": "image/jpeg"
}
```

**Response 200:**
```json
{
  "photos": [
    {
      "photoKey": "uploads/2025/06/15/abc123.jpg",
      "url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
      "expiresAt": "2025-06-17T14:30:00Z"
    }
  ],
  "matchCount": 5,
  "searchedAt": "2025-06-15T15:00:00Z"
}
```

> **Privacy:** The selfie is never stored or indexed. It's used in-memory only for the search.

---

## GET /photos

List all photos uploaded by the authenticated user.

**Auth:** Required

**Response 200:**
```json
{
  "photos": [
    {
      "photoKey": "uploads/2025/06/15/abc123.jpg",
      "url": "https://s3.amazonaws.com/...",
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

Register a couple member's face for auto-detection.

**Auth:** Required (Admin group)

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "contentType": "image/jpeg",
  "personName": "Sarah"
}
```

**Response 200:**
```json
{
  "message": "Successfully registered face for Sarah",
  "faceId": "abc123-def456-...",
  "personName": "Sarah"
}
```

**Errors:**
- `422` — No face detected in the image
