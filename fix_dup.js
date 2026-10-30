const fs = require('fs');
const p = 'src/pages/Dashboard.jsx';
let lines = fs.readFileSync(p, 'utf8').split('\n');
// Buscar el bloque duplicado que empieza con el mapa antiguo
let start = -1;
for (let i = 289; i < lines.length; i++) {
  if (lines[i].includes("const mapa = { 'admin@craisa.com'")) {
    start = i;
    break;
  }
}
if (start >= 0) {
  let end = -1;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() === '})() } />') {
      end = i;
      break;
    }
  }
  if (end >= 0) {
    lines.splice(start, end - start + 1);
    fs.writeFileSync(p, lines.join('\n'), 'utf8');
    console.log('Eliminado líneas', start + 1, 'a', end + 1);
  } else {
    console.log('End no encontrado');
  }
} else {
  console.log('Start no encontrado');
}
