const http = require('http');
const opts = { hostname: 'localhost', port: 8081, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
const req = http.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { const token = JSON.parse(d).token; const req2 = http.request({ hostname: 'localhost', port: 8081, path: '/api/leads', headers: { Authorization: 'Bearer ' + token } }, r2 => { let d2 = ''; r2.on('data', c => d2 += c); r2.on('end', () => { const arr = JSON.parse(d2); const l = arr.find(x => x.code === 'LEAD-2026-1017'); console.log('createdAt=', l ? l.createdAt : 'NO', 'code=', l ? l.code : 'NO'); console.log('auditLogs=', l ? l.auditLogs?.length || 0 : 0); }); }); req2.end(); }); });
req.write(JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }));
req.end();
