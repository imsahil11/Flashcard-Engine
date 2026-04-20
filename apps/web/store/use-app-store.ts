'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Deck, Flashcard } from '@flashcard/types';

type AppState = {
  token: string | null;
  user: AuthUser | null;
  decks: Deck[];
  flashcards: Flashcard[];
  currentReviewIndex: number;
  hasHydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  setDecks: (decks: Deck[]) => void;
  setFlashcards: (flashcards: Flashcard[]) => void;
  setCurrentReviewIndex: (index: number) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

function isJwtLike(token: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export const useAuthStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      decks: [],
      flashcards: [],
      currentReviewIndex: 0,
      hasHydrated: false,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, decks: [], flashcards: [], currentReviewIndex: 0 }),
      setDecks: (decks) => set({ decks }),
      setFlashcards: (flashcards) => set({ flashcards, currentReviewIndex: 0 }),
      setCurrentReviewIndex: (currentReviewIndex) => set({ currentReviewIndex }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'flashcard-engine-session',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        const persistedToken = state?.token;
        if (persistedToken && !isJwtLike(persistedToken)) {
          state?.logout();
        }

        state?.setHasHydrated(true);
      },
    },
  ),
);
