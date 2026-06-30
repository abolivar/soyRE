import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  variant = 'primary',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const variantClass = variant === 'primary' ? null : variant;
  const classes = ['button', variantClass, className].filter(Boolean).join(' ');
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      aria-busy={loading || undefined}
      className={classes}
      disabled={isDisabled}
      type={type}
    >
      {loading ? (
        <Loader2 aria-hidden="true" size={16} strokeWidth={2.2} />
      ) : Icon ? (
        <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
      ) : null}
      {children}
    </button>
  );
}
