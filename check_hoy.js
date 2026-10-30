const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany({ where: { createdAt: { gte: new Date('2026-10-30') } }, select: { code: true, createdAt: true } }).then(r => console.log('Leads hoy:', r.map(x => x.code))).catch(e => console.log('err', e)).finally(() => p.$disconnect());
