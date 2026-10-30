const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.create({ data: { code: 'LEAD-TEST-99', firstName: 'Test', company: 'Test SA', status: 'nuevo', channel: 'WhatsApp', businessLine: 'Agricola', product: 'Pipo', estimatedValue: 1000, entryDate: new Date(), recontactAt: new Date(), phone: '999' } }).then(l => console.log('CREADO', l.code, l.createdAt)).catch(e => console.log('ERROR', e.message)).finally(() => p.$disconnect());
