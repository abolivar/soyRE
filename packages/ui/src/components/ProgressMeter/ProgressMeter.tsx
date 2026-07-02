export type ProgressMeterSize = 'sm' | 'md';

export type ProgressMeterProps = {
  label: string;
  value: number;
  detail?: string;
  size?: ProgressMeterSize;
};

export function ProgressMeter({
  detail,
  label,
  size = 'md',
  value,
}: ProgressMeterProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`progress-meter progress-meter-${size}`}>
      <div className="progress-meter-copy">
        <span>{label}</span>
        <strong>{normalizedValue}%</strong>
      </div>
      <div
        aria-label={`${label}: ${normalizedValue}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalizedValue}
        className="progress-meter-track"
        role="progressbar"
      >
        <span style={{ width: `${normalizedValue}%` }} />
      </div>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}
