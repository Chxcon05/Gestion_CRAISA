const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:CRAISA123@localhost:5432/craisa' });
  await client.connect();
  await client.query("UPDATE users SET line = 'Agrícola' WHERE line IS NULL");
  await client.end();
  console.log('updated users');
})();
