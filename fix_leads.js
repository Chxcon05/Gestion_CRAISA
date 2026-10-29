const fs = require('fs');
const p = 'leads.html';
let c = fs.readFileSync(p, 'utf-8');
const old = " appearance: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%236B7280\" stroke-width=\"2\"><polyline points=\"6 9 12 15 18 9\"/></svg>'); background-repeat: no-repeat; background-position: right 0.75rem center;";
if (!c.includes(old)) { console.log('Not found, trying regex'); }
c = c.split(old).join('');
fs.writeFileSync(p, c);
console.log('fixed');
