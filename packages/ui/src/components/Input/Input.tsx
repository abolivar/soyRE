import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: string;
}

export function Input({
  id,
  label,
  labelHidden = false,
  hint,
  error,
  ...rest
}: InputProps) {
  const hintId = hint || error ? `${id}-hint` : undefined;
  const isInvalid = Boolean(error);

  return (
    <label className="input-field" htmlFor={id}>
      <span className={`input-field-label${labelHidden ? ' is-hidden' : ''}`}>
        {label}
      </span>
      <input
        {...rest}
        aria-describedby={hintId}
        aria-invalid={isInvalid || undefined}
        id={id}
      />
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
