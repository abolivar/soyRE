import type { ReactNode } from 'react';
import type { Tone } from '../../types';

export type BadgeShape = 'badge' | 'tag';

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  shape?: BadgeShape;
}

export function Badge({ children, tone = 'neutral', shape = 'badge' }: BadgeProps) {
  const shapeClass = shape === 'tag' ? 'tag' : null;
  const classes = ['badge', shapeClass, `tone-${tone}`].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
