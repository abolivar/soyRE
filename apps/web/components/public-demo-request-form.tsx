'use client';

import { Button, Input, Select, Textarea } from '@soyre/ui';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; requestId: string }
  | { kind: 'error'; message: string };

type Attribution = {
  pageUrl?: string;
  referrer?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmMedium?: string;
  utmSource?: string;
  utmTerm?: string;
};

type DemoRequestResponse = {
  requestId: string;
  status: 'received';
};

export function PublicDemoRequestForm({ enabled }: { enabled: boolean }) {
  const [attribution, setAttribution] = useState<Attribution>({});
  const [formState, setFormState] = useState<FormState>({ kind: 'idle' });

  useEffect(() => {
    const url = new URL(window.location.href);
    setAttribution({
      pageUrl: url.toString(),
      referrer: document.referrer || undefined,
      utmCampaign: url.searchParams.get('utm_campaign') || undefined,
      utmContent: url.searchParams.get('utm_content') || undefined,
      utmMedium: url.searchParams.get('utm_medium') || undefined,
      utmSource: url.searchParams.get('utm_source') || undefined,
      utmTerm: url.searchParams.get('utm_term') || undefined,
    });
  }, []);

  async function submitDemoRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled || formState.kind === 'submitting') {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setFormState({ kind: 'submitting' });

    try {
      const response = await apiFetch<DemoRequestResponse>(
        '/public/demo-requests',
        {
          body: JSON.stringify({
            ...attribution,
            challenge: optionalFormValue(formData, 'challenge'),
            company: requiredFormValue(formData, 'company'),
            consent: formData.get('consent') === 'on',
            country: requiredFormValue(formData, 'country'),
            email: requiredFormValue(formData, 'email'),
            name: requiredFormValue(formData, 'name'),
            teamSize: requiredFormValue(formData, 'teamSize'),
            website: optionalFormValue(formData, 'website'),
          }),
          method: 'POST',
        },
      );

      form.reset();
      setFormState({ kind: 'success', requestId: response.requestId });
    } catch {
      setFormState({
        kind: 'error',
        message:
          'No pudimos registrar tu solicitud. Intenta nuevamente en unos minutos.',
      });
    }
  }

  const isSubmitting = formState.kind === 'submitting';

  return (
    <form
      className="public-demo-form"
      onSubmit={submitDemoRequest}
      aria-describedby="demo-form-status"
    >
      {Object.entries(attribution).map(([name, value]) => (
        <input
          key={name}
          name={name}
          readOnly
          type="hidden"
          value={value ?? ''}
        />
      ))}
      <div className="public-demo-form-grid">
        <Input
          autoComplete="name"
          disabled={!enabled || isSubmitting}
          id="demo-name"
          label="Nombre"
          maxLength={100}
          name="name"
          required
        />
        <Input
          autoComplete="email"
          disabled={!enabled || isSubmitting}
          id="demo-email"
          label="Correo laboral"
          maxLength={180}
          name="email"
          required
          type="email"
        />
        <Input
          autoComplete="organization"
          disabled={!enabled || isSubmitting}
          id="demo-company"
          label="Empresa"
          maxLength={160}
          name="company"
          required
        />
        <Input
          autoComplete="country-name"
          disabled={!enabled || isSubmitting}
          id="demo-country"
          label="País"
          maxLength={80}
          name="country"
          required
        />
        <Select
          disabled={!enabled || isSubmitting}
          id="demo-team-size"
          label="Tamaño del equipo"
          name="teamSize"
          required
          defaultValue=""
        >
          <option disabled value="">
            Selecciona una opción
          </option>
          <option value="SOLO">Trabajo solo/a</option>
          <option value="TWO_TO_FIVE">2-5 personas</option>
          <option value="SIX_TO_TEN">6-10 personas</option>
          <option value="ELEVEN_TO_TWENTY">11-20 personas</option>
          <option value="TWENTY_ONE_PLUS">21 o más personas</option>
        </Select>
        <Textarea
          className="public-demo-form-challenge"
          disabled={!enabled || isSubmitting}
          id="demo-challenge"
          label="Reto operativo (opcional)"
          maxLength={2000}
          name="challenge"
          placeholder="¿Qué parte de la operación quieres ordenar?"
          rows={5}
        />
      </div>

      <label className="public-demo-honeypot" aria-hidden="true">
        Sitio web
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </label>

      <label className="public-demo-consent">
        <input
          disabled={!enabled || isSubmitting}
          name="consent"
          required
          type="checkbox"
        />
        <span>
          Acepto que SoyPMS use estos datos para responder mi solicitud de demo,
          de acuerdo con el{' '}
          <Link href="/privacidad">borrador de privacidad</Link>. El formulario
          se activará únicamente después de aprobación legal.
        </span>
      </label>

      <div className="public-demo-submit">
        <Button
          className="landing-demo-cta landing-demo-cta-coral"
          data-demo-cta
          disabled={!enabled || isSubmitting}
          type="submit"
          variant="primary"
        >
          {isSubmitting
            ? 'Enviando…'
            : enabled
              ? 'Solicitar una demo'
              : 'Formulario pendiente de aprobación'}
        </Button>
        <p
          className={[
            'public-demo-form-status',
            formState.kind === 'error' ? 'is-error' : '',
            formState.kind === 'success' ? 'is-success' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          id="demo-form-status"
          aria-live="polite"
        >
          {!enabled
            ? 'La captura está desactivada mientras se aprueban privacidad, cookies y términos.'
            : formState.kind === 'success'
              ? `Solicitud recibida. Referencia: ${formState.requestId}`
              : formState.kind === 'error'
                ? formState.message
                : 'Responderemos al correo laboral indicado.'}
        </p>
      </div>
    </form>
  );
}

function requiredFormValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function optionalFormValue(formData: FormData, name: string) {
  return requiredFormValue(formData, name) || undefined;
}
