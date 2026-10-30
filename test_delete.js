const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.delete({ where: { code: 'LEAD-TEST-99' } }).then(() => console.log('BORRADO LEAD-TEST-99')).catch(e => console.log('ERROR', e.message)).finally(() => p.$disconnect());
