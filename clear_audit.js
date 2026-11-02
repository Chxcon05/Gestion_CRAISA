const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.auditLog.deleteMany({})
  .then(r => console.log('Borrados auditLogs:', r.count))
  .catch(e => console.log('err', e.message))
  .finally(() => p.$disconnect());
