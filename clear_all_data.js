const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.auditLog.deleteMany({}),
  p.leadAction.deleteMany({}),
  p.interaction.deleteMany({}),
  p.task.deleteMany({}),
  p.lead.deleteMany({})
]).then(r => console.log('Borrado todo:', r.map(x => x.count))).catch(e => console.log('err', e.message)).finally(() => p.$disconnect());
