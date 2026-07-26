export type Tone =
  | 'primary'
  | 'rent'
  | 'featured'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

/**
 * A single categorical data point for charts. `tone` maps the datum to the
 * existing semantic tone system (never an arbitrary hue) so chart colors match
 * the badges the app already uses for the same entity.
 */
export type ChartDatum = {
  label: string;
  value: number;
  tone?: Tone;
};
