import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================
// LIVE .NET API CONFIGURATION
// =====================================================
const LIVE_API_URL = 'https://bloodcare-api.runasp.net';

function getBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configured ? configured.replace(/\/+$/, '') : LIVE_API_URL;
}

export const API_BASE_URL = getBaseUrl();

// =====================================================
// STORAGE KEYS
// =====================================================
export const ACCESS_TOKEN_KEY = '@bloodapp/accessToken';
export const REFRESH_TOKEN_KEY = '@bloodapp/refreshToken';
export const USER_KEY = '@bloodapp/user';

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setSession(token: string, refreshToken: string, user: any) {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, token],
    [REFRESH_TOKEN_KEY, refreshToken],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}

function extractData(payload: any) {
  return payload?.data !== undefined ? payload.data : payload;
}

// These endpoints never require a stored access token.
const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-verification',
  '/api/auth/verify-email',
  '/api/auth/refresh-token',
]);

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const pathname = path.split('?')[0].replace(/\/+$/, '').toLowerCase();
  const isPublic = PUBLIC_AUTH_PATHS.has(pathname);
  const token = isPublic ? null : await getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  // Public requests must not inherit an expired Bearer token.
  if (isPublic) {
    delete headers.Authorization;
    delete headers.authorization;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (e: any) {
    const err: any = new Error(
      `Cannot reach API at ${API_BASE_URL}. Check your internet connection and server availability.`
    );
    err.cause = e;
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const responseText = await response.text();
  let payload: any = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = responseText;
  }

  // Refresh only for authenticated endpoints, never for Forgot Password.
  if (response.status === 401 && retry && !isPublic) {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const refresh = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(refreshToken),
        });

        if (refresh.ok) {
          const refreshPayload = await refresh.json();
          const data = extractData(refreshPayload);
          if (data?.token) {
            const savedUser = await AsyncStorage.getItem(USER_KEY);
            await setSession(
              data.token,
              data.refreshToken ?? refreshToken,
              data.user ?? JSON.parse(savedUser || 'null')
            );
            return apiRequest<T>(path, options, false);
          }
        }
      } catch {
        // Token refresh failed.
      }
    }
    await clearSession();
  }

  if (!response.ok) {
    const message =
      payload?.message || payload?.title || `API request failed (${response.status})`;
    const err: any = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return extractData(payload) as T;
}
