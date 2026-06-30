export const dashboardMetrics = [
  {
    label: 'Propiedades activas',
    value: '128',
    detail: '18 publicadas, 42 en preparacion y 68 con seguimiento abierto.',
    tone: 'primary',
  },
  {
    label: 'Clientes en seguimiento',
    value: '342',
    detail: '31 nuevos esta semana y 57 con proxima accion venciendo.',
    tone: 'rent',
  },
  {
    label: 'Operaciones en funnel',
    value: '26',
    detail: '$4.8M estimados entre venta, alquiler y administracion.',
    tone: 'featured',
  },
  {
    label: 'Tareas de hoy',
    value: '9',
    detail: '3 criticas por SLA y 6 asignadas al equipo comercial.',
    tone: 'warning',
  },
] as const;

export const opportunityRows = [
  {
    id: 'opp-1',
    property: 'PH Costa Norte 1402',
    client: 'Familia Moreno',
    stage: 'Oferta enviada',
    owner: 'A. Ruiz',
    sla: 'Hoy',
    value: '$420,000',
    tone: 'featured',
  },
  {
    id: 'opp-2',
    property: 'Local Via Brasil',
    client: 'Grupo Terra',
    stage: 'Visita tecnica',
    owner: 'M. Diaz',
    sla: '24 h',
    value: '$6,800 / mes',
    tone: 'rent',
  },
  {
    id: 'opp-3',
    property: 'Lote Altos del Lago',
    client: 'Inversiones Cima',
    stage: 'Documentos',
    owner: 'L. Paredes',
    sla: '48 h',
    value: '$310,000',
    tone: 'primary',
  },
] as const;

export const activityItems = [
  {
    id: 'act-1',
    initials: 'AR',
    title: 'Validacion de owner completada',
    detail: 'SoyPMS Demo Realty quedo activa para operar.',
    status: 'Sistema',
    tone: 'success',
  },
  {
    id: 'act-2',
    initials: 'MD',
    title: 'Nueva visita agendada',
    detail: 'Local Via Brasil, martes 10:00 a.m.',
    status: 'Comercial',
    tone: 'rent',
  },
  {
    id: 'act-3',
    initials: 'LP',
    title: 'Checklist documental actualizado',
    detail: 'Contrato de corretaje y ficha KYC cargados.',
    status: 'Legal',
    tone: 'featured',
  },
] as const;

export const propertyRows = [
  {
    id: 'prop-1',
    property: 'PH Costa Norte 1402',
    location: 'Costa del Este',
    mode: 'Venta',
    price: '$420,000',
    status: 'Publicado',
    owner: 'A. Ruiz',
    tone: 'primary',
  },
  {
    id: 'prop-2',
    property: 'Local Via Brasil',
    location: 'Bella Vista',
    mode: 'Alquiler',
    price: '$6,800 / mes',
    status: 'Visitas',
    owner: 'M. Diaz',
    tone: 'rent',
  },
  {
    id: 'prop-3',
    property: 'Lote Altos del Lago',
    location: 'Panama Oeste',
    mode: 'Venta',
    price: '$310,000',
    status: 'Documentos',
    owner: 'L. Paredes',
    tone: 'featured',
  },
] as const;

export const clientRows = [
  {
    id: 'client-1',
    name: 'Familia Moreno',
    need: 'Apartamento 3 recamaras',
    budget: '$380K - $450K',
    nextAction: 'Negociar oferta',
    owner: 'A. Ruiz',
    tone: 'featured',
  },
  {
    id: 'client-2',
    name: 'Grupo Terra',
    need: 'Local comercial 180 m2',
    budget: '$5K - $7K / mes',
    nextAction: 'Visita tecnica',
    owner: 'M. Diaz',
    tone: 'rent',
  },
  {
    id: 'client-3',
    name: 'Inversiones Cima',
    need: 'Terreno para desarrollo',
    budget: '$250K - $350K',
    nextAction: 'Validar documentos',
    owner: 'L. Paredes',
    tone: 'primary',
  },
] as const;

export const userRows = [
  {
    id: 'usr-1',
    name: 'Ana Ruiz',
    email: 'ana@demo.soyre.local',
    role: 'OWNER',
    access: 'Activo',
    validation: 'Validado',
    tone: 'success',
  },
  {
    id: 'usr-2',
    name: 'Marco Diaz',
    email: 'marco@demo.soyre.local',
    role: 'BROKER',
    access: 'Activo',
    validation: 'Validado',
    tone: 'success',
  },
  {
    id: 'usr-3',
    name: 'Laura Paredes',
    email: 'laura@demo.soyre.local',
    role: 'OPERATIONS',
    access: 'Pendiente',
    validation: 'Por revisar',
    tone: 'warning',
  },
] as const;
