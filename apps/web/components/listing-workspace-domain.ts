import type {
  ListingReadinessBlocker,
  ListingStatus,
  MembershipRole,
  OperationalListing,
} from '../lib/api';

export type ListingWorkspaceAction =
  | 'EDIT'
  | 'ADD_MATERIAL'
  | 'DECLARE_READY'
  | 'RETURN_TO_DRAFT'
  | 'APPROVE'
  | 'PUBLISH'
  | 'PAUSE'
  | 'RESUME'
  | 'WITHDRAW'
  | 'ARCHIVE';

const writeRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
  'AGENT',
]);
const commitRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
]);

export function availableListingActions(
  role: MembershipRole | null,
  currentUserId: string | null,
  listing: OperationalListing | null,
) {
  if (!role || !listing) return [];
  const actions: ListingWorkspaceAction[] = [];
  const assignedAgent =
    role !== 'AGENT' ||
    (listing.assignedUserId === currentUserId &&
      listing.property.assignedUserId === currentUserId);
  if (
    writeRoles.has(role) &&
    assignedAgent &&
    (listing.status === 'DRAFT' || listing.status === 'READY')
  ) {
    actions.push('EDIT', 'ADD_MATERIAL');
  }
  if (!commitRoles.has(role)) return actions;

  const transitions: Partial<Record<ListingStatus, ListingWorkspaceAction[]>> =
    {
      APPROVED: ['RETURN_TO_DRAFT', 'PUBLISH', 'WITHDRAW'],
      DRAFT: ['DECLARE_READY'],
      PAUSED: ['RESUME', 'WITHDRAW'],
      PUBLISHED: ['PAUSE', 'WITHDRAW'],
      READY: ['RETURN_TO_DRAFT', 'APPROVE'],
      WITHDRAWN: role === 'OWNER' || role === 'ADMIN' ? ['ARCHIVE'] : [],
    };
  actions.push(...(transitions[listing.status] ?? []));
  if (listing.status === 'DRAFT' && (role === 'OWNER' || role === 'ADMIN')) {
    actions.push('ARCHIVE');
  }
  return actions;
}

export function listingBlockerLabel(blocker: ListingReadinessBlocker) {
  const labels: Record<string, string> = {
    LISTING_CHANNEL: 'Selecciona al menos un canal.',
    LISTING_COPY: 'Completa el texto público con al menos 30 caracteres.',
    LISTING_TITLE: 'Completa un título comercial.',
    MANDATE_NOT_READY: 'Relaciona un mandato activo, vigente y documentado.',
    MATERIAL_COVER: 'Agrega una imagen de portada vigente.',
    MATERIAL_EMPTY: 'Agrega al menos un material comercial.',
    PROPERTY_AVAILABILITY: 'Define la disponibilidad del alquiler.',
    PROPERTY_CURRENCY: 'Corrige la moneda de la propiedad.',
    PROPERTY_LOCATION: 'Completa país, ciudad, zona y tipo.',
    PROPERTY_OPERATION: 'La propiedad no admite esta modalidad.',
    PROPERTY_PRICE: 'Define un precio mayor que cero.',
    PROPERTY_STATUS: 'Activa la propiedad antes de preparar la publicación.',
  };
  return labels[blocker.code] ?? `Pendiente: ${blocker.code}`;
}

export function listingActionLabel(action: ListingWorkspaceAction) {
  const labels: Record<ListingWorkspaceAction, string> = {
    ADD_MATERIAL: 'Agregar material',
    APPROVE: 'Aprobar',
    ARCHIVE: 'Archivar',
    DECLARE_READY: 'Declarar listo',
    EDIT: 'Editar preparación',
    PAUSE: 'Pausar',
    PUBLISH: 'Publicar',
    RESUME: 'Reanudar',
    RETURN_TO_DRAFT: 'Devolver a preparación',
    WITHDRAW: 'Retirar',
  };
  return labels[action];
}

export function listingEventLabel(action: string) {
  return (
    (
      {
        APPROVE: 'Publicación aprobada',
        ARCHIVE: 'Publicación archivada',
        CREATED: 'Borrador creado',
        DECLARE_READY: 'Declarada lista',
        MATERIAL_ADDED: 'Material agregado',
        MATERIAL_ARCHIVED: 'Material archivado',
        MATERIAL_REORDERED: 'Material reordenado',
        MATERIAL_REPLACED: 'Material reemplazado',
        PAUSE: 'Publicación pausada',
        PUBLISH: 'Publicación registrada',
        RESUME: 'Publicación reanudada',
        RETURN_TO_DRAFT: 'Devuelta a preparación',
        UPDATED: 'Preparación actualizada',
        WITHDRAW: 'Publicación retirada',
      } satisfies Record<string, string>
    )[action] ?? action
  );
}

export function idempotencyKey(scope: string) {
  return `${scope}:${crypto.randomUUID()}`;
}
