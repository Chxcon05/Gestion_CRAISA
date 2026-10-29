const fs = require('fs');
['src/pages/Leads.jsx', 'src/pages/Reports.jsx'].forEach(p => {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/l\.estado === /g, "(l.estado || l.status) === ");
  s = s.replace(/leads\.filter\(l => l\.estado === /g, "leads.filter(l => (l.estado || l.status) === ");
  s = s.replace(/leads\.filter\(l => \['contactado','seguimiento'\]\.includes\(l\.estado\)\)/g, "leads.filter(l => ['contactado','seguimiento'].includes(l.estado || l.status))");
  fs.writeFileSync(p, s);
  console.log(p + ' fixed');
});
