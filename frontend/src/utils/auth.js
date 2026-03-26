/**
 * auth.js — Cognito authentication utilities
 *
 * Uses AWS Amplify to handle Cognito auth flows.
 * Amplify abstracts the complex OAuth/SRP handshake into simple JS calls.
 *
 * Configuration is read from environment variables set at build time:
 * REACT_APP_USER_POOL_ID and REACT_APP_USER_POOL_CLIENT_ID
 * (Terraform outputs these values after deployment)
 */

import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

// Amplify is configured once in main.jsx using VITE_COGNITO_USER_POOL_ID
// and VITE_COGNITO_CLIENT_ID. No configuration needed here.

/**
 * Derive a deterministic password from a phone number.
 * Guests never see or type this — it's generated behind the scenes.
 */
function guestPassword(phone) {
  const digits = phone.replace(/\D/g, '');
  return `Wed@${digits}#Bk26`;
}

/**
 * Register a new guest account (used internally / for admin registration).
 */
export async function registerGuest({ name, email, password }) {
  const result = await signUp({
    username: email,
    password,
    options: {
      userAttributes: { name, email },
    },
  });
  return result;
}

/**
 * Passwordless guest register-or-login.
 * Tries to register first; if the account already exists, logs in instead.
 * The guest only provides name + phone — no password visible to them.
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
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      return await signIn({ username: email, password });
    }
    throw err;
  }
}

/**
 * Login a returning guest by phone number only.
 * Derives the password the same way registration did.
 */
export async function loginWithPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  const email = digits.startsWith('0')
    ? `234${digits.slice(1)}@weddingguest.ng`
    : digits.startsWith('234')
    ? `${digits}@weddingguest.ng`
    : `${digits}@weddingguest.ng`;
  const password = guestPassword(phone);
  return signIn({ username: email, password });
}

/**
 * Confirm registration with the verification code from email.
 */
export async function confirmRegistration(email, code) {
  return confirmSignUp({ username: email, confirmationCode: code });
}

/**
 * Sign in with email and password.
 * Returns the Cognito sign-in result.
 */
export async function login(email, password) {
  return signIn({ username: email, password });
}

/**
 * Sign out the current user.
 */
export async function logout() {
  return signOut();
}

/**
 * Get the current authenticated user's info.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  try {
    return await amplifyGetCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Get the current JWT access token.
 * Attach this to API requests: Authorization: Bearer <token>
 * Amplify handles token refresh automatically.
 */
export async function getAccessToken() {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch {
    return null;
  }
}

/**
 * Check if a user is currently authenticated.
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}
