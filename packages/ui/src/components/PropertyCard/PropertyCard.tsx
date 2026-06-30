import type { LucideIcon } from 'lucide-react';
import { Building2 } from 'lucide-react';
import type { Tone } from '../../types';

export type PropertyOperation = 'sale' | 'rent' | 'featured';

export interface PropertyPrice {
  amount: number;
  currency?: string;
  rangeMin?: number;
  rangeMax?: number;
}

export interface PropertyChip {
  label: string;
  icon?: LucideIcon;
}

export interface PropertyMatchBadge {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
}

export interface PropertyCardProps {
  operation: PropertyOperation;
  operationLabel: string;
  title: string;
  location: string;
  price: PropertyPrice;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  insight?: string;
  chips?: readonly PropertyChip[];
  matchBadge?: PropertyMatchBadge;
  priceFormatter?: (amount: number) => string;
}

const operationToTone: Record<PropertyOperation, Tone> = {
  sale: 'primary',
  rent: 'rent',
  featured: 'featured',
};

const defaultPriceFormatter = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);

export function PropertyCard({
  operation,
  operationLabel,
  title,
  location,
  price,
  thumbnailUrl,
  thumbnailAlt,
  insight,
  chips,
  matchBadge,
  priceFormatter = defaultPriceFormatter,
}: PropertyCardProps) {
  const tone = operationToTone[operation];

  const priceLabel = priceFormatter(price.amount);
  const rangeLabel =
    price.rangeMin != null && price.rangeMax != null
      ? `Est. ${priceFormatter(price.rangeMin)}–${priceFormatter(price.rangeMax)}`
      : null;

  return (
    <article className={`property-card tone-${tone}`}>
      <div aria-hidden="true" className="property-card-accent" />
      <div className="property-card-thumbnail">
        {thumbnailUrl ? (
          <img
            alt={thumbnailAlt ?? title}
            className="property-card-image"
            src={thumbnailUrl}
          />
        ) : (
          <div aria-hidden="true" className="property-card-placeholder">
            <Building2 size={32} strokeWidth={1.6} />
          </div>
        )}
        <span className={`property-card-operation badge tag tone-${tone}`}>
          {operationLabel}
        </span>
      </div>
      <div className="property-card-body">
        {insight ? (
          <p className="property-card-insight">
            <span aria-hidden="true" className="property-card-insight-dot" />
            {insight}
          </p>
        ) : null}
        <h3 className="property-card-title">{title}</h3>
        <p className="property-card-location">{location}</p>
        <p className="property-card-price">
          <strong>{priceLabel}</strong>
          {rangeLabel ? (
            <span className="property-card-price-range">· {rangeLabel}</span>
          ) : null}
        </p>
        {chips && chips.length > 0 ? (
          <ul className="property-card-chips">
            {chips.map(({ label, icon: ChipIcon }, index) => (
              <li className="property-card-chip" key={`${label}-${index}`}>
                {ChipIcon ? (
                  <ChipIcon aria-hidden="true" size={12} strokeWidth={2} />
                ) : null}
                {label}
              </li>
            ))}
          </ul>
        ) : null}
        {matchBadge ? (
          <MatchBadge fallbackTone={tone} matchBadge={matchBadge} />
        ) : null}
      </div>
    </article>
  );
}

function MatchBadge({
  matchBadge,
  fallbackTone,
}: {
  matchBadge: PropertyMatchBadge;
  fallbackTone: Tone;
}) {
  const { label, tone, icon: MatchIcon } = matchBadge;
  const resolvedTone = tone ?? fallbackTone;

  return (
    <span className={`property-card-match badge tag tone-${resolvedTone}`}>
      {MatchIcon ? (
        <MatchIcon aria-hidden="true" size={12} strokeWidth={2} />
      ) : null}
      {label}
    </span>
  );
}
