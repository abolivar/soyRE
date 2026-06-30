import type { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return <section className="filter-bar">{children}</section>;
}
