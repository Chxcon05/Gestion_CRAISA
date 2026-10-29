const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany().then(l => {
  console.log('DB leads:', l.length);
  console.log('First lead:', l[0] || 'none');
  p.$disconnect();
}).catch(e => {
  console.error('DB error:', e.message);
  p.$disconnect();
});
