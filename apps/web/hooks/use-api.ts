'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser, Deck, Flashcard, ReviewRating, UploadProgress } from '@flashcard/types';
import { ApiClientError, apiFetch } from '../lib/api';
import { useAuthStore } from '../store/use-app-store';

type AuthResponse = {
  user: AuthUser;
  token: string;
};

export function useAuth() {
  const setAuth = useAuthStore((state) => state.setAuth);

  const register = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => setAuth(data.token, data.user),
  });

  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => setAuth(data.token, data.user),
  });

  return { register, login };
}

export function useDecks() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setDecks = useAuthStore((state) => state.setDecks);
  return useQuery({
    queryKey: ['decks'],
    enabled: hasHydrated && Boolean(token),
    queryFn: async () => {
      const decks = await apiFetch<Deck[]>('/decks');
      setDecks(decks);
      return decks;
    },
  });
}

export function useFlashcards(deckId?: string) {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setFlashcards = useAuthStore((state) => state.setFlashcards);
  return useQuery({
    queryKey: ['flashcards', deckId],
    enabled: hasHydrated && Boolean(token) && Boolean(deckId),
    queryFn: async () => {
      const flashcards = await apiFetch<Flashcard[]>(`/decks/${deckId}/flashcards`);
      setFlashcards(flashcards);
      return flashcards;
    },
  });
}

export function useDeck(deckId?: string) {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return useQuery({
    queryKey: ['deck', deckId],
    enabled: hasHydrated && Boolean(token) && Boolean(deckId),
    queryFn: () => apiFetch<Deck>(`/decks/${deckId}`),
  });
}

export function useUploadPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData }: { formData: FormData; uploadId: string }) =>
      apiFetch<Deck>('/upload', {
        method: 'POST',
        body: formData,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
  });
}

export function useUploadProgress(uploadId?: string, enabled = true) {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return useQuery({
    queryKey: ['upload-progress', uploadId],
    enabled: hasHydrated && Boolean(token) && Boolean(uploadId) && enabled,
    queryFn: async () => {
      try {
        return await apiFetch<UploadProgress>(`/upload/progress/${uploadId}`);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    refetchInterval: (query) => {
      const progress = query.state.data;
      if (!progress) {
        return 1000;
      }

      return progress.stage === 'completed' || progress.stage === 'failed' ? false : 1000;
    },
  });
}

export function useReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { flashcardId: string; rating: ReviewRating }) =>
      apiFetch<Flashcard>('/decks/review', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}
