// Los valores coinciden con los enums de Prisma; las etiquetas son las visibles en la interfaz.

// Excepcion al orden alfabetico: los estados siguen el embudo comercial del documento de alcance,
// que es como Mercadeo los lee en el tablero y en los filtros.
export const LEAD_STATUSES = [
  'NUEVO',
  'ASIGNADO',
  'CONTACTADO',
  'EN_SEGUIMIENTO',
  'OPORTUNIDAD',
  'GANADO',
  'PERDIDO',
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO: 'Nuevo',
  ASIGNADO: 'Asignado',
  CONTACTADO: 'Contactado',
  EN_SEGUIMIENTO: 'En seguimiento',
  OPORTUNIDAD: 'Oportunidad comercial',
  GANADO: 'Ganado',
  PERDIDO: 'Perdido',
}

export const CLOSED_STATUSES: readonly LeadStatus[] = ['GANADO', 'PERDIDO']

export const CHANNELS = [
  'CORREO',
  'FACEBOOK',
  'FERIA',
  'INSTAGRAM',
  'LLAMADA',
  'OTRO',
  'SITIO_WEB',
  'VISITA_COMERCIAL',
  'WHATSAPP',
] as const
export type Channel = (typeof CHANNELS)[number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  CORREO: 'Correo',
  FACEBOOK: 'Facebook',
  FERIA: 'Feria',
  INSTAGRAM: 'Instagram',
  LLAMADA: 'Llamada',
  OTRO: 'Otro',
  SITIO_WEB: 'Sitio web',
  VISITA_COMERCIAL: 'Visita comercial',
  WHATSAPP: 'WhatsApp',
}

export const ROLES = ['ADMIN', 'VENDEDOR'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

export const INTERACTION_TYPES = ['ASIGNACION', 'CAMBIO_ESTADO', 'CREACION', 'MENSAJE', 'NOTA'] as const
export type InteractionType = (typeof INTERACTION_TYPES)[number]

export const NOTIFICATION_TYPES = ['ACTIVIDAD', 'ASIGNACION', 'LEAD_AUTOMATICO'] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

// Acciones que el API escribe en AuditLog; la columna es texto libre, asi que un registro viejo
// con otra accion se muestra con su codigo crudo.
export const AUDIT_ACTIONS = [
  'EXPORTACION_CSV',
  'EXPORTACION_EXCEL',
  'IMPORTACION',
  'LEAD_AUTOMATICO',
  'LEAD_ELIMINADO',
  'LEAD_FUSIONADO',
  'LOGIN',
  'USUARIO_ACTUALIZADO',
  'USUARIO_CREADO',
  'USUARIO_ELIMINADO',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  EXPORTACION_CSV: 'Exportacion a CSV',
  EXPORTACION_EXCEL: 'Exportacion a Excel',
  IMPORTACION: 'Importacion de leads',
  LEAD_AUTOMATICO: 'Lead automatico',
  LEAD_ELIMINADO: 'Lead eliminado',
  LEAD_FUSIONADO: 'Leads fusionados',
  LOGIN: 'Ingreso',
  USUARIO_ACTUALIZADO: 'Usuario actualizado',
  USUARIO_CREADO: 'Usuario creado',
  USUARIO_ELIMINADO: 'Usuario eliminado',
}

/** Roles que ven todos los leads; VENDEDOR solo ve los asignados a el o creados por el. */
export const ROLES_WITH_GLOBAL_SCOPE: readonly Role[] = ['ADMIN']
