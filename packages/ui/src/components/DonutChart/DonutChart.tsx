import type { ReactNode } from 'react';
import type { ChartDatum } from '../../types';
import { ChartLegend } from '../ChartLegend';

export interface DonutChartProps {
  data: readonly ChartDatum[];
  /** Describes the whole chart for assistive tech (e.g. "Negocios por operación"). */
  ariaLabel: string;
  centerLabel?: string;
  centerValue?: string;
  /** Legend is shown by default; segments are not individually labelled. */
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  empty?: ReactNode;
}

/** Circumference gap between segments, in the 0–100 pathLength space. */
const SEGMENT_GAP = 1.2;

/**
 * Composition donut, built with SVG + tokens. Uses pathLength=100 so segment
 * lengths are percentages regardless of radius. A legend (dot + label + value)
 * carries identity, since ring segments are not individually labelled.
 */
export function DonutChart({
  data,
  ariaLabel,
  centerLabel,
  centerValue,
  showLegend = true,
  formatValue,
  empty,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total <= 0) {
    return empty ? <>{empty}</> : null;
  }

  const format = formatValue ?? ((value: number) => String(value));
  let cumulative = 0;

  return (
    <div className="donut-chart">
      <div className="donut-chart-figure">
        <svg
          aria-label={ariaLabel}
          role="img"
          viewBox="0 0 42 42"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="donut-track"
            cx="21"
            cy="21"
            fill="transparent"
            pathLength={100}
            r="15.915"
          />
          <g transform="rotate(-90 21 21)">
            {data.map((item, index) => {
              const fraction = (item.value / total) * 100;
              const dash = Math.max(fraction - SEGMENT_GAP, 0);
              const offset = -cumulative;
              cumulative += fraction;

              return (
                <circle
                  className={`donut-segment tone-${item.tone ?? 'neutral'}`}
                  cx="21"
                  cy="21"
                  fill="transparent"
                  key={`${item.label}-${index}`}
                  pathLength={100}
                  r="15.915"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                >
                  <title>{`${item.label}: ${format(item.value)}`}</title>
                </circle>
              );
            })}
          </g>
        </svg>
        {centerValue || centerLabel ? (
          <div className="donut-chart-center" aria-hidden="true">
            {centerValue ? <strong>{centerValue}</strong> : null}
            {centerLabel ? <span>{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
      {showLegend ? <ChartLegend formatValue={format} items={data} /> : null}
    </div>
  );
}
