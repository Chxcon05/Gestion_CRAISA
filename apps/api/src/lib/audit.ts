import { prisma } from './prisma.ts'

export async function audit(userId: string | null, action: string, detail?: string) {
  // La auditoria nunca debe tumbar la operacion principal.
  await prisma.auditLog.create({ data: { userId, action, detail } }).catch((e) => console.error('audit', e))
}
