import type { LucideIcon } from 'lucide-react';
import type { Tone } from '../../types';

export type MetricCardEmphasis = 'default' | 'highlight';

export type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: Tone;
  emphasis?: MetricCardEmphasis;
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  emphasis = 'default',
}: MetricCardProps) {
  return (
    <article className={`metric-card tone-${tone} emphasis-${emphasis}`}>
      <div className="metric-card-header">
        <span className="metric-card-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <span className="metric-label">{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}
