import type { LucideIcon } from 'lucide-react';
import type { Tone } from '../../types';

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-card-header">
        <span className="metric-label">{label}</span>
        <span className="metric-card-icon" aria-hidden="true">
          <Icon size={19} strokeWidth={2.2} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}
