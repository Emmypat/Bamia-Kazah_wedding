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
 * Register a new guest account.
 * Cognito will send a verification email automatically.
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
