import type { Channel, InteractionType, LeadStatus, NotificationType, Role } from './enums.ts'
import type { Priority } from './priority.ts'

// Contratos de respuesta del API; las fechas viajan como ISO 8601.

export interface UserRef {
  id: string
  name: string
}

export interface SessionUser extends UserRef {
  email: string
  role: Role
}

export interface CatalogRef {
  id: string
  name: string
}

export interface LeadListItem {
  id: string
  code: string
  /** Creado por un canal digital, sin intervencion de una persona. */
  autoCaptured: boolean
  entryDate: string
  contactName: string
  company: string | null
  phone: string | null
  email: string | null
  channel: Channel
  businessLine: CatalogRef
  product: CatalogRef | null
  status: LeadStatus
  assignedTo: UserRef | null
  nextAction: string | null
  nextActionAt: string | null
  priority: Priority
  updatedAt: string
}

/** Lead previo con el mismo telefono o correo; canOpen es falso si el vendedor no tiene acceso a el. */
export interface DuplicateMatch {
  assignedTo: UserRef | null
  canOpen: boolean
  code: string
  company: string | null
  contactName: string
  entryDate: string
  matchedBy: ('email' | 'phone')[]
  status: LeadStatus
}

/** Horas desde que entra un lead hasta que se marca Contactado (o una etapa posterior). */
export interface ResponseTimeRow {
  avgHours: number
  contacted: number
  key: string
  label: string
}

export interface Interaction {
  id: string
  type: InteractionType
  content: string
  fromStatus: LeadStatus | null
  toStatus: LeadStatus | null
  user: UserRef | null
  createdAt: string
}

export interface LeadDetail extends LeadListItem {
  description: string
  lossReason: string | null
  createdBy: UserRef | null
  createdAt: string
  interactions: Interaction[]
  canEdit: boolean
  canDelete: boolean
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Listado de leads con los conteos por estado de los filtros actuales (sin aplicar el filtro de estado). */
export interface LeadListResponse extends Paginated<LeadListItem> {
  statusCounts: Record<LeadStatus, number>
}

export interface CountItem<K extends string = string> {
  key: K
  label: string
  count: number
}

export interface DashboardData {
  range: { from: string; to: string }
  kpis: {
    total: number
    open: number
    opportunities: number
    won: number
    lost: number
    winRate: number
    /** Acciones de leads abiertos: vencidas, para hoy y para los proximos 7 dias (sin contar hoy). */
    overdue: number
    dueToday: number
    dueWeek: number
  }
  byStatus: CountItem<LeadStatus>[]
  byChannel: CountItem<Channel>[]
  byLine: CountItem[]
  series: { period: string; count: number }[]
  response: {
    avgHours: number | null
    byChannel: ResponseTimeRow[]
    bySeller: ResponseTimeRow[]
    contacted: number
    /** Abiertos del periodo que nadie ha contactado todavia. */
    pending: number
    /** Porcentaje de los contactados que lo fueron en menos de 24 horas. */
    within24h: number
  }
  upcoming: Pick<LeadListItem, 'code' | 'contactName' | 'company' | 'nextAction' | 'nextActionAt' | 'status' | 'assignedTo'>[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}

export interface Catalogs {
  lines: (CatalogRef & { active: boolean })[]
  products: (CatalogRef & { active: boolean; businessLineId: string })[]
  users: (UserRef & { role: Role })[]
}

export interface NotificationItem {
  id: string
  type: NotificationType
  message: string
  lead: { code: string; contactName: string }
  actor: UserRef | null
  readAt: string | null
  createdAt: string
}

/** Avisos recientes del usuario y sus acciones vencidas, que se calculan al consultar. */
export interface NotificationsResponse {
  items: NotificationItem[]
  unread: number
  overdue: number
}
