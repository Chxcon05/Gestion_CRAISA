import type { ErrorRequestHandler, Request } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError, type ZodTypeAny, type z } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

export const notFound = (what = 'Recurso') => new HttpError(404, 'NOT_FOUND', `${what} no encontrado`)
export const forbidden = (msg = 'No tiene permiso para esta accion') => new HttpError(403, 'FORBIDDEN', msg)

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  return schema.parse(data)
}

export function param(req: Request, name: string): string {
  const v = req.params[name]
  if (typeof v !== 'string') throw notFound()
  return v
}

function zodFields(err: ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return fields
}

const PRISMA_ERRORS: Record<string, [number, string, string]> = {
  P2002: [409, 'CONFLICT', 'Ya existe un registro con ese valor'],
  P2003: [400, 'INVALID_REFERENCE', 'Referencia no valida'],
  P2025: [404, 'NOT_FOUND', 'Registro no encontrado'],
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Revise los campos marcados', fields: zodFields(err) } })
    return
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERRORS[err.code]) {
    const [status, code, message] = PRISMA_ERRORS[err.code]!
    res.status(status).json({ error: { code, message } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } })
}
