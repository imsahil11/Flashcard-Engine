'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flashcard/ui';
import { useAuth } from '../hooks/use-api';
import { useAuthStore } from '../store/use-app-store';

type Props = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const { login, register } = useAuth();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = mode === 'login' ? login : register;

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutation.mutateAsync({ email, password });
    router.replace('/dashboard');
  }

  if (!hasHydrated) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-zinc-100" />
          <div className="mt-6 h-10 w-full animate-pulse rounded-md bg-zinc-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-zinc-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-zinc-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</CardTitle>
          <p className="text-sm text-zinc-600">Turn dense PDFs into review-ready memory work.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm font-medium">
              Email
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Password
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
            {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Working...' : mode === 'login' ? 'Log in' : 'Register'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-zinc-600">
            {mode === 'login' ? 'Need an account? ' : 'Already registered? '}
            <Link className="font-medium text-emerald-700" href={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? 'Register' : 'Log in'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
