const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.auditLog.create({ data: { leadId: null, userId: '', action: 'Lead eliminado: LEAD-TEST-99', detail: 'Test / Test SA', createdAt: new Date() } }).then(a => console.log('AUDIT CREADO', a.id)).catch(e => console.log('ERROR', e.message)).finally(() => p.$disconnect());
