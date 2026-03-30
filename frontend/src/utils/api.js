/**
 * api.js — API utility functions
 *
 * All API calls go through CloudFront to /api/*
 * CloudFront proxies /api/* to API Gateway.
 * This means the frontend only needs ONE base URL.
 *
 * Every protected request includes the Cognito JWT token
 * in the Authorization header.
 */

import axios from 'axios';
import { getAccessToken } from './auth';

// Base URL: /api routes via CloudFront → API Gateway (prefix stripped by CF Function)
// Override with VITE_API_URL in .env to call API Gateway directly during development
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Create an axios instance with the auth token automatically attached.
 */
async function getAuthHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Upload a photo to the platform.
 *
 * @param {File} file — The photo File object from the file input
 * @param {Function} onProgress — Progress callback (0-100)
 * @returns {Promise<{photoKey, facesDetected, uploadedAt}>}
 */
export async function uploadPhoto(file, onProgress) {
  const headers = await getAuthHeaders();

  // Convert file to base64
  const base64 = await fileToBase64(file);

  const response = await axios.post(
    `${BASE_URL}/upload`,
    {
      image: base64,
      contentType: file.type,
      filename: file.name,
    },
    {
      headers: { ...headers, 'Content-Type': 'application/json' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }
  );

  return response.data;
}

/**
 * Search for photos by selfie.
 *
 * @param {File} selfieFile — The selfie image File object
 * @returns {Promise<{photos: Array, matchCount: number}>}
 */
export async function searchByFace(selfieFile) {
  const headers = await getAuthHeaders();
  const base64 = await fileToBase64(selfieFile);

  const response = await axios.post(
    `${BASE_URL}/search`,
    { image: base64, contentType: selfieFile.type },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  return response.data;
}

/**
 * Get all photos uploaded by the current user.
 *
 * @returns {Promise<{photos: Array, count: number}>}
 */
export async function getMyPhotos() {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE_URL}/photos`, { headers });
  return response.data;
}

/**
 * Register couple faces (admin only).
 *
 * @param {File} imageFile — Clear photo of one couple member
 * @param {string} personName — Name of the person (e.g. "Sarah")
 */
export async function registerCoupleFace(imageFile, personName) {
  const headers = await getAuthHeaders();
  const base64 = await fileToBase64(imageFile);

  const response = await axios.post(
    `${BASE_URL}/register-couple`,
    { image: base64, contentType: imageFile.type, personName },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  return response.data;
}

/**
 * Create an attendance ticket (guest submits name + phone + selfie).
 */
export async function createTicket({ selfieFile, guestName, phone }) {
  const headers = await getAuthHeaders();
  const base64 = await fileToBase64(selfieFile);

  const response = await axios.post(
    `${BASE_URL}/tickets`,
    { selfieImage: base64, contentType: selfieFile.type, guestName, phone },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Get all ticket requests (admin only).
 */
export async function getTickets() {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE_URL}/tickets`, { headers });
  return response.data;
}

/**
 * Approve or reject a ticket (admin only).
 * @param {string} ticketId
 * @param {'approved' | 'rejected'} status
 */
export async function updateTicketStatus(ticketId, status) {
  const headers = await getAuthHeaders();
  const response = await axios.put(
    `${BASE_URL}/tickets/${ticketId}`,
    { status },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Get a single ticket by ID (admin only — returns selfieUrl + checkedIn fields).
 */
export async function getTicketById(ticketId) {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE_URL}/tickets/${ticketId}`, { headers });
  return response.data;
}

/**
 * Mark a ticket as checked-in at the venue (admin only).
 * Returns { checkedIn, checkedInAt } or { alreadyCheckedIn, checkedInAt }.
 */
export async function checkinTicket(ticketId) {
  const headers = await getAuthHeaders();
  const response = await axios.put(
    `${BASE_URL}/tickets/${ticketId}`,
    { checkin: true },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Get a ticket by ID without authentication (public page).
 * Returns safe public fields only: ticketId, guestName, status, dates.
 */
export async function getPublicTicket(ticketId) {
  const response = await axios.get(`${BASE_URL}/tickets/${ticketId}/view`);
  return response.data;
}

/**
 * Look up a ticket by phone number (public, no auth).
 * @param {string} phone — Nigerian phone number in any format
 */
export async function getMyTicketByPhone(phone) {
  const response = await axios.get(`${BASE_URL}/my-ticket`, { params: { phone } });
  return response.data;
}

/**
 * Delete a rejected ticket (admin only).
 * @param {string} ticketId
 */
export async function deleteTicket(ticketId) {
  const headers = await getAuthHeaders();
  const response = await axios.delete(`${BASE_URL}/tickets/${ticketId}`, { headers });
  return response.data;
}

/**
 * Health check — test if the API is reachable.
 */
export async function healthCheck() {
  const response = await axios.get(`${BASE_URL}/health`);
  return response.data;
}

/**
 * Revoke a ticket back to pending (admin only).
 */
export async function revokeTicket(ticketId) {
  const headers = await getAuthHeaders();
  const response = await axios.put(
    `${BASE_URL}/tickets/${ticketId}`,
    { status: 'pending' },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * List all pre-approved phone records (admin only).
 */
export async function getPreapprovedPhones() {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE_URL}/tickets/preapproved`, { headers });
  return response.data;
}

/**
 * Add one or more pre-approved phones (admin only).
 * @param {string[]} phones — Array of phone numbers
 * @param {string[]} guestNames — Matching guest names (optional)
 */
export async function addPreapprovedPhones(phones, guestNames = []) {
  const headers = await getAuthHeaders();
  const response = await axios.post(
    `${BASE_URL}/tickets/preapprove`,
    { phones, guestNames },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Remove a pre-approved phone record by ID (admin only).
 */
export async function removePreapprovedPhone(id) {
  const headers = await getAuthHeaders();
  const response = await axios.delete(`${BASE_URL}/tickets/preapprove/${id}`, { headers });
  return response.data;
}

/**
 * Export all tickets as CSV (admin only).
 * Returns the raw CSV string.
 */
export async function exportTicketsCSV() {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE_URL}/tickets/export`, {
    headers,
    responseType: 'text',
  });
  return response.data;
}

/**
 * Admin issues a ticket directly on behalf of a guest.
 * Ticket is immediately approved.
 * @param {object} opts
 * @param {string} opts.guestName
 * @param {string} [opts.phone]
 * @param {File}   [opts.selfieFile] — optional selfie; default image used if omitted
 */
export async function issueTicket({ guestName, phone = '', selfieFile = null }) {
  const headers = await getAuthHeaders();
  let selfieImage = null;
  let contentType = 'image/jpeg';
  if (selfieFile) {
    selfieImage = await fileToBase64(selfieFile);
    contentType = selfieFile.type;
  }
  const response = await axios.post(
    `${BASE_URL}/tickets/issue`,
    { guestName, phone, selfieImage, contentType },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Upload the default ticket image (admin only).
 * Used when admin-issued tickets have no selfie.
 * @param {File} imageFile
 */
export async function setDefaultTicketImage(imageFile) {
  const headers = await getAuthHeaders();
  const image = await fileToBase64(imageFile);
  const response = await axios.put(
    `${BASE_URL}/tickets/default-image`,
    { image, contentType: imageFile.type },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/**
 * Convert a File object to base64 string.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}
