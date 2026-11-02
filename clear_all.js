const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.leadAction.deleteMany({}),
  p.interaction.deleteMany({}),
  p.task.deleteMany({})
]).then(r => console.log('Borrados actions/interactions/tasks:', r.map(x => x.count))).catch(e => console.log('err', e.message)).finally(() => p.$disconnect());
