import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '5097';

function getBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'android' && !Constants.expoConfig?.hostUri) {
    return `http://10.0.2.2:${API_PORT}`;
  }
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    return `http://${host}:${API_PORT}`;
  }
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = getBaseUrl();
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

export async function apiRequest<T = any>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (e: any) {
    const err: any = new Error(`Cannot reach API at ${API_BASE_URL}. Make sure ASP.NET Core is running and the phone/PC are on the same network.`);
    err.cause = e;
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

  if (response.status === 401 && retry) {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const refresh = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(refreshToken),
        });
        if (refresh.ok) {
          const refreshPayload = await refresh.json();
          const data = extractData(refreshPayload);
          if (data?.token) {
            await setSession(data.token, data.refreshToken ?? refreshToken, data.user ?? JSON.parse((await AsyncStorage.getItem(USER_KEY)) || 'null'));
            return apiRequest<T>(path, options, false);
          }
        }
      } catch {}
    }
    await clearSession();
  }

  if (!response.ok) {
    const message = payload?.message || payload?.title || `API request failed (${response.status})`;
    const err: any = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return extractData(payload) as T;
}
