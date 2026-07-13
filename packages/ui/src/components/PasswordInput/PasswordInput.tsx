'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: string;
}

export function PasswordInput({
  id,
  label,
  labelHidden = false,
  hint,
  error,
  ...rest
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hintId = hint || error ? `${id}-hint` : undefined;
  const isInvalid = Boolean(error);
  const visibilityLabel = isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <label className="input-field password-input-field" htmlFor={id}>
      <span className={`input-field-label${labelHidden ? ' is-hidden' : ''}`}>
        {label}
      </span>
      <span className="password-input-control">
        <input
          {...rest}
          aria-describedby={hintId}
          aria-invalid={isInvalid || undefined}
          id={id}
          type={isVisible ? 'text' : 'password'}
        />
        <button
          aria-label={visibilityLabel}
          aria-pressed={isVisible}
          className="password-visibility-button"
          disabled={rest.disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsVisible((current) => !current)}
          title={visibilityLabel}
          type="button"
        >
          <VisibilityIcon aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </span>
      {error ? (
        <span className="input-field-error" id={hintId}>
          {error}
        </span>
      ) : hint ? (
        <span className="input-field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
