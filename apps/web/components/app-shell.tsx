'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@flashcard/ui';
import { useAuthStore } from '../store/use-app-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, hasHydrated, logout } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token && pathname !== '/login' && pathname !== '/register') {
      router.replace('/login');
    }
  }, [hasHydrated, pathname, router, token]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
          <div className="h-16 animate-pulse rounded-md bg-zinc-200" />
          <div className="h-40 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-72 animate-pulse rounded-md bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-amber-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <span className="teacher-hand text-sm text-teal-700">Master teacher notebook</span>
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-zinc-900">
              AI Flashcard Engine
            </Link>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/review"
              className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-white hover:text-teal-700"
            >
              Review
            </Link>
            <span className="hidden rounded-full bg-white/70 px-3 py-1.5 text-zinc-500 sm:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
