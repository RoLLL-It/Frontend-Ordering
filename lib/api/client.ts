import { ApiErrorPayload } from '@/types/api';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
  status: number;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.code = payload.code || 'INTERNAL';
    this.details = payload.details;
    this.requestId = payload.request_id;
    this.status = status;
  }
}

// In-memory access token storage (HLD §5: never stored in localStorage)
let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
}

// Single-flight refresh token mutex
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const data = await res.json();
      const newToken = data?.data?.access_token || null;
      setAccessToken(newToken);
      return newToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, headers, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token && !skipAuth) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
      credentials: 'include',
    });
  } catch (netErr: any) {
    throw new ApiError(
      {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to server. Please check your connection.',
      },
      0
    );
  }

  // Handle Token Expiry
  if (response.status === 401 && !skipAuth) {
    const errorData = await response.clone().json().catch(() => null);
    if (errorData?.error?.code === 'TOKEN_EXPIRED') {
      const newToken = await refreshAccessToken();
      if (newToken) {
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...rest,
          headers: reqHeaders,
          credentials: 'include',
        });
      } else {
        if (typeof window !== 'undefined') {
          const current = window.location.pathname;
          window.location.href = `/login?next=${encodeURIComponent(current)}`;
        }
      }
    }
  }

  if (!response.ok) {
    let errorPayload: ApiErrorPayload;
    try {
      const errJson = await response.json();
      errorPayload = errJson.error || {
        code: 'INTERNAL',
        message: response.statusText,
      };
    } catch {
      errorPayload = {
        code: 'INTERNAL',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    throw new ApiError(errorPayload, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

