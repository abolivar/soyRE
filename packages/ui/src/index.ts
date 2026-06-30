/**
 * @soyre/ui — design system primitives for SoyPMS.
 *
 * Visual specification: design.md at the repo root.
 * Architecture: docs/architecture/design-system.md.
 * Decision: docs/decisions/adr-0005-design-system-home.md.
 */

export type { Tone } from './types';

export { PageHeader } from './components/PageHeader';
export { MetricCard } from './components/MetricCard';
export { StatusBadge } from './components/StatusBadge';
export { SectionPanel } from './components/SectionPanel';
export { SearchInput } from './components/SearchInput';
export { FilterBar } from './components/FilterBar';
export { DataTable } from './components/DataTable';
export type { DataTableColumn, DataTableRow } from './components/DataTable';
export { EmptyState } from './components/EmptyState';
export { LoadingState } from './components/LoadingState';
export { ErrorState } from './components/ErrorState';
export { ActivityTimeline } from './components/ActivityTimeline';
export type { ActivityTimelineItem } from './components/ActivityTimeline';
export { ConfirmDialog } from './components/ConfirmDialog';
export { FormDrawer } from './components/FormDrawer';
