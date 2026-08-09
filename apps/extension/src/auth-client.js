import { FITLOOM_SUPABASE_ANON_KEY, FITLOOM_SUPABASE_URL } from './config.js';

/**
 * Supabase GoTrue talks to the popup directly, the same way the web app's browser
 * client does. Passwords never reach the FitLoom API, which only ever sees the
 * resulting bearer token and re-verifies it server-side.
 */
const authEndpoint = (path) => `${FITLOOM_SUPABASE_URL}/auth/v1/${path}`;

const authHeaders = (accessToken) => {
  const headers = {
    apikey: FITLOOM_SUPABASE_ANON_KEY,
    'content-type': 'application/json',
  };
  if (accessToken !== undefined) headers.authorization = `Bearer ${accessToken}`;
  return headers;
};

const isConfigured = () =>
  FITLOOM_SUPABASE_URL.startsWith('https://') && !FITLOOM_SUPABASE_URL.includes('your-project');

/** GoTrue has used three different error shapes across versions; try all of them. */
const readErrorMessage = (payload, fallback) => {
  if (payload === null || typeof payload !== 'object') return fallback;
  const message = payload.error_description ?? payload.msg ?? payload.message ?? payload.error;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
};

const postAuth = async (path, body, { accessToken, fallbackMessage } = {}) => {
  if (!isConfigured()) {
    throw { code: 'AUTH_NOT_CONFIGURED', message: 'FitLoom sign-in is not configured. Set the Supabase values in src/config.js.' };
  }

  let response;

  try {
    response = await fetch(authEndpoint(path), {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    throw { code: 'NETWORK_ERROR', message: 'FitLoom could not reach the sign-in service. Check your connection and try again.' };
  }

  if (response.status === 204) return null;

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw { code: 'AUTH_FAILED', message: readErrorMessage(payload, fallbackMessage ?? 'Sign-in failed. Try again.') };
  }

  return payload;
};

/**
 * A GoTrue session only carries `expires_in`, so the absolute expiry is computed
 * here. The popup refreshes slightly early to avoid racing a request against it.
 */
const toSession = (payload) => {
  if (payload === null || typeof payload.access_token !== 'string') return null;

  const expiresInSeconds = Number(payload.expires_in);
  const lifetimeMs = Number.isFinite(expiresInSeconds) ? expiresInSeconds * 1000 : 3600 * 1000;

  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : '',
    expiresAt: Date.now() + lifetimeMs,
    email: payload.user?.email ?? '',
  };
};

export const signIn = async ({ email, password }) => {
  const payload = await postAuth('token?grant_type=password', { email, password }, {
    fallbackMessage: 'Sign in failed. Check your email and password.',
  });

  const session = toSession(payload);
  if (session === null) {
    throw { code: 'AUTH_FAILED', message: 'Sign in failed. Check your email and password.' };
  }
  return session;
};

/**
 * When the Supabase project requires email confirmation, signup succeeds without
 * returning a session. That is reported as a pending state rather than an error
 * so the popup can tell the user to confirm before signing in.
 */
export const signUp = async ({ email, password }) => {
  const payload = await postAuth('signup', { email, password }, {
    fallbackMessage: 'Sign up failed. Use a valid email and a stronger password.',
  });

  const session = toSession(payload);
  return session === null ? { status: 'confirmation_required' } : { status: 'active', session };
};

export const refreshSession = async (refreshToken) => {
  const payload = await postAuth('token?grant_type=refresh_token', { refresh_token: refreshToken }, {
    fallbackMessage: 'Your session expired. Sign in again.',
  });

  const session = toSession(payload);
  if (session === null) {
    throw { code: 'AUTH_EXPIRED', message: 'Your session expired. Sign in again.' };
  }
  return session;
};

/** Best-effort revocation: a failed logout must still clear the popup's local state. */
export const signOut = async (accessToken) => {
  try {
    await postAuth('logout', {}, { accessToken });
  } catch {
    // The local session is dropped by the caller regardless.
  }
};
