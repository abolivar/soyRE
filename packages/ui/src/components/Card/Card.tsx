import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  const classes = ['card', className].filter(Boolean).join(' ');

  return (
    <article {...rest} className={classes}>
      {children}
    </article>
  );
}
