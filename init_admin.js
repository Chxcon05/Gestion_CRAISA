const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
(async () => {
  const hash = crypto.createHash('sha256').update('demo123').digest('hex');
  const exists = await prisma.user.findUnique({ where: { email: 'admin@craisa.com' } });
  if (!exists) {
    await prisma.user.create({
      data: { id: 'admin@craisa.com', email: 'admin@craisa.com', name: 'Admin CRAISA', passwordHash: hash, role: 'ADMIN', line: null, active: true }
    });
    console.log('Admin insertado en SQLite');
  } else {
    console.log('Admin ya existe en SQLite');
  }
  await prisma.$disconnect();
})();
