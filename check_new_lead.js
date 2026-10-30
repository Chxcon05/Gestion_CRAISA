const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findUnique({ where: { code: 'LEAD-2026-0381' }, select: { estimatedValue: true, code: true } }).then(l => console.log('DB:', l ? l.code + ' estimatedValue=' + l.estimatedValue : 'NO')).catch(e => console.log('err', e)).finally(() => p.$disconnect());
