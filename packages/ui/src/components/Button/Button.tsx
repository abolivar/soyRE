import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
}

type ButtonChildProps = {
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export function Button({
  asChild = false,
  variant = 'primary',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['button', variant, className].filter(Boolean).join(' ');
  const isDisabled = disabled || loading;
  const leadingContent = loading ? (
    <Loader2 aria-hidden="true" size={16} strokeWidth={2.2} />
  ) : Icon ? (
    <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
  ) : null;

  if (asChild && isValidElement<ButtonChildProps>(children)) {
    const child = children as ReactElement<ButtonChildProps>;
    const childClasses = [classes, child.props.className].filter(Boolean).join(' ');
    const childProps: ButtonChildProps = {
      ...rest,
      'aria-busy': loading || child.props['aria-busy'],
      'aria-disabled': isDisabled || child.props['aria-disabled'],
      className: childClasses,
      children: (
        <>
          {leadingContent}
          {child.props.children}
        </>
      ),
    };

    if (isDisabled || child.props.onClick || onClick) {
      childProps.onClick = (event: MouseEvent<HTMLElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        child.props.onClick?.(event);
        (onClick as unknown as ((event: MouseEvent<HTMLElement>) => void) | undefined)?.(
          event,
        );
      };
    }

    return cloneElement(child, childProps);
  }

  return (
    <button
      {...rest}
      aria-busy={loading || undefined}
      className={classes}
      disabled={isDisabled}
      type={type}
      onClick={onClick}
    >
      {leadingContent}
      {children}
    </button>
  );
}
