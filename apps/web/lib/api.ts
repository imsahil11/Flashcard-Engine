import type { ApiEnvelope } from '@flashcard/types';
import { useAuthStore } from '../store/use-app-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>> & {
    message?: string;
  };

  if (!response.ok) {
    throw new ApiClientError(payload.message ?? 'Request failed', response.status);
  }

  return payload.data as T;
}
