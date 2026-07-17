import type { ChartDatum } from '../../types';

export interface ChartLegendProps {
  items: readonly ChartDatum[];
  formatValue?: (value: number) => string;
}

/**
 * Shared legend for charts whose marks are not individually labelled (donut).
 * The colored dot carries identity; label and value stay in ink tokens so text
 * never wears the series color.
 */
export function ChartLegend({ items, formatValue }: ChartLegendProps) {
  const format = formatValue ?? ((value: number) => String(value));

  return (
    <ul className="chart-legend">
      {items.map((item, index) => (
        <li className="chart-legend-item" key={`${item.label}-${index}`}>
          <span
            aria-hidden="true"
            className={`chart-swatch tone-${item.tone ?? 'neutral'}`}
          />
          <span className="chart-legend-label">{item.label}</span>
          <span className="chart-legend-value">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
