const fs = require('fs');
let c = fs.readFileSync('leads.html', 'utf-8');
const old = / appearance: none; background-image: url\('data:image\/svg\+xml;utf8,<svg[\s\S]*?background-position: right 0\.75rem center;/g;
let m = c.match(old);
console.log('matches:', m ? m.length : 0);
c = c.replace(old, '');
fs.writeFileSync('leads.html', c);
console.log('done');
