'use client';

import {
  BadgeCheck,
  FileText,
  IdCard,
  Keyboard,
  Loader2,
  Plus,
  RefreshCcw,
  Upload,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  ClientIdentityDocumentType,
  ClientRole,
  ClientStatus,
  ClientsResponse,
  CreateClientPayload,
  MembershipRole,
  OrganizationClient,
} from '../lib/api';
import {
  extractPassportMrz,
  parsePassportMrz,
  PassportMrzData,
} from '../lib/passport-mrz';
import {
  NationalIdOcrData,
  parseNationalIdOcr,
} from '../lib/national-id-ocr';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  LoadingState,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from './ui';

type ClientFilters = {
  search: string;
  status: string;
  role: string;
};

type ClientCreateMode = 'manual' | 'passport' | 'national_id';

type IdentityOcrStatus = 'idle' | 'reading' | 'ready' | 'error';

type IdentityDocumentPayload = NonNullable<CreateClientPayload['identityDocument']>;

const clientWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
]);

const roleOptions: Array<{ value: ClientRole; label: string }> = [
  { value: 'BUYER', label: 'Comprador' },
  { value: 'SELLER', label: 'Vendedor' },
  { value: 'LESSOR', label: 'Arrendador' },
  { value: 'LESSEE', label: 'Arrendatario' },
  { value: 'INVESTOR', label: 'Inversionista' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'REFERRER', label: 'Referidor' },
  { value: 'RELATED_CONTACT', label: 'Relacionado' },
];

const propertyTypeOptions = [
  'Apartamento',
  'Casa',
  'Local comercial',
  'Oficina',
  'Terreno',
  'Bodega',
];

const statusTone: Record<ClientStatus, 'primary' | 'success' | 'warning' | 'neutral'> = {
  NEW: 'primary',
  ACTIVE: 'success',
  NURTURING: 'warning',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
};

export function ClientsWorkspace() {
  const formRef = useRef<HTMLFormElement>(null);
  const documentReadIdRef = useRef(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [clients, setClients] = useState<OrganizationClient[]>([]);
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    status: '',
    role: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [createMode, setCreateMode] = useState<ClientCreateMode>('manual');
  const [identityDocumentPayload, setIdentityDocumentPayload] =
    useState<IdentityDocumentPayload | null>(null);
  const [passportData, setPassportData] = useState<PassportMrzData | null>(null);
  const [nationalIdData, setNationalIdData] = useState<NationalIdOcrData | null>(
    null,
  );
  const [passportError, setPassportError] = useState<string | null>(null);
  const [passportFileName, setPassportFileName] = useState<string | null>(null);
  const [passportMrz, setPassportMrz] = useState('');
  const [passportStatus, setPassportStatus] =
    useState<IdentityOcrStatus>('idle');

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar clientes.');
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sesion no disponible.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshClients(filters, activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Clientes no disponibles.');
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const canCreateClients = activeMembership
    ? clientWriteRoles.has(activeMembership.role)
    : false;

  const metrics = useMemo(() => {
    const active = clients.filter((client) => client.status === 'ACTIVE').length;
    const hot = clients.filter((client) => client.temperature === 'HOT').length;
    const followUps = clients.filter((client) => client.nextFollowUpAt).length;

    return { active, hot, followUps };
  }, [clients]);

  async function refreshClients(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams();
    query.set('organizationId', organizationId);

    if (nextFilters.search) {
      query.set('search', nextFilters.search);
    }

    if (nextFilters.status) {
      query.set('status', nextFilters.status);
    }

    if (nextFilters.role) {
      query.set('role', nextFilters.role);
    }

    const response = await apiFetch<ClientsResponse>(
      `/clients${query.size > 0 ? `?${query.toString()}` : ''}`,
    );
    setClients(response.clients);
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
      role: stringValue(form, 'role') ?? '',
    });
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !canCreateClients) {
      setFormError('No tienes permiso para crear clientes en esta organizacion.');
      return;
    }

    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      if (passportStatus === 'reading') {
        throw new Error('Espera a que termine la lectura del documento.');
      }

      if (createMode !== 'manual' && !identityDocumentPayload) {
        throw new Error('Carga el documento de identidad antes de crear el cliente.');
      }

      const payload = {
        ...buildClientPayload(form),
        ...(identityDocumentPayload
          ? { identityDocument: identityDocumentPayload }
          : {}),
        organizationId: activeOrganizationId,
      };
      const response = await apiFetch<{ client: OrganizationClient }>('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setClients((current) => [response.client, ...current]);
      setIsDrawerOpen(false);
      event.currentTarget.reset();
      resetIdentityDocumentIntake();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo crear el cliente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateClientDrawer() {
    setFormError(null);
    resetIdentityDocumentIntake();
    setIsDrawerOpen(true);
  }

  function closeCreateClientDrawer() {
    setIsDrawerOpen(false);
    setFormError(null);
    resetIdentityDocumentIntake();
  }

  function selectCreateMode(mode: ClientCreateMode) {
    documentReadIdRef.current += 1;
    setCreateMode(mode);
    setIdentityDocumentPayload(null);
    setPassportData(null);
    setNationalIdData(null);
    setPassportError(null);
    setPassportFileName(null);
    setPassportMrz('');
    setPassportStatus('idle');
  }

  function resetIdentityDocumentIntake() {
    documentReadIdRef.current += 1;
    setCreateMode('manual');
    setIdentityDocumentPayload(null);
    setPassportData(null);
    setNationalIdData(null);
    setPassportError(null);
    setPassportFileName(null);
    setPassportMrz('');
    setPassportStatus('idle');
  }

  async function processIdentityDocumentImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const input = event.currentTarget;
    const readId = documentReadIdRef.current + 1;

    if (!file) {
      return;
    }

    if (!isSupportedIdentityFile(file)) {
      setPassportStatus('error');
      setPassportError('El documento debe ser una imagen JPEG, PNG o WebP.');
      input.value = '';
      return;
    }

    const documentType = createModeToDocumentType(createMode);

    if (!documentType) {
      input.value = '';
      return;
    }

    documentReadIdRef.current = readId;
    setPassportData(null);
    setNationalIdData(null);
    setPassportError(null);
    setPassportFileName(file.name);
    setPassportStatus('reading');

    try {
      const basePayload = await fileToIdentityDocumentPayload(file, documentType);
      setIdentityDocumentPayload(basePayload);

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');

      try {
        if (documentType === 'PASSPORT') {
          await worker.setParameters({
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
          });
        }

        const {
          data: { text },
        } = await worker.recognize(file, { rotateAuto: true });

        if (documentReadIdRef.current !== readId) {
          return;
        }

        if (documentType === 'PASSPORT') {
          const detectedMrz = extractPassportMrz(text);

          if (!detectedMrz) {
            setIdentityDocumentPayload({
              ...basePayload,
              ocrText: text,
            });
            throw new Error(
              'No se detecto la MRZ del pasaporte. Puedes pegarla o corregirla manualmente.',
            );
          }

          setPassportMrz(detectedMrz);
          applyPassportMrz(detectedMrz, {
            ...basePayload,
            ocrText: text,
          });
        } else {
          const parsed = parseNationalIdOcr(text);
          setNationalIdData(parsed);
          setPassportStatus('ready');
          setIdentityDocumentPayload({
            ...basePayload,
            documentNumber: parsed.documentNumber ?? undefined,
            firstName: parsed.firstName ?? undefined,
            lastName: parsed.lastName ?? undefined,
            ocrText: parsed.rawText,
            extractedData: {
              parser: 'generic-national-id-ocr',
            },
          });
          fillFormFromNationalId(parsed);
        }
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      if (documentReadIdRef.current !== readId) {
        return;
      }

      setPassportStatus('error');
      setPassportError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo leer el pasaporte.',
      );
    } finally {
      input.value = '';
    }
  }

  function applyPassportMrz(
    nextMrz = passportMrz,
    basePayload = identityDocumentPayload,
  ) {
    try {
      const parsed = parsePassportMrz(nextMrz);
      setPassportData(parsed);
      setPassportError(null);
      setPassportStatus('ready');
      if (basePayload) {
        setIdentityDocumentPayload({
          ...basePayload,
          type: 'PASSPORT',
          documentNumber: parsed.documentNumber,
          issuingCountry: parsed.issuingCountry,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          birthDate: parsed.birthDate ?? undefined,
          expirationDate: parsed.expirationDate ?? undefined,
          extractedData: {
            mrz: parsed.mrz,
            parser: 'td3-mrz',
            sex: parsed.sex,
          },
        });
      }
      fillFormFromPassport(parsed);
    } catch (caught) {
      setPassportData(null);
      setPassportStatus('error');
      setPassportError(
        caught instanceof Error
          ? caught.message
          : 'La MRZ no pudo interpretarse.',
      );
    }
  }

  function fillFormFromPassport(data: PassportMrzData) {
    const form = formRef.current;

    if (!form) {
      return;
    }

    setFormValue(form, 'type', 'PERSON');
    setFormValue(form, 'firstName', data.firstName);
    setFormValue(form, 'lastName', data.lastName);
    setFormValue(form, 'legalId', data.documentNumber);
    setFormValue(form, 'country', data.nationality || data.issuingCountry);
    setFormValue(form, 'source', 'Pasaporte');
    setFormValue(form, 'notes', passportNotes(data, form));
  }

  function fillFormFromNationalId(data: NationalIdOcrData) {
    const form = formRef.current;

    if (!form) {
      return;
    }

    setFormValue(form, 'type', 'PERSON');
    setFormValue(form, 'legalId', data.documentNumber);
    setFormValue(form, 'firstName', data.firstName);
    setFormValue(form, 'lastName', data.lastName);
    setFormValue(form, 'source', 'Cedula');
    setFormValue(form, 'notes', nationalIdNotes(data, form));
  }

  return (
    <>
      <PageHeader
        eyebrow="Relaciones"
        title="Clientes"
        description={
          activeMembership
            ? `Personas, empresas y propietarios de ${activeMembership.organizationName}.`
            : 'Personas, empresas y propietarios conectados a una necesidad inmobiliaria concreta.'
        }
        actions={
          <button
            className="button primary"
            disabled={!canCreateClients}
            onClick={openCreateClientDrawer}
            type="button"
          >
            <Plus size={17} strokeWidth={2.2} />
            Nuevo cliente
          </button>
        }
      />

      <section className="summary-strip" aria-label="Resumen de clientes">
        <div>
          <span>Total</span>
          <strong>{clients.length}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Alta prioridad</span>
          <strong>{metrics.hot}</strong>
        </div>
        <div>
          <span>Seguimientos</span>
          <strong>{metrics.followUps}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <select
              aria-label="Organizacion"
              onChange={(event) => setActiveOrganizationId(event.target.value)}
              value={activeOrganizationId ?? ''}
            >
              {organizations.map((membership) => (
                <option
                  key={membership.organizationId}
                  value={membership.organizationId}
                >
                  {membership.organizationName}
                </option>
              ))}
            </select>
          ) : null}
          <label className="search-input">
            <Users size={17} strokeWidth={2.2} />
            <input
              aria-label="Buscar cliente"
              defaultValue={filters.search}
              name="search"
              placeholder="Buscar cliente, email, telefono o empresa"
            />
          </label>
          <select aria-label="Estado" defaultValue={filters.status} name="status">
            <option value="">Todos los estados</option>
            <option value="NEW">Nuevos</option>
            <option value="ACTIVE">Activos</option>
            <option value="NURTURING">Nutricion</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
          <select aria-label="Rol comercial" defaultValue={filters.role} name="role">
            <option value="">Todos los roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button className="button secondary" type="submit">
            Aplicar
          </button>
        </FilterBar>
      </form>

      <section className="dashboard-grid">
        {isLoading ? (
          <LoadingState
            description="Consultando clientes de la organizacion activa."
            title="Cargando clientes"
          />
        ) : error ? (
          <ErrorState
            action={
              <button
                className="button secondary"
                onClick={() => refreshClients()}
                type="button"
              >
                <RefreshCcw size={16} strokeWidth={2.2} />
                Reintentar
              </button>
            }
            description={error}
            title="No se pudo cargar clientes"
          />
        ) : (
          <DataTable
            columns={[
              { key: 'client', label: 'Cliente' },
              { key: 'roles', label: 'Roles' },
              { key: 'interest', label: 'Interes' },
              { key: 'budget', label: 'Presupuesto' },
              { key: 'followUp', label: 'Seguimiento' },
              { key: 'owner', label: 'Owner' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreateClients ? (
                    <button
                      className="button primary"
                      onClick={openCreateClientDrawer}
                      type="button"
                    >
                      <UserRoundPlus size={17} strokeWidth={2.2} />
                      Crear primer cliente
                    </button>
                  ) : undefined
                }
                description={
                  canCreateClients
                    ? 'Crea clientes con roles comerciales, presupuesto, preferencias y proxima accion para alimentar el ciclo inmobiliario.'
                    : 'Tu rol actual permite consultar clientes, pero no crear registros en esta organizacion.'
                }
                icon={Users}
                title="Sin clientes registrados"
              />
            }
            rows={clients.map((client) => ({
              id: client.id,
              cells: {
                client: (
                  <span>
                    <strong className="entity-title">{client.displayName}</strong>
                    <span className="meta-row">
                      {client.email ?? client.phone ?? 'Sin contacto principal'}
                    </span>
                    {client.identityDocumentValidated ? (
                      <span className="identity-seal">
                        <BadgeCheck size={13} strokeWidth={2.4} />
                        Validado por documento
                      </span>
                    ) : null}
                  </span>
                ),
                roles: (
                  <span className="badge-cluster">
                    {client.roles.slice(0, 2).map((role) => (
                      <StatusBadge key={role} tone="primary">
                        {roleLabel(role)}
                      </StatusBadge>
                    ))}
                    {client.roles.length > 2 ? (
                      <StatusBadge tone="neutral">+{client.roles.length - 2}</StatusBadge>
                    ) : null}
                  </span>
                ),
                interest: (
                  <span>
                    <strong className="entity-title">
                      {interestLabel(client.interestType)}
                    </strong>
                    <span className="meta-row">
                      {client.preferredZones.join(', ') || client.zone || 'Zona abierta'}
                    </span>
                  </span>
                ),
                budget: formatBudget(client),
                followUp: (
                  <StatusBadge tone={statusTone[client.status]}>
                    {statusLabel(client.status)}
                  </StatusBadge>
                ),
                owner: client.assignedUser
                  ? `${client.assignedUser.firstName} ${
                      client.assignedUser.lastName ?? ''
                    }`.trim()
                  : 'Sin owner',
              },
            }))}
          />
        )}

        <SectionPanel
          title="Ficha minima"
          description="El alta de clientes exige contexto comercial suficiente para que el siguiente asesor pueda actuar sin reconstruir la historia."
        >
          <div className="compact-list">
            <div className="split-row">
              <span>
                <strong className="entity-title">Organizacion activa</strong>
                <span className="meta-row">
                  {activeMembership?.organizationName ?? 'Sin organizacion activa'}
                </span>
              </span>
              <StatusBadge tone={canCreateClients ? 'success' : 'neutral'}>
                {canCreateClients ? 'Escritura' : 'Lectura'}
              </StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Roles multiples</strong>
                <span className="meta-row">Comprador, vendedor, arrendador o lead.</span>
              </span>
              <StatusBadge tone="primary">Base</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Preferencia inmobiliaria</strong>
                <span className="meta-row">Zonas, presupuesto, tipo y tiempo de decision.</span>
              </span>
              <StatusBadge tone="featured">Contexto</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Seguimiento</strong>
                <span className="meta-row">Estado, temperatura, responsable y proxima accion.</span>
              </span>
              <StatusBadge tone="warning">SLA</StatusBadge>
            </div>
          </div>
        </SectionPanel>
      </section>

      <FormDrawer
        description="Registra identidad, contacto, roles y necesidad inmobiliaria para iniciar seguimiento operativo."
        footer={
          <>
            <button
              className="button secondary"
              disabled={isSubmitting}
              onClick={closeCreateClientDrawer}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={isSubmitting || passportStatus === 'reading'}
              form="client-create-form"
              type="submit"
            >
              {isSubmitting ? 'Guardando...' : 'Crear cliente'}
            </button>
          </>
        }
        onClose={closeCreateClientDrawer}
        open={isDrawerOpen && canCreateClients}
        title="Nuevo cliente"
      >
        <form
          className="drawer-form"
          id="client-create-form"
          onSubmit={createClient}
          ref={formRef}
        >
          <section className="form-section">
            <div>
              <h3>Metodo de alta</h3>
              <p>Selecciona entrada manual o precarga desde documento de identidad.</p>
            </div>
            <div className="intake-mode-toggle" aria-label="Metodo de alta">
              <button
                className={createMode === 'manual' ? 'mode-button active' : 'mode-button'}
                onClick={() => selectCreateMode('manual')}
                type="button"
              >
                <Keyboard size={18} strokeWidth={2.2} />
                Manual
              </button>
              <button
                className={
                  createMode === 'passport' ? 'mode-button active' : 'mode-button'
                }
                onClick={() => selectCreateMode('passport')}
                type="button"
              >
                <FileText size={18} strokeWidth={2.2} />
                Pasaporte
              </button>
              <button
                className={
                  createMode === 'national_id' ? 'mode-button active' : 'mode-button'
                }
                onClick={() => selectCreateMode('national_id')}
                type="button"
              >
                <IdCard size={18} strokeWidth={2.2} />
                Cedula
              </button>
            </div>
          </section>

          {createMode !== 'manual' ? (
            <section className="form-section">
              <div>
                <h3>
                  {createMode === 'passport'
                    ? 'Lectura de pasaporte'
                    : 'Lectura de cedula'}
                </h3>
                <p>La imagen se procesa localmente, se guarda con el alta y no implica KYC.</p>
              </div>
              <label className="passport-upload">
                <Upload size={18} strokeWidth={2.2} />
                <span>
                  <strong>Seleccionar imagen</strong>
                  <small>{passportFileName ?? 'JPG, PNG o WebP del documento'}</small>
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={passportStatus === 'reading'}
                  onChange={processIdentityDocumentImage}
                  type="file"
                />
              </label>

              {createMode === 'passport' ? (
                <>
                  <label>
                    MRZ detectada
                    <textarea
                      className="mrz-textarea"
                      onChange={(event) => setPassportMrz(event.target.value)}
                      placeholder="P<PANAPELLIDO<<NOMBRES..."
                      value={passportMrz}
                    />
                  </label>

                  <div className="passport-actions">
                    <button
                      className="button secondary"
                      disabled={passportStatus === 'reading' || !passportMrz.trim()}
                      onClick={() => applyPassportMrz()}
                      type="button"
                    >
                      {passportStatus === 'reading' ? (
                        <Loader2 size={16} strokeWidth={2.2} />
                      ) : (
                        <FileText size={16} strokeWidth={2.2} />
                      )}
                      Aplicar datos
                    </button>
                    {passportStatus === 'reading' ? (
                      <span className="passport-status">Leyendo documento...</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="passport-actions">
                  {passportStatus === 'reading' ? (
                    <>
                      <Loader2 size={16} strokeWidth={2.2} />
                      <span className="passport-status">Leyendo documento...</span>
                    </>
                  ) : identityDocumentPayload ? (
                    <span className="passport-status">
                      Documento listo para guardar con el cliente.
                    </span>
                  ) : null}
                </div>
              )}

              {passportError ? <p className="form-error">{passportError}</p> : null}

              {identityDocumentPayload ? (
                <div className="passport-result" aria-live="polite">
                  <span>
                    <strong>Archivo</strong>
                    {identityDocumentPayload.fileName}
                  </span>
                  <span>
                    <strong>Tipo</strong>
                    {identityDocumentLabel(identityDocumentPayload.type)}
                  </span>
                  <span>
                    <strong>Documento</strong>
                    {identityDocumentPayload.documentNumber ?? 'Pendiente'}
                  </span>
                  <span>
                    <strong>Estado</strong>
                    Guardado al crear
                  </span>
                </div>
              ) : null}

              {passportData ? (
                <div className="passport-result compact" aria-live="polite">
                  <span>
                    <strong>Nombre MRZ</strong>
                    {passportData.firstName} {passportData.lastName}
                  </span>
                  <span>
                    <strong>Expira</strong>
                    {passportData.expirationDate ?? 'Sin fecha'}
                  </span>
                </div>
              ) : null}

              {nationalIdData ? (
                <div className="passport-result compact" aria-live="polite">
                  <span>
                    <strong>Nombre OCR</strong>
                    {[nationalIdData.firstName, nationalIdData.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Pendiente'}
                  </span>
                  <span>
                    <strong>Cedula</strong>
                    {nationalIdData.documentNumber ?? 'Pendiente'}
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="form-section">
            <div>
              <h3>Identificacion basica</h3>
              <p>Datos minimos para reconocer al cliente en la organizacion.</p>
            </div>
            <div className="form-grid two">
              <label>
                Tipo
                <select defaultValue="PERSON" name="type">
                  <option value="PERSON">Persona</option>
                  <option value="COMPANY">Empresa</option>
                </select>
              </label>
              <label>
                Cedula, pasaporte o RUC
                <input name="legalId" placeholder="8-000-000" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Nombre
                <input name="firstName" placeholder="Maria" />
              </label>
              <label>
                Apellido
                <input name="lastName" placeholder="Moreno" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Empresa
                <input name="companyName" placeholder="Grupo Terra" />
              </label>
              <span className="form-hint">Persona requiere nombre; empresa requiere razon social.</span>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Contacto principal</h3>
              <p>Email, telefono o WhatsApp son requeridos para activar seguimiento.</p>
            </div>
            <div className="form-grid two">
              <label>
                Email
                <input name="email" placeholder="cliente@correo.com" type="email" />
              </label>
              <label>
                Metodo preferido
                <select defaultValue="WHATSAPP" name="preferredContactMethod">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Telefono</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="IN_PERSON">Presencial</option>
                </select>
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Telefono
                <input name="phone" placeholder="+507 6000-0000" />
              </label>
              <label>
                WhatsApp
                <input name="whatsapp" placeholder="+507 6000-0000" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Roles comerciales</h3>
              <p>Selecciona al menos un rol dentro del ciclo inmobiliario.</p>
            </div>
            <div className="option-grid">
              {roleOptions.map((role) => (
                <label className="check-card" key={role.value}>
                  <input
                    defaultChecked={role.value === 'LEAD'}
                    name="roles"
                    type="checkbox"
                    value={role.value}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
          </section>

          <details className="form-collapsible">
            <summary>Datos operativos</summary>
            <div className="form-section">
              <div>
                <h3>Estado y asignacion</h3>
                <p>Clasificacion inicial para operacion interna.</p>
              </div>
              <div className="form-grid three">
                <label>
                  Estado
                  <select defaultValue="NEW" name="status">
                    <option value="NEW">Nuevo</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="NURTURING">Nutricion</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </label>
                <label>
                  Temperatura
                  <select defaultValue="WARM" name="temperature">
                    <option value="COLD">Frio</option>
                    <option value="WARM">Tibio</option>
                    <option value="HOT">Alta prioridad</option>
                  </select>
                </label>
              <label>
                Alterno
                <input name="alternatePhone" placeholder="+507 6000-0001" />
              </label>
              </div>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Ubicacion y origen</summary>
            <div className="form-section">
              <div>
                <h3>Contexto de captacion</h3>
                <p>Mercado, zona y fuente para segmentacion.</p>
              </div>
              <div className="form-grid three">
                <label>
                  Pais
                  <input defaultValue="Panama" name="country" />
                </label>
                <label>
                  Ciudad
                  <input name="city" placeholder="Panama" />
                </label>
                <label>
                  Zona actual
                  <input name="zone" placeholder="Costa del Este" />
                </label>
              </div>
              <div className="form-grid two">
                <label>
                  Direccion
                  <input name="address" placeholder="Calle, edificio o referencia" />
                </label>
                <label>
                  Fuente
                  <input name="source" placeholder="Referido, portal, evento" />
                </label>
              </div>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Necesidad inmobiliaria</summary>
            <div className="form-section">
              <div>
                <h3>Preferencias comerciales</h3>
                <p>Informacion para conectar clientes con propiedades y procesos.</p>
              </div>
              <div className="form-grid three">
                <label>
                  Interes
                  <select defaultValue="BUY" name="interestType">
                    <option value="BUY">Compra</option>
                    <option value="RENT">Alquiler</option>
                    <option value="SELL">Venta</option>
                    <option value="LEASE">Dar en alquiler</option>
                    <option value="INVEST">Inversion</option>
                    <option value="MANAGE">Administracion</option>
                    <option value="REFER">Referir</option>
                  </select>
                </label>
                <label>
                  Tiempo de decision
                  <select defaultValue="EXPLORING" name="timeline">
                    <option value="IMMEDIATE">Inmediato</option>
                    <option value="ONE_TO_THREE_MONTHS">1 a 3 meses</option>
                    <option value="THREE_TO_SIX_MONTHS">3 a 6 meses</option>
                    <option value="SIX_PLUS_MONTHS">6+ meses</option>
                    <option value="EXPLORING">Explorando</option>
                  </select>
                </label>
                <label>
                  Financiamiento
                  <select defaultValue="UNKNOWN" name="financingStatus">
                    <option value="CASH">Contado</option>
                    <option value="PRE_APPROVED">Preaprobado</option>
                    <option value="NEEDS_FINANCING">Necesita financiamiento</option>
                    <option value="UNKNOWN">Por definir</option>
                  </select>
                </label>
              </div>
              <div className="form-grid three">
                <label>
                  Presupuesto min.
                  <input min="0" name="budgetMin" placeholder="250000" type="number" />
                </label>
                <label>
                  Presupuesto max.
                  <input min="0" name="budgetMax" placeholder="450000" type="number" />
                </label>
                <label>
                  Moneda
                  <input defaultValue="USD" name="currency" />
                </label>
              </div>
              <div className="option-grid">
                {propertyTypeOptions.map((type) => (
                  <label className="check-card" key={type}>
                    <input name="propertyTypes" type="checkbox" value={type} />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              <label>
                Zonas preferidas
                <input
                  name="preferredZones"
                  placeholder="Costa del Este, Santa Maria, San Francisco"
                />
              </label>
              <div className="form-grid three">
                <label>
                  Recamaras min.
                  <input min="0" name="bedroomsMin" type="number" />
                </label>
                <label>
                  Banos min.
                  <input min="0" name="bathroomsMin" type="number" />
                </label>
                <label>
                  Parkings min.
                  <input min="0" name="parkingMin" type="number" />
                </label>
              </div>
              <div className="form-grid two">
                <label>
                  Area min.
                  <input min="0" name="areaMin" placeholder="80" type="number" />
                </label>
                <label>
                  Area max.
                  <input min="0" name="areaMax" placeholder="180" type="number" />
                </label>
              </div>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Seguimiento y permisos</summary>
            <div className="form-section">
              <div>
                <h3>Proxima accion</h3>
                <p>Notas, tags y consentimientos para continuidad operativa.</p>
              </div>
              <div className="form-grid two">
                <label>
                  Ultimo contacto
                  <input name="lastContactAt" type="date" />
                </label>
                <label>
                  Proximo seguimiento
                  <input name="nextFollowUpAt" type="date" />
                </label>
              </div>
              <label>
                Tags
                <input name="tags" placeholder="VIP, inversion, referido" />
              </label>
              <label>
                Notas
                <textarea name="notes" placeholder="Necesidad, objeciones, preferencias y proxima accion." />
              </label>
              <div className="consent-list">
                <label className="inline-check">
                  <input name="marketingConsent" type="checkbox" />
                  Acepta comunicaciones comerciales
                </label>
                <label className="inline-check">
                  <input name="dataConsent" type="checkbox" />
                  Autoriza tratamiento de datos
                </label>
              </div>
            </div>
          </details>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormDrawer>
    </>
  );
}

function activeMemberships(user: AuthUser | null): AuthMembership[] {
  return (
    user?.memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organizationStatus === 'ACTIVE',
    ) ?? []
  );
}

function buildClientPayload(form: FormData): CreateClientPayload {
  return compactPayload({
    type: stringValue(form, 'type'),
    roles: form.getAll('roles').map(String) as ClientRole[],
    status: stringValue(form, 'status'),
    temperature: stringValue(form, 'temperature'),
    firstName: stringValue(form, 'firstName'),
    lastName: stringValue(form, 'lastName'),
    companyName: stringValue(form, 'companyName'),
    legalId: stringValue(form, 'legalId'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    alternatePhone: stringValue(form, 'alternatePhone'),
    whatsapp: stringValue(form, 'whatsapp'),
    preferredContactMethod: stringValue(form, 'preferredContactMethod'),
    country: stringValue(form, 'country'),
    city: stringValue(form, 'city'),
    zone: stringValue(form, 'zone'),
    address: stringValue(form, 'address'),
    source: stringValue(form, 'source'),
    interestType: stringValue(form, 'interestType'),
    budgetMin: numberValue(form, 'budgetMin'),
    budgetMax: numberValue(form, 'budgetMax'),
    currency: stringValue(form, 'currency'),
    preferredZones: csvValue(form, 'preferredZones'),
    propertyTypes: form.getAll('propertyTypes').map(String),
    bedroomsMin: numberValue(form, 'bedroomsMin'),
    bathroomsMin: numberValue(form, 'bathroomsMin'),
    parkingMin: numberValue(form, 'parkingMin'),
    areaMin: numberValue(form, 'areaMin'),
    areaMax: numberValue(form, 'areaMax'),
    timeline: stringValue(form, 'timeline'),
    financingStatus: stringValue(form, 'financingStatus'),
    lastContactAt: stringValue(form, 'lastContactAt'),
    nextFollowUpAt: stringValue(form, 'nextFollowUpAt'),
    notes: stringValue(form, 'notes'),
    tags: csvValue(form, 'tags'),
    marketingConsent: form.get('marketingConsent') === 'on',
    dataConsent: form.get('dataConsent') === 'on',
  }) as CreateClientPayload;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== '';
    }),
  );
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(form: FormData, key: string) {
  const value = stringValue(form, key);

  return value ? Number(value) : undefined;
}

function csvValue(form: FormData, key: string) {
  return (
    stringValue(form, key)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function createModeToDocumentType(
  mode: ClientCreateMode,
): ClientIdentityDocumentType | null {
  if (mode === 'passport') {
    return 'PASSPORT';
  }

  if (mode === 'national_id') {
    return 'NATIONAL_ID';
  }

  return null;
}

function isSupportedIdentityFile(file: File) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

async function fileToIdentityDocumentPayload(
  file: File,
  type: ClientIdentityDocumentType,
): Promise<IdentityDocumentPayload> {
  return {
    type,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    fileBase64: await fileToDataUrl(file),
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo preparar el archivo.'));
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function setFormValue(form: HTMLFormElement, name: string, value: string | null) {
  if (!value) {
    return;
  }

  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function passportNotes(data: PassportMrzData, form: HTMLFormElement) {
  const existingNotes = stringValue(new FormData(form), 'notes');
  const detectedNotes = [
    `Pasaporte detectado: ${data.documentNumber}`,
    `Pais emisor: ${data.issuingCountry}`,
    `Nacionalidad: ${data.nationality}`,
    data.birthDate ? `Fecha de nacimiento: ${data.birthDate}` : null,
    data.expirationDate ? `Fecha de expiracion: ${data.expirationDate}` : null,
    data.sex ? `Sexo MRZ: ${data.sex}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [existingNotes, detectedNotes].filter(Boolean).join('\n\n');
}

function nationalIdNotes(data: NationalIdOcrData, form: HTMLFormElement) {
  const existingNotes = stringValue(new FormData(form), 'notes');
  const detectedNotes = [
    data.documentNumber ? `Cedula detectada: ${data.documentNumber}` : null,
    data.firstName ? `Nombre OCR: ${data.firstName}` : null,
    data.lastName ? `Apellido OCR: ${data.lastName}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [existingNotes, detectedNotes].filter(Boolean).join('\n\n');
}

function identityDocumentLabel(type: ClientIdentityDocumentType) {
  return type === 'PASSPORT' ? 'Pasaporte' : 'Cedula';
}

function roleLabel(role: ClientRole) {
  return roleOptions.find((item) => item.value === role)?.label ?? role;
}

function statusLabel(status: ClientStatus) {
  const labels: Record<ClientStatus, string> = {
    NEW: 'Nuevo',
    ACTIVE: 'Activo',
    NURTURING: 'Nutricion',
    INACTIVE: 'Inactivo',
    ARCHIVED: 'Archivado',
  };

  return labels[status];
}

function interestLabel(value: OrganizationClient['interestType']) {
  const labels: Record<string, string> = {
    BUY: 'Compra',
    RENT: 'Alquiler',
    SELL: 'Venta',
    LEASE: 'Dar en alquiler',
    INVEST: 'Inversion',
    MANAGE: 'Administracion',
    REFER: 'Referido',
  };

  return value ? labels[value] : 'Interes abierto';
}

function formatBudget(client: OrganizationClient) {
  if (client.budgetMin === null && client.budgetMax === null) {
    return 'Por definir';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    currency: client.currency,
    maximumFractionDigits: 0,
    style: 'currency',
  });

  if (client.budgetMin !== null && client.budgetMax !== null) {
    return `${formatter.format(client.budgetMin)} - ${formatter.format(
      client.budgetMax,
    )}`;
  }

  if (client.budgetMin !== null) {
    return `Desde ${formatter.format(client.budgetMin)}`;
  }

  return `Hasta ${formatter.format(client.budgetMax ?? 0)}`;
}
