'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Input, PasswordInput } from '@soyre/ui';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../lib/api';

type LoginFormProps = {
  className?: string;
  loadingLabel?: string;
  redirectTo?: string;
  submitLabel?: string;
};

export function LoginForm({
  className,
  loadingLabel = 'Ingresando...',
  redirectTo = '/dashboard',
  submitLabel = 'Ingresar',
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      router.push(redirectTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={['stack', className].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    >
      <Input
        id="login-email"
        label="Correo"
        autoComplete="email"
        name="email"
        required
        type="email"
      />
      <PasswordInput
        id="login-password"
        label="Contraseña"
        autoComplete="current-password"
        name="password"
        required
      />
      {error ? <p className="form-error">{error}</p> : null}
      <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
        {isSubmitting ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
