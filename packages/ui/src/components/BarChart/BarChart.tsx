import type { ReactNode } from 'react';
import type { ChartDatum } from '../../types';

export interface BarChartProps {
  data: readonly ChartDatum[];
  /** Describes the whole chart for assistive tech (e.g. "Negocios por estado"). */
  ariaLabel: string;
  formatValue?: (value: number) => string;
  empty?: ReactNode;
}

/**
 * Horizontal categorical bar chart, built with HTML + tokens (same idiom as
 * ProgressMeter). Every bar carries its own visible label and value — identity
 * is never color-alone, which the design tokens' CVD overlap requires.
 */
export function BarChart({ data, ariaLabel, formatValue, empty }: BarChartProps) {
  if (data.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const format = formatValue ?? ((value: number) => String(value));
  const max = data.reduce((peak, item) => Math.max(peak, item.value), 0);

  return (
    <div aria-label={ariaLabel} className="bar-chart" role="img">
      {data.map((item, index) => {
        const percent = max > 0 ? Math.round((item.value / max) * 100) : 0;

        return (
          <div className="bar-chart-row" key={`${item.label}-${index}`}>
            <span className="bar-chart-label">{item.label}</span>
            <span className="bar-chart-track">
              <span
                className={`bar-chart-fill tone-${item.tone ?? 'neutral'}`}
                style={{ width: `${percent}%` }}
                title={`${item.label}: ${format(item.value)}`}
              />
            </span>
            <span className="bar-chart-value">{format(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
