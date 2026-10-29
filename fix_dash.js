const fs = require('fs');
let s = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
s = s.replace(/l\.estado === 'ganado'/g, "(l.estado || l.status) === 'ganado'");
s = s.replace(/l\.estado === 'perdido'/g, "(l.estado || l.status) === 'perdido'");
s = s.replace(/l\.estado === estado/g, "(l.estado || l.status) === estado");
fs.writeFileSync('src/pages/Dashboard.jsx', s);
console.log('Dashboard fixed');
