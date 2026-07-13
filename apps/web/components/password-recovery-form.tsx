'use client';

import { FormEvent, useState } from 'react';
import { Button, Input } from '@soyre/ui';
import { apiFetch, type PasswordRecoveryResponse } from '../lib/api';

export function PasswordRecoveryForm() {
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<PasswordRecoveryResponse>(
        '/auth/password-recovery',
        {
          body: JSON.stringify({
            email: form.get('email'),
          }),
          method: 'POST',
        },
      );
      setMessage(response.message);
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos registrar la solicitud.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="muted-row">
        <Button onClick={() => setIsOpen(true)} type="button" variant="ghost">
          ¿Olvidaste tu contraseña?
        </Button>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Input
        id="password-recovery-email"
        label="Correo de la cuenta"
        autoComplete="email"
        name="email"
        required
        type="email"
      />
      {message ? <p className="success-banner">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="muted-row">
        <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
          Solicitar recuperación
        </Button>
        <Button
          onClick={() => {
            setError(null);
            setIsOpen(false);
            setMessage(null);
          }}
          type="button"
          variant="ghost"
        >
          Volver
        </Button>
      </div>
    </form>
  );
}
