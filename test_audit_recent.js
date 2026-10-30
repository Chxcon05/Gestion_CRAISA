const http = require('http');
const req = http.request({ hostname: 'localhost', port: 8081, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, r => { let d=''; r.on('data', c=>d+=c); r.on('end', () => { const token = JSON.parse(d).token; const req2 = http.request({ hostname: 'localhost', port: 8081, path: '/api/audit-recent', headers: { Authorization: 'Bearer '+token } }, r2 => { let d2=''; r2.on('data', c=>d2+=c); r2.on('end', () => console.log('AUDIT RECENT', d2)); }); req2.end(); }); });
req.write(JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }));
req.end();
