import type { ReactNode, SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
}

export function Select({ id, label, hint, error, children, ...rest }: SelectProps) {
  const hintId = hint || error ? `${id}-hint` : undefined;
  const isInvalid = Boolean(error);

  return (
    <label className="input-field" htmlFor={id}>
      <span className="input-field-label">{label}</span>
      <select
        {...rest}
        aria-describedby={hintId}
        aria-invalid={isInvalid || undefined}
        id={id}
      >
        {children}
      </select>
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
