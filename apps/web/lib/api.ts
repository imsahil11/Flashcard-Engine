import type { ApiEnvelope } from '@flashcard/types';
import { useAuthStore } from '../store/use-app-store';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

function looksLikeJwt(token: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authState = useAuthStore.getState();
  let token = authState.token;

  if (token && !looksLikeJwt(token)) {
    authState.logout();
    token = null;
  }

  const headers = new Headers(init.headers);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestUrl = `${API_URL}${normalizedPath}`;

  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError(
      `Unable to reach API at ${requestUrl}. Start the API server or set NEXT_PUBLIC_API_URL correctly.`,
      0,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>> & {
    message?: string;
  };

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiClientError(payload.message ?? 'Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    throw new ApiClientError(payload.message ?? 'Request failed', response.status);
  }

  return payload.data as T;
}
