import type { ReactNode, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function Textarea({ id, label, hint, error, ...rest }: TextareaProps) {
  const hintId = hint || error ? `${id}-hint` : undefined;
  const isInvalid = Boolean(error);

  return (
    <label className="input-field" htmlFor={id}>
      <span className="input-field-label">{label}</span>
      <textarea
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
