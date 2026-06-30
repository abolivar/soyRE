/**
 * @soyre/ui — design system primitives for SoyPMS.
 *
 * Visual specification: design.md at the repo root.
 * Architecture: docs/architecture/design-system.md.
 * Decision: docs/decisions/adr-0005-design-system-home.md.
 */

export type { Tone } from './types';

// Atoms
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant } from './components/Button';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeShape } from './components/Badge';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Select } from './components/Select';
export type { SelectProps } from './components/Select';

export { Textarea } from './components/Textarea';
export type { TextareaProps } from './components/Textarea';

// Domain
export { PropertyCard } from './components/PropertyCard';
export type {
  PropertyCardProps,
  PropertyChip,
  PropertyMatchBadge,
  PropertyOperation,
  PropertyPrice,
} from './components/PropertyCard';

// Composites
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
export { Tabs } from './components/Tabs';
export type { TabItem, TabsProps } from './components/Tabs';
