import { auth } from '@/lib/firebase';
import { getAnonymousSessionToken } from './anonymousSessionToken';
import { Platform } from 'react-native';

const fallbackApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api'
  : 'http://localhost:3000/api';

function normalizeApiUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl,
);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(path: string, params?: RequestOptions['params']) {
  let base: string;
  try {
    base = API_URL;
    // eslint-disable-next-line no-new
    new URL(base);
  } catch {
    console.error('Invalid EXPO_PUBLIC_API_URL, falling back to localhost');
    base = 'http://localhost:3000/api';
  }
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = await auth.currentUser?.getIdToken();
  const hasBody = options.body !== undefined;
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const anonToken = getAnonymousSessionToken();
  if (anonToken) {
    headers['X-Anonymous-Session-Token'] = anonToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, options.params), {
      method: options.method || 'GET',
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (response.ok) {
          throw new ApiError(
            0,
            'Malformed JSON response from server',
            { raw: text.slice(0, 500) }
          );
        }
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        auth.signOut().catch(() => {});
      }
      const message =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.error === 'string'
            ? data.error
            : 'Request failed';
      throw new ApiError(response.status, message, data);
    }

    return { data: data as T };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(path: string, options?: Pick<RequestOptions, 'params'>) =>
    request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body }),
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function normalizeApiError(error: unknown, fallbackMessage: string): never {
  if (error instanceof ApiError) throw error;
  throw new Error(getApiErrorMessage(error, fallbackMessage));
}
