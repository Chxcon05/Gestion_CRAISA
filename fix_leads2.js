const fs = require('fs');
let c = fs.readFileSync('leads.html', 'utf-8');
const re = / appearance: none; background-image: url\('data:image\/svg\+xml;utf8,[^']*'\); background-repeat: no-repeat; background-position: right 0\.75rem center;/g;
c = c.replace(re, '');
fs.writeFileSync('leads.html', c);
console.log('fixed regex', (c.match(re) || []).length);
