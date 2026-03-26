import axios from 'axios';
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

export { confirmSignIn };

// Same base URL pattern as api.js — avoids circular import
const _apiBase = import.meta.env.VITE_API_URL || '/api';

// ── Phone helpers ──────────────────────────────────────────────

/**
 * Normalize any Nigerian phone format to canonical digits.
 * "08012345678" and "+2348012345678" both → "2348012345678"
 */
function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '234' + digits.slice(1);
  return digits;
}

/**
 * Derive a deterministic password from a phone number.
 * Uses the normalized form so +234XXX and 0XXX produce the same password.
 * Guests never see or type this — generated behind the scenes.
 */
function guestPassword(phone) {
  return `Wed@${normalizePhone(phone)}#Bk26`;
}

/**
 * Convert a phone number to the synthetic Cognito email.
 */
function phoneToEmail(phone) {
  return `${normalizePhone(phone)}@weddingguest.ng`;
}

/**
 * Call the public /reset-guest-auth endpoint to migrate a legacy account's
 * password to the current derived password. Silent on failure.
 */
async function migrateLegacyGuest(phone) {
  try {
    await axios.post(`${_apiBase}/reset-guest-auth`, { phone });
  } catch (_) {
    // Ignore — subsequent signIn will show a clear error if migration also failed
  }
}

// ── Guest auth ─────────────────────────────────────────────────

/**
 * Register a new guest account (used internally / for admin registration).
 */
export async function registerGuest({ name, email, password }) {
  return signUp({
    username: email,
    password,
    options: { userAttributes: { name, email } },
  });
}

/**
 * Passwordless guest register-or-login.
 * - New user: registers with derived password → auto-confirmed → signs in.
 * - Returning user (new system): signs in directly with derived password.
 * - Legacy user (old password): auto-migrates via /reset-guest-auth → signs in.
 */
export async function registerOrLoginGuest({ name, email, phone }) {
  const password = guestPassword(phone);

  try {
    await signUp({
      username: email,
      password,
      options: { userAttributes: { name, email } },
    });
    // pre_signup Lambda auto-confirms — sign in immediately
    return await signIn({ username: email, password });
  } catch (signUpErr) {
    if (signUpErr.name === 'UsernameExistsException') {
      // Account already exists — try logging in
      try {
        return await signIn({ username: email, password });
      } catch (loginErr) {
        if (loginErr.name === 'NotAuthorizedException') {
          // Legacy user registered before passwordless system — migrate password
          await migrateLegacyGuest(phone);
          return await signIn({ username: email, password });
        }
        throw loginErr;
      }
    }
    throw signUpErr;
  }
}

/**
 * Login a returning guest by phone number only.
 * Derives the correct password and handles legacy accounts automatically.
 */
export async function loginWithPhone(phone) {
  const email = phoneToEmail(phone);
  const password = guestPassword(phone);
  try {
    return await signIn({ username: email, password });
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      // Could be legacy user with old password — try migration then retry once
      await migrateLegacyGuest(phone);
      try {
        return await signIn({ username: email, password });
      } catch (retryErr) {
        // If still NotAuthorized after migration, user likely doesn't exist
        throw retryErr;
      }
    }
    throw err;
  }
}

// ── Admin auth ─────────────────────────────────────────────────

/**
 * Sign in with email and password (admin login).
 */
export async function login(email, password) {
  return signIn({ username: email, password });
}

/**
 * Initiate admin password reset — sends a code to their email.
 */
export async function requestPasswordReset(email) {
  return resetPassword({ username: email });
}

/**
 * Confirm admin password reset with the emailed code.
 */
export async function confirmPasswordReset(email, code, newPassword) {
  return confirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

// ── Shared ─────────────────────────────────────────────────────

export async function logout() {
  return signOut();
}

export async function getCurrentUser() {
  try {
    return await amplifyGetCurrentUser();
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return (await getCurrentUser()) !== null;
}

export async function confirmRegistration(email, code) {
  return confirmSignUp({ username: email, confirmationCode: code });
}
