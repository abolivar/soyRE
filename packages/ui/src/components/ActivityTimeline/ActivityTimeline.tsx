import type { ReactNode } from 'react';
import { StatusBadge } from '../StatusBadge';
import type { Tone } from '../../types';

export type ActivityTimelineItem = {
  id: string;
  initials?: string;
  title: string;
  detail: string;
  meta?: string;
  status?: string;
  tone?: Tone;
};

export function ActivityTimeline({
  items,
  empty,
}: {
  items: readonly ActivityTimelineItem[];
  empty?: ReactNode;
}) {
  if (items.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <ol className="activity-timeline">
      {items.map((item) => (
        <li className="timeline-item" key={item.id}>
          <span className="timeline-marker">
            {item.initials ? <span>{item.initials}</span> : null}
          </span>
          <span>
            <strong className="entity-title">{item.title}</strong>
            <span className="meta-row">{item.detail}</span>
            {item.meta ? <span className="timeline-meta">{item.meta}</span> : null}
          </span>
          {item.status ? (
            <StatusBadge tone={item.tone ?? 'neutral'}>{item.status}</StatusBadge>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
