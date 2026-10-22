/* ============================================================================
   CRAISA · UI Kit — Sistema de Gestión y Seguimiento de Leads Comerciales
   Genera 8 frames editables de 1440x900 en la página actual.
   Identidad tomada del "Libro de Marca Craisa 2025 v1".
   ----------------------------------------------------------------------------
   Plugin API 1.0.0 · sin dependencias externas.
   ========================================================================== */

// ---------------------------------------------------------------- tokens ---
const T = {
  corp: '#143F7F',       // PMS 7686C — color corporativo
  corpDeep: '#0B2450',
  corpSoft: '#6FA1D6',   // Carbono Neutral azul
  carbon: '#B2D043',     // Carbono Neutral verde
  agri: '#AA182C',       // P187C  Agrícola
  constr: '#D47E00',     // P145C  Construcción
  carga: '#3DAE2B',      // P361C  Movimiento de Carga
  precision: '#004B70',  // P114-16C Agricultura de Precisión
  neutral: '#58595B',    // Carbono Neutral gris
  text: '#101828',
  text2: '#5C6675',
  text3: '#8A94A3',
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E3E7ED',
  borderSoft: '#EEF1F5',
  success: '#3DAE2B',
  warning: '#D47E00',
  danger: '#AA182C'
};

const STATUS = {
  'Nuevo': T.corp,
  'Asignado': T.corpSoft,
  'Contactado': T.precision,
  'En seguimiento': T.constr,
  'Oportunidad comercial': T.agri,
  'Ganado': T.carga,
  'Perdido': T.neutral
};

const LINEAS = {
  'Agrícola': T.agri,
  'Construcción': T.constr,
  'Movimiento de Carga': T.carga,
  'Agricultura de Precisión': T.precision,
  'Postventa': T.neutral,
  'Institucional': T.corp
};

// ---------------------------------------------------------------- fuentes --
let FONT = {
  regular: { family: 'Arial', style: 'Regular' },
  bold: { family: 'Arial', style: 'Bold' },
  italic: { family: 'Arial', style: 'Italic' },
  black: { family: 'Arial', style: 'Bold Italic' }
};

async function loadFonts() {
  try {
    for (const f of Object.values(FONT)) await figma.loadFontAsync(f);
  } catch (e) {
    FONT = {
      regular: { family: 'Inter', style: 'Regular' },
      bold: { family: 'Inter', style: 'Bold' },
      italic: { family: 'Inter', style: 'Italic' },
      black: { family: 'Inter', style: 'Bold Italic' }
    };
    for (const f of Object.values(FONT)) await figma.loadFontAsync(f);
  }
}

// ---------------------------------------------------------------- colores --
function toRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}
function solid(hex, opacity) {
  return [{ type: 'SOLID', color: toRgb(hex), opacity: opacity == null ? 1 : opacity }];
}
function mix(a, b, t) {
  const A = toRgb(a), B = toRgb(b);
  const c = (x, y) => Math.round((x * (1 - t) + y * t) * 255);
  return '#' + [c(A.r, B.r), c(A.g, B.g), c(A.b, B.b)]
    .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function tint(hex, amount) { return mix(hex, '#FFFFFF', amount); }

// ---------------------------------------------------------------- helpers --
function mkFrame(parent, name, o) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  f.fills = o.fill ? solid(o.fill, o.fillOpacity) : [];
  f.clipsContent = !!o.clip;
  if (o.radius != null) f.cornerRadius = o.radius;
  if (o.stroke) {
    f.strokes = solid(o.stroke, o.strokeOpacity);
    f.strokeWeight = o.sw || 1;
    f.strokeAlign = 'INSIDE';
  }
  if (o.shadow) {
    f.effects = [{
      type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
      color: { r: 0.06, g: 0.09, b: 0.16, a: 0.07 },
      offset: { x: 0, y: 6 }, radius: 16, spread: 0
    }];
  }
  if (o.gradient) {
    f.fills = [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
      gradientStops: [
        { position: 0, color: Object.assign(toRgb(o.gradient[0]), { a: 1 }) },
        { position: 1, color: Object.assign(toRgb(o.gradient[1]), { a: 1 }) }
      ]
    }];
  }
  f.resize(o.w || 100, o.h || 100);
  if (o.layout) {
    f.layoutMode = o.layout;
    f.itemSpacing = o.gap || 0;
    const p = o.pad == null ? 0 : o.pad;
    f.paddingTop = o.pt == null ? p : o.pt;
    f.paddingBottom = o.pb == null ? p : o.pb;
    f.paddingLeft = o.pl == null ? p : o.pl;
    f.paddingRight = o.pr == null ? p : o.pr;
    f.primaryAxisAlignItems = o.justify || 'MIN';
    f.counterAxisAlignItems = o.align || 'CENTER';
    if (o.primary === 'AUTO') f.primaryAxisSizingMode = 'AUTO';
    if (o.counter === 'AUTO') f.counterAxisSizingMode = 'AUTO';
  }
  parent.appendChild(f);
  if (!o.layout) { f.x = o.x || 0; f.y = o.y || 0; }
  else if (o.x != null || o.y != null) { f.x = o.x || 0; f.y = o.y || 0; }
  return f;
}

function rect(parent, o) {
  const r = figma.createRectangle();
  r.name = o.name || 'rect';
  r.resize(o.w || 10, o.h || 10);
  r.fills = o.fill ? solid(o.fill, o.opacity) : [];
  if (o.radius != null) r.cornerRadius = o.radius;
  if (o.stroke) {
    r.strokes = solid(o.stroke);
    r.strokeWeight = o.sw || 1;
    r.strokeAlign = 'INSIDE';
  }
  parent.appendChild(r);
  r.x = o.x || 0; r.y = o.y || 0;
  if (o.rotation) r.rotation = o.rotation;
  return r;
}

function circle(parent, o) {
  const c = figma.createEllipse();
  c.name = o.name || 'circle';
  c.resize(o.d || 10, o.d || 10);
  c.fills = o.fill ? solid(o.fill, o.opacity) : [];
  if (o.stroke) {
    c.strokes = solid(o.stroke);
    c.strokeWeight = o.sw || 1;
  }
  parent.appendChild(c);
  c.x = o.x || 0; c.y = o.y || 0;
  return c;
}

function txt(parent, s, o) {
  o = o || {};
  const t = figma.createText();
  t.name = o.name || ('txt/' + String(s).slice(0, 24));
  t.fontName = o.font || (o.bold ? FONT.bold : o.italic ? FONT.italic : FONT.regular);
  t.fontSize = o.size || 14;
  t.characters = String(s);
  t.fills = solid(o.color || T.text, o.opacity);
  t.lineHeight = { unit: 'PIXELS', value: o.lh || Math.round((o.size || 14) * 1.45) };
  if (o.ls != null) t.letterSpacing = { unit: 'PIXELS', value: o.ls };
  if (o.upper) t.textCase = 'UPPER';
  if (o.align) t.textAlignHorizontal = o.align;
  parent.appendChild(t);
  if (o.w) {
    t.textAutoResize = 'HEIGHT';
    t.resize(o.w, t.height);
  }
  if (o.x != null || o.y != null) { t.x = o.x || 0; t.y = o.y || 0; }
  if (o.opacity != null) t.opacity = 1;
  return t;
}

// etiqueta tipo pill con auto-layout (se ajusta al contenido)
function chip(parent, label, color, o) {
  o = o || {};
  const f = mkFrame(parent, 'chip/' + label, {
    layout: 'HORIZONTAL', gap: 6, pt: 4, pb: 4, pl: 9, pr: 9,
    fill: o.solid ? color : tint(color, 0.88),
    radius: 999, primary: 'AUTO', counter: 'AUTO'
  });
  if (o.solid) {
    txt(f, label, { size: 11, bold: true, color: '#FFFFFF' });
  } else {
    circle(f, { d: 6, fill: color });
    txt(f, label, { size: 11, bold: true, color: color });
  }
  if (o.x != null || o.y != null) { f.x = o.x || 0; f.y = o.y || 0; }
  return f;
}

function button(parent, label, o) {
  o = o || {};
  const primary = o.variant !== 'ghost' && o.variant !== 'secondary';
  const f = mkFrame(parent, 'btn/' + label, {
    layout: 'HORIZONTAL', gap: 8, pt: 10, pb: 10, pl: 16, pr: 16,
    fill: primary ? T.corp : o.variant === 'secondary' ? T.surface : null,
    stroke: primary ? null : T.border,
    radius: 8, primary: 'AUTO', counter: 'AUTO',
    justify: 'CENTER'
  });
  if (o.icon) icon(f, o.icon, primary ? '#FFFFFF' : T.text2, 14);
  txt(f, label, {
    size: 13, bold: true,
    color: primary ? '#FFFFFF' : o.variant === 'ghost' ? T.text2 : T.corp
  });
  if (o.w) { f.primaryAxisSizingMode = 'FIXED'; f.resize(o.w, f.height); }
  if (o.x != null || o.y != null) { f.x = o.x || 0; f.y = o.y || 0; }
  return f;
}

function icon(parent, kind, color, size) {
  const s = size || 16;
  const g = mkFrame(parent, 'icon/' + kind, { w: s, h: s });
  const c = color || T.text2;
  const u = s / 16;
  if (kind === 'grid') {
    rect(g, { x: 1 * u, y: 1 * u, w: 6 * u, h: 6 * u, fill: c, radius: 1.5 });
    rect(g, { x: 9 * u, y: 1 * u, w: 6 * u, h: 6 * u, fill: c, radius: 1.5 });
    rect(g, { x: 1 * u, y: 9 * u, w: 6 * u, h: 6 * u, fill: c, radius: 1.5 });
    rect(g, { x: 9 * u, y: 9 * u, w: 6 * u, h: 6 * u, fill: c, radius: 1.5 });
  } else if (kind === 'list') {
    for (let i = 0; i < 3; i++) {
      circle(g, { x: 1 * u, y: (2 + i * 5) * u, d: 2 * u, fill: c });
      rect(g, { x: 5 * u, y: (2.5 + i * 5) * u, w: 10 * u, h: 1.6 * u, fill: c, radius: 1 });
    }
  } else if (kind === 'users') {
    circle(g, { x: 5 * u, y: 1 * u, d: 6 * u, fill: c });
    rect(g, { x: 2 * u, y: 9 * u, w: 12 * u, h: 6 * u, fill: c, radius: 3 });
  } else if (kind === 'settings') {
    circle(g, { x: 3 * u, y: 3 * u, d: 10 * u, fill: c });
    circle(g, { x: 6 * u, y: 6 * u, d: 4 * u, fill: T.surface });
  } else if (kind === 'search') {
    circle(g, { x: 1 * u, y: 1 * u, d: 10 * u, stroke: c, sw: 1.6 * u });
    rect(g, { x: 10 * u, y: 10 * u, w: 5 * u, h: 1.8 * u, fill: c, radius: 1, rotation: 45 });
  } else if (kind === 'download') {
    rect(g, { x: 7 * u, y: 1 * u, w: 2 * u, h: 8 * u, fill: c, radius: 1 });
    rect(g, { x: 4 * u, y: 7 * u, w: 8 * u, h: 2 * u, fill: c, radius: 1, rotation: 45 });
    rect(g, { x: 2 * u, y: 13 * u, w: 12 * u, h: 1.6 * u, fill: c, radius: 1 });
  } else if (kind === 'plus') {
    rect(g, { x: 7 * u, y: 2 * u, w: 2 * u, h: 12 * u, fill: c, radius: 1 });
    rect(g, { x: 2 * u, y: 7 * u, w: 12 * u, h: 2 * u, fill: c, radius: 1 });
  } else if (kind === 'calendar') {
    rect(g, { x: 1 * u, y: 3 * u, w: 14 * u, h: 12 * u, stroke: c, sw: 1.6 * u, radius: 2 });
    rect(g, { x: 1 * u, y: 6 * u, w: 14 * u, h: 1.4 * u, fill: c });
    rect(g, { x: 4 * u, y: 1 * u, w: 1.6 * u, h: 3.5 * u, fill: c });
    rect(g, { x: 10.5 * u, y: 1 * u, w: 1.6 * u, h: 3.5 * u, fill: c });
  } else if (kind === 'alert') {
    rect(g, { x: 7 * u, y: 1 * u, w: 2 * u, h: 9 * u, fill: c, radius: 1 });
    circle(g, { x: 7 * u, y: 12 * u, d: 2 * u, fill: c });
  } else if (kind === 'chart') {
    rect(g, { x: 1 * u, y: 9 * u, w: 3 * u, h: 6 * u, fill: c, radius: 1 });
    rect(g, { x: 6 * u, y: 5 * u, w: 3 * u, h: 10 * u, fill: c, radius: 1 });
    rect(g, { x: 11 * u, y: 1 * u, w: 3 * u, h: 14 * u, fill: c, radius: 1 });
  } else if (kind === 'edit') {
    rect(g, { x: 2 * u, y: 12 * u, w: 4 * u, h: 2 * u, fill: c });
    rect(g, { x: 3 * u, y: 1 * u, w: 2.2 * u, h: 11 * u, fill: c, radius: 1, rotation: 45 });
  } else if (kind === 'arrow') {
    rect(g, { x: 7 * u, y: 2 * u, w: 2 * u, h: 12 * u, fill: c, radius: 1 });
    rect(g, { x: 3 * u, y: 2 * u, w: 10 * u, h: 2 * u, fill: c, radius: 1, rotation: 45 });
  }
  g.x = g.x;
  return g;
}

// input de formulario (posicionamiento absoluto para control total)
function field(parent, label, value, o) {
  o = o || {};
  const w = o.w || 300;
  const boxH = o.tall ? 92 : 40;
  const g = mkFrame(parent, 'field/' + label, { w: w, h: 24 + boxH + (o.error || o.help ? 18 : 0) });

  txt(g, label, { size: 11, bold: true, color: T.text2, x: 0, y: 0 });
  if (o.required) txt(g, '*', { size: 11, bold: true, color: T.danger, x: txtWidth(label, 11, true) + 3, y: 0 });

  mkFrame(g, 'input', {
    x: 0, y: 22, w: w, h: boxH,
    fill: o.disabled ? T.bg : T.surface,
    stroke: o.error ? T.danger : T.border,
    radius: 8
  });

  let textX = 12;
  if (o.icon) {
    const ic = icon(g, o.icon, T.text3, 15);
    ic.x = 12; ic.y = 22 + (boxH - 15) / 2;
    textX = 36;
  }
  txt(g, value, {
    size: 13,
    color: value ? T.text : T.text3,
    x: textX,
    y: 22 + (o.tall ? 12 : 12),
    w: w - textX - (o.select ? 30 : 12),
    bold: !!o.boldValue,
    lh: 18
  });
  if (o.select) {
    const a = txt(g, '▾', { size: 10, color: T.text3, bold: true, x: w - 22, y: 22 + boxH / 2 - 8 });
    a.x = w - 22;
  }
  if (o.error) {
    txt(g, o.error, { size: 10, color: T.danger, bold: true, x: 0, y: 22 + boxH + 4, w: w });
  } else if (o.help) {
    txt(g, o.help, { size: 10, color: T.text3, x: 0, y: 22 + boxH + 4, w: w });
  }
  return g;
}

// ancho aproximado de texto (para posicionar el asterisco)
function txtWidth(s, size, bold) {
  return Math.round(String(s).length * size * (bold ? 0.56 : 0.52));
}

function check(parent, x, y, color, size) {
  const s = size || 12;
  const g = mkFrame(parent, 'check', { x: x, y: y, w: s, h: s });
  rect(g, { x: s * 0.08, y: s * 0.52, w: s * 0.4, h: s * 0.15, fill: color, radius: 1, rotation: 45 });
  rect(g, { x: s * 0.3, y: s * 0.5, w: s * 0.62, h: s * 0.15, fill: color, radius: 1, rotation: -45 });
  return g;
}

// ---------------------------------------------------------------- chrome ---
function sidebar(s, active) {
  const sb = mkFrame(s, 'Sidebar', { w: 248, h: 900, fill: T.corpDeep, x: 0, y: 0 });
  rect(sb, { name: 'acento', x: 0, y: 0, w: 248, h: 3, fill: T.carbon });

  // logo en tarjeta blanca
  const card = mkFrame(sb, 'logo', { w: 184, h: 56, fill: '#FFFFFF', radius: 10, x: 32, y: 36 });
  logoImage(card, 148, 34, 18, 11);

  txt(sb, 'Gestión de Leads', { size: 10, bold: true, color: T.corpSoft, x: 32, y: 104, upper: true, ls: 1.2 });

  const items = [
    ['grid', 'Dashboard'],
    ['list', 'Leads'],
    ['calendar', 'Agenda'],
    ['chart', 'Reportes'],
    ['users', 'Usuarios'],
    ['settings', 'Catálogos']
  ];
  let y = 136;
  items.forEach(function (it) {
    const on = it[1] === active;
    if (on) {
      rect(sb, { x: 20, y: y, w: 208, h: 42, fill: '#FFFFFF', opacity: 0.12, radius: 8 });
      rect(sb, { x: 20, y: y + 11, w: 3, h: 20, fill: T.carbon, radius: 2 });
    }
    const ic = icon(sb, it[0], on ? '#FFFFFF' : T.corpSoft, 17);
    ic.x = 36; ic.y = y + 12;
    txt(sb, it[1], { size: 13, bold: on, color: on ? '#FFFFFF' : T.corpSoft, x: 66, y: y + 12 });
    y += 48;
  });

  // bloque usuario
  rect(sb, { x: 20, y: 806, w: 208, h: 1, fill: '#FFFFFF', opacity: 0.12 });
  circle(sb, { x: 24, y: 826, d: 36, fill: T.corpSoft });
  txt(sb, 'MR', { size: 12, bold: true, color: T.corpDeep, x: 33, y: 836 });
  txt(sb, 'María Rojas', { size: 12, bold: true, color: '#FFFFFF', x: 68, y: 828 });
  txt(sb, 'Vendedora · Agrícola', { size: 11, color: T.corpSoft, x: 68, y: 845 });
  txt(sb, 'Cerrar sesión', { size: 11, bold: true, color: T.carbon, x: 24, y: 872 });
  return sb;
}

function topbar(s, title, subtitle, o) {
  o = o || {};
  const W = o.full ? 1440 : 1192;
  const tb = mkFrame(s, 'Topbar', { w: W, h: 72, fill: T.surface, x: o.full ? 0 : 248, y: 0 });
  rect(tb, { x: 0, y: 71, w: W, h: 1, fill: T.border });
  txt(tb, title, { size: 19, bold: true, color: T.text, x: 32, y: subtitle ? 17 : 26 });
  if (subtitle) txt(tb, subtitle, { size: 12, color: T.text2, x: 32, y: 43 });

  // buscador global
  const sw = 280;
  const search = mkFrame(tb, 'buscador', {
    w: sw, h: 38, fill: T.bg, stroke: T.border, radius: 8,
    layout: 'HORIZONTAL', gap: 8, pl: 12, pr: 12, x: W - 32 - sw - 132, y: 17
  });
  icon(search, 'search', T.text3, 14);
  txt(search, 'Buscar lead, empresa o correo…', { size: 12, color: T.text3 });

  const bell = mkFrame(tb, 'notificaciones', { w: 38, h: 38, fill: T.bg, stroke: T.border, radius: 8, x: W - 32 - 84, y: 17 });
  const bi = icon(bell, 'alert', T.text2, 16); bi.x = 11; bi.y = 11;
  circle(tb, { x: W - 32 - 88, y: 15, d: 8, fill: T.agri });

  circle(tb, { x: W - 32 - 36, y: 17, d: 38, fill: T.corp });
  txt(tb, 'MR', { size: 12, bold: true, color: '#FFFFFF', x: W - 32 - 25, y: 28 });
  return tb;
}

function pageHeading(s, title, subtitle, x, y, w) {
  txt(s, title, { size: 22, bold: true, color: T.text, x: x, y: y, w: w || 600 });
  if (subtitle) txt(s, subtitle, { size: 13, color: T.text2, x: x, y: y + 30, w: w || 600 });
}

function card(s, o) {
  return mkFrame(s, o.name || 'card', {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fill: T.surface, stroke: T.border, radius: 12, shadow: true
  });
}

function cardTitle(parent, title, subtitle, x, y) {
  txt(parent, title, { size: 14, bold: true, color: T.text, x: x, y: y });
  if (subtitle) txt(parent, subtitle, { size: 11, color: T.text3, x: x, y: y + 19 });
}

function logoImage(parent, w, h, x, y) {
  const r = figma.createRectangle();
  r.name = 'logo-craisa';
  r.resize(w, h);
  r.fills = [{
    type: 'IMAGE',
    imageHash: LOGO_HASH,
    scaleMode: 'FIT'
  }];
  parent.appendChild(r);
  r.x = x == null ? 0 : x; r.y = y == null ? 0 : y;
  return r;
}

// ---------------------------------------------------------------- datos ----
const LEADS = [
  ['LEAD-2026-0142', '20/10/26', 'Ana Rodríguez', 'Finca La Sabana', 'WhatsApp', 'Agrícola', 'Nuevo', 'J. Pérez', 'Hoy'],
  ['LEAD-2026-0141', '19/10/26', 'Luis Miranda', 'Constructora Hidalgo', 'Sitio web', 'Construcción', 'En seguimiento', 'M. Rojas', '22/10'],
  ['LEAD-2026-0140', '19/10/26', 'Banacol S.A.', 'Banacol', 'Feria', 'Agrícola', 'Oportunidad comercial', 'J. Pérez', '23/10'],
  ['LEAD-2026-0139', '18/10/26', 'Denis Vargas', 'Materiales Ciudad Neyly', 'Instagram', 'Movimiento de Carga', 'Contactado', 'S. Mora', '24/10'],
  ['LEAD-2026-0138', '18/10/26', 'Carlos Quesada', 'Del Monte', 'Visita comercial', 'Agricultura de Precisión', 'Asignado', 'M. Rojas', '21/10'],
  ['LEAD-2026-0137', '17/10/26', 'Gonar Costa Rica', 'Gonar', 'Correo', 'Postventa', 'En seguimiento', 'S. Mora', '22/10'],
  ['LEAD-2026-0136', '17/10/26', 'Wilber Rojas', 'Plásticos WR', 'Facebook', 'Construcción', 'Ganado', 'J. Pérez', '—'],
  ['LEAD-2026-0135', '16/10/26', 'Mainor Alfaro', 'Transportes Alfaro', 'Llamada', 'Movimiento de Carga', 'Perdido', 'S. Mora', '—'],
  ['LEAD-2026-0134', '16/10/26', 'Tornillos del Valle', 'Tornillos CR', 'Sitio web', 'Institucional', 'Contactado', 'M. Rojas', '23/10'],
  ['LEAD-2026-0133', '15/10/26', 'El Viejo Comercial', 'El Viejo', 'Otro', 'Construcción', 'Asignado', 'J. Pérez', '21/10']
];

// ---------------------------------------------------------------- pantallas
function scrLogin(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 01 · Login', { w: 1440, h: 900, fill: T.surface, x: x, y: y, clip: true });

  const left = mkFrame(s, 'brand-panel', {
    w: 720, h: 900, gradient: [T.corp, T.precision], x: 0, y: 0, clip: true
  });
  // retícula sutil
  for (let i = 0; i < 9; i++) {
    rect(left, { x: 0, y: i * 100, w: 720, h: 1, fill: '#FFFFFF', opacity: 0.04 });
  }
  circle(left, { x: 470, y: -120, d: 520, fill: T.corpSoft, opacity: 0.10 });
  circle(left, { x: -160, y: 520, d: 480, fill: T.carbon, opacity: 0.07 });

  const lc = mkFrame(left, 'logo-card', { w: 232, h: 76, fill: '#FFFFFF', radius: 12, x: 64, y: 64 });
  logoImage(lc, 196, 46, 18, 15);

  txt(left, 'Cada consulta,', { size: 46, bold: true, color: '#FFFFFF', x: 64, y: 320, lh: 54 });
  txt(left, 'una oportunidad.', { size: 46, bold: true, color: T.carbon, x: 64, y: 374, lh: 54 });
  txt(left, 'Centralice el seguimiento comercial de CRAISA:\nregistre, asigne y convierta cada lead en una\noportunidad de negocio real.', {
    size: 15, color: '#D8E4F2', x: 64, y: 452, w: 520, lh: 24
  });

  const stats = [['184', 'leads activos'], ['5', 'líneas de negocio'], ['9', 'canales de origen']];
  stats.forEach(function (st, i) {
    const bx = 64 + i * 200;
    rect(left, { x: bx, y: 660, w: 2, h: 46, fill: T.carbon, radius: 1 });
    txt(left, st[0], { size: 26, bold: true, color: '#FFFFFF', x: bx + 18, y: 664 });
    txt(left, st[1], { size: 11, color: '#B9CBE0', x: bx + 18, y: 698 });
  });
  txt(left, 'Sistema de Gestión y Seguimiento de Leads Comerciales · Prototipo con datos ficticios', {
    size: 10, color: '#9FB6CE', x: 64, y: 830, w: 560
  });

  // formulario
  const fx = 720, fw = 720;
  const form = mkFrame(s, 'form', { w: 380, h: 520, x: fx + (fw - 380) / 2, y: 190 });
  txt(form, 'Iniciar sesión', { size: 26, bold: true, color: T.text, x: 0, y: 0 });
  txt(form, 'Acceso para personal autorizado de CRAISA.', { size: 13, color: T.text2, x: 0, y: 38, w: 380 });

  const f1 = field(form, 'Correo corporativo', 'mrojas@craisa.com', { w: 380, icon: null });
  f1.x = 0; f1.y = 86;
  const f2 = field(form, 'Contraseña', '••••••••••', { w: 380 });
  f2.x = 0; f2.y = 162;

  const f3 = field(form, 'Correo corporativo', 'ana.rodriguez@', { w: 380, error: 'Ingrese un correo electrónico válido.' });
  f3.x = 0; f3.y = 238;

  txt(form, 'Correo o contraseña incorrectos. Intente nuevamente.', {
    size: 12, color: T.danger, x: 0, y: 314, w: 380, bold: true
  });

  const btn = button(form, 'Ingresar al sistema', { w: 380 });
  btn.x = 0; btn.y = 340;

  txt(form, '¿Olvidó su contraseña? Solicite el restablecimiento a TI o Mercadeo.', {
    size: 11, color: T.text3, x: 0, y: 396, w: 380, lh: 17
  });
  rect(form, { x: 0, y: 444, w: 380, h: 1, fill: T.border });
  txt(form, 'Acceso restringido · El uso del sistema implica el registro de auditoría', {
    size: 10, color: T.text3, x: 0, y: 460, w: 380
  });
  return s;
}

function scrDashboard(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 02 · Dashboard', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Dashboard');
  topbar(s, 'Dashboard comercial', 'Resumen de la gestión de leads');

  const X = 280, CW = 1128;
  // filtros de periodo
  const fl = mkFrame(s, 'filtros-periodo', { x: X, y: 92, w: CW, h: 44 });
  let fx = 0;
  [['Últimos 30 días', true, 'calendar'], ['Todos los responsables', false, null], ['Todas las líneas', false, null]].forEach(function (p) {
    const b = mkFrame(fl, 'filtro', {
      layout: 'HORIZONTAL', gap: 8, pt: 9, pb: 9, pl: 12, pr: 12,
      fill: T.surface, stroke: T.border, radius: 8, primary: 'AUTO', counter: 'AUTO', y: 2
    });
    if (p[2]) icon(b, p[2], T.text3, 14);
    txt(b, p[0], { size: 12, bold: true, color: T.text });
    txt(b, '▾', { size: 9, color: T.text3, bold: true });
    b.x = fx;
    fx += b.width + 8;
  });
  const exp = button(fl, 'Exportar CSV', { variant: 'secondary', icon: 'download' });
  exp.x = CW - exp.width; exp.y = 2;
  txt(s, 'Actualizado 22/10/2026 09:14', { size: 11, color: T.text3, x: X + CW - 300, y: 139, w: 300, align: 'RIGHT' });

  // KPIs
  const kpis = [
    ['Leads totales', '184', '+12 vs. periodo anterior', T.corp, 'grid'],
    ['En gestión', '143', '78% del total', T.constr, 'list'],
    ['Ganados', '21', 'Tasa de cierre 11,4%', T.carga, 'chart'],
    ['Requieren acción', '9', '3 acciones vencidas', T.agri, 'alert']
  ];
  const kw = (CW - 60) / 4;
  kpis.forEach(function (k, i) {
    const c = card(s, { x: X + i * (kw + 20), y: 156, w: kw, h: 112 });
    const ic = mkFrame(c, 'kpi-icon', { w: 32, h: 32, fill: tint(k[3], 0.9), radius: 8, x: 20, y: 20 });
    const gi = icon(ic, k[4], k[3], 16); gi.x = 8; gi.y = 8;
    txt(c, k[0], { size: 11, bold: true, color: T.text3, x: 20, y: 60, upper: true, ls: 0.6 });
    txt(c, k[1], { size: 30, bold: true, color: T.text, x: 20, y: 76 });
    txt(c, k[2], { size: 10, color: T.text2, x: 78, y: 90 });
  });

  // dona por estado
  const donut = card(s, { x: X, y: 288, w: 552, h: 300 });
  cardTitle(donut, 'Distribución por estado', 'Total de leads del periodo', 24, 22);
  const cx = 168, cy = 186, R = 82;
  let angle = -Math.PI / 2;
  const total = 184;
  const segments = [
    ['Nuevo', 15], ['Asignado', 12], ['Contactado', 22], ['En seguimiento', 24],
    ['Oportunidad comercial', 13], ['Ganado', 8], ['Perdido', 6]
  ];
  segments.forEach(function (sg) {
    const span = (sg[1] / 100) * Math.PI * 2;
    const e = figma.createEllipse();
    e.name = 'donut/' + sg[0];
    e.resize(R * 2, R * 2);
    e.fills = solid(STATUS[sg[0]]);
    e.strokes = [];
    e.arcData = { startingAngle: angle, endingAngle: angle + span - 0.03, innerRadius: 0.62 };
    donut.appendChild(e);
    e.x = cx - R; e.y = cy - R;
    angle += span;
  });
  txt(donut, '184', { size: 26, bold: true, color: T.text, x: cx - 40, y: cy - 22, w: 80, align: 'CENTER' });
  txt(donut, 'leads', { size: 11, color: T.text3, x: cx - 40, y: cy + 10, w: 80, align: 'CENTER' });

  let ly = 96;
  segments.forEach(function (sg) {
    circle(donut, { x: 330, y: ly + 4, d: 8, fill: STATUS[sg[0]] });
    txt(donut, sg[0], { size: 12, color: T.text, x: 346, y: ly });
    txt(donut, sg[1] + '%', { size: 12, bold: true, color: T.text, x: 500, y: ly, w: 28, align: 'RIGHT' });
    ly += 26;
  });

  // canales
  const ch = card(s, { x: X + 572, y: 288, w: 556, h: 300 });
  cardTitle(ch, 'Leads por canal de origen', 'Periodo seleccionado', 24, 22);
  const cans = [['Sitio web', 42], ['WhatsApp', 31], ['Facebook', 19], ['Instagram', 14], ['Feria', 12], ['Llamada', 10]];
  const maxC = 42, bx = 128, bw = 300;
  cans.forEach(function (c, i) {
    const yy = 82 + i * 34;
    txt(ch, c[0], { size: 11, color: T.text2, x: 24, y: yy, w: 96 });
    rect(ch, { x: bx, y: yy + 3, w: bw, h: 10, fill: T.borderSoft, radius: 5 });
    rect(ch, { x: bx, y: yy + 3, w: Math.round((c[1] / maxC) * bw), h: 10, fill: i < 2 ? T.corp : T.corpSoft, radius: 5 });
    txt(ch, String(c[1]), { size: 11, bold: true, color: T.text, x: bx + bw + 12, y: yy });
  });

  // líneas de negocio (usa colores del paraguas de marca)
  const ln = card(s, { x: X, y: 608, w: 552, h: 256 });
  cardTitle(ln, 'Leads por línea de negocio', 'Estrategia paraguas CRAISA', 24, 22);
  const lins = [['Agrícola', 62], ['Construcción', 44], ['Movimiento de Carga', 31], ['Agricultura de Precisión', 27], ['Postventa', 20]];
  const maxL = 62;
  lins.forEach(function (c, i) {
    const yy = 78 + i * 34;
    circle(ln, { x: 24, y: yy + 5, d: 8, fill: LINEAS[c[0]] });
    txt(ln, c[0], { size: 11, color: T.text2, x: 40, y: yy, w: 180 });
    rect(ln, { x: 232, y: yy + 3, w: 240, h: 10, fill: T.borderSoft, radius: 5 });
    rect(ln, { x: 232, y: yy + 3, w: Math.round((c[1] / maxL) * 240), h: 10, fill: LINEAS[c[0]], radius: 5 });
    txt(ln, String(c[1]), { size: 11, bold: true, color: T.text, x: 484, y: yy });
  });

  // alertas
  const al = card(s, { x: X + 572, y: 608, w: 556, h: 256 });
  cardTitle(al, 'Requieren atención', 'Alertas operativas', 24, 22);
  const alerts = [
    ['3', 'acciones vencidas', 'Leads con próxima acción antes de hoy', T.agri],
    ['6', 'leads sin próxima acción', 'Asignados hace más de 5 días', T.constr],
    ['2', 'leads sin asignar', 'Ingresaron por el sitio web', T.corp]
  ];
  alerts.forEach(function (a, i) {
    const yy = 74 + i * 58;
    rect(al, { x: 24, y: yy, w: 508, h: 46, fill: T.bg, radius: 8 });
    rect(al, { x: 24, y: yy, w: 3, h: 46, fill: a[3], radius: 2 });
    txt(al, a[0], { size: 18, bold: true, color: a[3], x: 40, y: yy + 11 });
    txt(al, a[1], { size: 12, bold: true, color: T.text, x: 68, y: yy + 9 });
    txt(al, a[2], { size: 10, color: T.text3, x: 68, y: yy + 26 });
    txt(al, 'Ver', { size: 11, bold: true, color: T.corp, x: 492, y: yy + 16 });
  });
  return s;
}

function scrListado(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 03 · Listado de leads', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Leads');
  topbar(s, 'Leads', '184 registros · 9 requieren action');

  const X = 280, CW = 1128;

  // barra de filtros
  const fb = card(s, { name: 'filtros', x: X, y: 92, w: CW, h: 96 });
  const search = mkFrame(fb, 'buscador', {
    w: 330, h: 40, fill: T.bg, stroke: T.border, radius: 8,
    layout: 'HORIZONTAL', gap: 8, pl: 12, x: 20, y: 16
  });
  icon(search, 'search', T.text3, 15);
  txt(search, 'Buscar por nombre, empresa, correo…', { size: 12, color: T.text3 });

  const filters = ['Estado: Todos', 'Canal: Todos', 'Línea: Todas', 'Responsable: Todos'];
  filters.forEach(function (f, i) {
    const b = mkFrame(fb, 'filtro', {
      x: 364 + i * 168, y: 16, w: 156, h: 40, fill: T.surface, stroke: T.border, radius: 8,
      layout: 'HORIZONTAL', gap: 6, pl: 10, pr: 10
    });
    txt(b, f, { size: 11, color: T.text2, w: 126 });
    txt(b, '▾', { size: 9, color: T.text3, bold: true });
  });

  txt(fb, 'Desde', { size: 11, bold: true, color: T.text3, x: 20, y: 68 });
  const d1 = mkFrame(fb, 'fecha-desde', { x: 62, y: 62, w: 132, h: 26, fill: T.bg, radius: 6, stroke: T.border });
  const i1 = icon(d1, 'calendar', T.text3, 12); i1.x = 8; i1.y = 7;
  txt(d1, '01/10/2026', { size: 11, color: T.text, x: 28, y: 6 });
  txt(fb, 'Hasta', { size: 11, bold: true, color: T.text3, x: 210, y: 68 });
  const d2 = mkFrame(fb, 'fecha-hasta', { x: 250, y: 62, w: 132, h: 26, fill: T.bg, radius: 6, stroke: T.border });
  const i2 = icon(d2, 'calendar', T.text3, 12); i2.x = 8; i2.y = 7;
  txt(d2, '22/10/2026', { size: 11, color: T.text, x: 28, y: 6 });
  txt(fb, '3 filtros aplicados', { size: 11, bold: true, color: T.corp, x: 400, y: 68 });
  txt(fb, 'Limpiar filtros', { size: 11, color: T.text3, x: 506, y: 68 });

  const nb = button(fb, 'Nuevo lead', { icon: 'plus' });
  nb.x = CW - 20 - nb.width; nb.y = 16;
  const ex = button(fb, 'Exportar CSV', { variant: 'secondary', icon: 'download' });
  ex.x = CW - 32 - nb.width - ex.width; ex.y = 16;

  // tabla
  const tb = card(s, { name: 'tabla', x: X, y: 204, w: CW, h: 632 });
  const cols = [
    ['Código', 20, 118], ['Fecha', 138, 82], ['Cliente', 220, 140],
    ['Empresa', 360, 180], ['Canal', 540, 110], ['Línea', 650, 150],
    ['Estado', 800, 150], ['Responsable', 950, 92], ['Próx. acción', 1042, 66]
  ];
  rect(tb, { x: 0, y: 44, w: CW, h: 44, fill: T.bg });
  cols.forEach(function (c) {
    txt(tb, c[0], { size: 10, bold: true, color: T.text3, x: c[1], y: 58, upper: true, ls: 0.5 });
  });
  rect(tb, { x: 0, y: 88, w: CW, h: 1, fill: T.border });

  LEADS.forEach(function (r, i) {
    const yy = 88 + i * 52;
    if (i % 2 === 1) rect(tb, { x: 0, y: yy, w: CW, h: 52, fill: '#FAFBFD' });
    rect(tb, { x: 0, y: yy + 51, w: CW, h: 1, fill: T.borderSoft });
    txt(tb, r[0], { size: 11, bold: true, color: T.corp, x: 20, y: yy + 19 });
    txt(tb, r[1], { size: 11, color: T.text2, x: 138, y: yy + 19 });
    txt(tb, r[2], { size: 12, bold: true, color: T.text, x: 220, y: yy + 18, w: 132 });
    txt(tb, r[3], { size: 11, color: T.text2, x: 360, y: yy + 19, w: 172 });
    txt(tb, r[4], { size: 11, color: T.text2, x: 540, y: yy + 19 });
    circle(tb, { x: 650, y: yy + 22, d: 7, fill: LINEAS[r[5]] });
    txt(tb, r[5], { size: 11, color: T.text2, x: 663, y: yy + 19, w: 130 });
    const ch = chip(tb, r[6], STATUS[r[6]]);
    ch.x = 800; ch.y = yy + 15;
    txt(tb, r[7], { size: 11, color: T.text2, x: 950, y: yy + 19 });
    const soon = r[8] === 'Hoy';
    txt(tb, r[8], { size: 11, bold: soon, color: soon ? T.agri : T.text3, x: 1042, y: yy + 19 });
  });

  // paginación
  rect(tb, { x: 0, y: 608, w: CW, h: 1, fill: T.border });
  txt(tb, 'Mostrando 1–10 de 184 registros', { size: 11, color: T.text3, x: 20, y: 622 });
  for (let i = 0; i < 4; i++) {
    const pg = mkFrame(tb, 'page/' + (i + 1), {
      x: CW - 300 + i * 36, y: 614, w: 30, h: 28, radius: 6,
      fill: i === 0 ? T.corp : null, stroke: i === 0 ? null : T.border,
      layout: 'HORIZONTAL', justify: 'CENTER'
    });
    txt(pg, String(i + 1), { size: 11, bold: i === 0, color: i === 0 ? '#FFFFFF' : T.text2 });
  }
  txt(tb, '…', { size: 11, color: T.text3, x: CW - 156, y: 622 });
  const next = mkFrame(tb, 'page/next', { x: CW - 92, y: 614, w: 72, h: 28, radius: 6, stroke: T.border, layout: 'HORIZONTAL', justify: 'CENTER' });
  txt(next, 'Siguiente', { size: 10, bold: true, color: T.text2 });

  // estado vacío como nota al pie
  txt(s, 'Estado vacío previsto: ilustración + “No se encontraron leads con los filtros aplicados” + botón Limpiar filtros.', {
    size: 10, color: T.text3, x: X, y: 848, w: 900
  });
  return s;
}

function scrNuevo(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 04 · Nuevo lead', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Leads');
  topbar(s, 'Nuevo lead', 'Registro de consulta comercial');
  txt(s, 'Leads  ›  Nuevo', { size: 11, color: T.text3, x: 280, y: 88 });

  const X = 280;
  const form = card(s, { name: 'formulario', x: X, y: 112, w: 760, h: 700 });

  txt(form, 'Datos del contacto', { size: 14, bold: true, color: T.text, x: 28, y: 24 });
  txt(form, 'Los campos marcados con * son obligatorios.', { size: 11, color: T.text3, x: 28, y: 45 });
  rect(form, { x: 28, y: 70, w: 704, h: 1, fill: T.borderSoft });

  const fw = 336;
  const row1 = [['Nombre completo', 'Ana Rodríguez Solano'], ['Empresa', 'Finca La Sabana']];
  row1.forEach(function (f, i) {
    const fld = field(form, f[0], f[1], { w: fw, required: true });
    fld.x = 28 + i * (fw + 32); fld.y = 90;
  });
  [['Teléfono', '+506 8812-4477', true], ['Correo electrónico', 'ana@fincalasabana.cr', false]].forEach(function (f, i) {
    const fld = field(form, f[0], f[1], { w: fw, required: f[2] });
    fld.x = 28 + i * (fw + 32); fld.y = 176;
  });

  txt(form, 'Origen y clasificación', { size: 14, bold: true, color: T.text, x: 28, y: 268 });
  rect(form, { x: 28, y: 294, w: 704, h: 1, fill: T.borderSoft });

  [['Fecha de ingreso', '22/10/2026', true, 'calendar'], ['Canal de origen', 'WhatsApp', true, null]].forEach(function (f, i) {
    const fld = field(form, f[0], f[1], { w: fw, required: f[2], icon: f[3], select: i === 1 });
    fld.x = 28 + i * (fw + 32); fld.y = 312;
  });
  [['Línea de negocio', 'Agrícola', true], ['Producto de interés', 'Tractor Farmall JXM 55', false]].forEach(function (f, i) {
    const fld = field(form, f[0], f[1], { w: fw, required: f[2], select: true });
    fld.x = 28 + i * (fw + 32); fld.y = 398;
  });

  const desc = field(form, 'Descripción de la consulta', 'Cliente solicita cotización de tractor 55 HP para 40 hectáreas de caña. Requiere financiamiento.', { w: 704, tall: true, required: true });
  desc.x = 28; desc.y = 484;

  const err = field(form, 'Responsable asignado *', '', { w: fw, required: true, error: 'Debe asignar un responsable para continuar.' });
  err.x = 28; err.y = 588;

  // panel lateral: ayuda + duplicados
  const side = mkFrame(s, 'panel-lateral', { x: X + 792, y: 112, w: 336, h: 700, layout: 'VERTICAL', gap: 16 });

  const dup = card(side, { name: 'aviso-duplicado', w: 336, h: 132 });
  rect(dup, { x: 0, y: 0, w: 4, h: 132, fill: T.warning, radius: 2 });
  const di = icon(dup, 'alert', T.warning, 16); di.x = 22; di.y = 20;
  txt(dup, 'Posible duplicado', { size: 12, bold: true, color: T.warning, x: 46, y: 20 });
  txt(dup, 'Ya existe un lead con el teléfono +506 8812-4477 registrado el 12/09/2026 por M. Rojas (Estado: Perdido).', {
    size: 11, color: T.text2, x: 22, y: 46, w: 294, lh: 17
  });
  txt(dup, 'Ver lead relacionado', { size: 11, bold: true, color: T.corp, x: 22, y: 104 });

  const help = card(side, { name: 'ayuda', w: 336, h: 210 });
  cardTitle(help, 'Buenas prácticas', null, 22, 20);
  ['Registre la consulta el mismo día que ingresa.', 'Use el canal real por donde llegó el contacto.', 'Asigne un responsable antes de guardar.', 'No escriba datos personales en la descripción.'].forEach(function (t, i) {
    circle(help, { x: 22, y: 56 + i * 34, d: 6, fill: T.carbon });
    txt(help, t, { size: 11, color: T.text2, x: 38, y: 50 + i * 34, w: 276, lh: 16 });
  });

  const hist = card(side, { name: 'actividad', w: 336, h: 156 });
  cardTitle(hist, 'Actividad del registro', null, 22, 20);
  txt(hist, 'Creado por', { size: 10, color: T.text3, x: 22, y: 56, upper: true, ls: 0.5 });
  txt(hist, 'María Rojas · 22/10/2026 09:14', { size: 11, color: T.text2, x: 22, y: 72 });
  txt(hist, 'Código asignado', { size: 10, color: T.text3, x: 22, y: 100, upper: true, ls: 0.5 });
  txt(hist, 'LEAD-2026-0143', { size: 13, bold: true, color: T.corp, x: 22, y: 116 });

  // barra de acciones fija
  const bar = card(s, { name: 'barra-acciones', x: X, y: 820, w: 760, h: 72 });
  const cancel = button(bar, 'Cancelar', { variant: 'ghost' });
  cancel.x = 24; cancel.y = 26;
  const save = button(bar, 'Guardar lead', { icon: 'plus' });
  save.x = 760 - 24 - save.width; save.y = 26;
  const save2 = button(bar, 'Guardar y asignar', { variant: 'secondary' });
  save2.x = save.x - 12 - save2.width; save2.y = 26;
  return s;
}

function scrDetalle(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 05 · Detalle del lead', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Leads');
  topbar(s, 'LEAD-2026-0142', 'Finca La Sabana · Ana Rodríguez');
  txt(s, 'Leads  ›  Agrícola  ›  LEAD-2026-0142', { size: 11, color: T.text3, x: 280, y: 88 });

  const X = 280;

  // cabecera
  const head = card(s, { name: 'cabecera', x: X, y: 112, w: 1128, h: 116 });
  circle(head, { x: 28, y: 30, d: 56, fill: tint(T.agri, 0.86) });
  txt(head, 'AR', { size: 18, bold: true, color: T.agri, x: 42, y: 47 });
  txt(head, 'Ana Rodríguez', { size: 20, bold: true, color: T.text, x: 104, y: 26 });
  txt(head, 'Finca La Sabana · +506 8812-4477 · ana@fincalasabana.cr', { size: 12, color: T.text2, x: 104, y: 54 });
  const st = chip(head, 'Nuevo', STATUS['Nuevo']);
  st.x = 104; st.y = 76;
  const ln = chip(head, 'Agrícola', LINEAS['Agrícola']);
  ln.x = 104 + st.width + 8; ln.y = 76;
  const ch1 = chip(head, 'WhatsApp', T.neutral);
  ch1.x = ln.x + ln.width + 8; ch1.y = 76;

  const b1 = button(head, 'Cambiar estado', { icon: 'edit' });
  b1.x = 1128 - 28 - b1.width; b1.y = 26;
  const b2 = button(head, 'Editar', { variant: 'secondary' });
  b2.x = b1.x - 8 - b2.width; b2.y = 26;

  txt(head, 'Ingresó 20/10/2026 14:32 · Responsable: J. Pérez · Actualizado 22/10/2026 09:14', {
    size: 11, color: T.text3, x: 1128 - 28 - 460, y: 74, w: 460, align: 'RIGHT'
  });

  // columna izquierda
  const info = card(s, { name: 'datos', x: X, y: 244, w: 740, h: 236 });
  cardTitle(info, 'Datos de la consulta', null, 24, 22);
  rect(info, { x: 24, y: 50, w: 692, h: 1, fill: T.borderSoft });
  const dts = [
    ['Empresa', 'Finca La Sabana'], ['Canal de origen', 'WhatsApp'],
    ['Línea de negocio', 'Agrícola'], ['Producto de interés', 'Tractor Farmall JXM 55'],
    ['Teléfono', '+506 8812-4477'], ['Correo', 'ana@fincalasabana.cr'],
    ['Fecha de ingreso', '20/10/2026 14:32'], ['Estado actual', 'Nuevo']
  ];
  dts.forEach(function (d, i) {
    const col = i % 2, row = Math.floor(i / 2);
    const xx = 24 + col * 350, yy = 66 + row * 40;
    txt(info, d[0], { size: 10, color: T.text3, x: xx, y: yy, upper: true, ls: 0.5 });
    txt(info, d[1], { size: 12, bold: true, color: T.text, x: xx, y: yy + 16, w: 320 });
  });

  // descripción
  const des = card(s, { name: 'descripcion', x: X, y: 496, w: 740, h: 128 });
  cardTitle(des, 'Descripción de la consulta', null, 24, 22);
  txt(des, 'Cliente solicita cotización de tractor 55 HP para 40 hectáreas de caña. Requiere financiamiento a 36 meses y capacitación del operador. Interesado en visita a finca en Liberia.', {
    size: 12, color: T.text2, x: 24, y: 52, w: 692, lh: 20
  });

  // tabs + bitácora
  const tabs = mkFrame(s, 'tabs', { x: X, y: 640, w: 740, h: 34 });
  ['Bitácora (4)', 'Historial de estados', 'Archivos'].forEach(function (t, i) {
    const on = i === 0;
    const xx = [0, 110, 262][i];
    txt(tabs, t, { size: 12, bold: on, color: on ? T.corp : T.text3, x: xx, y: 4 });
    if (on) rect(tabs, { x: xx, y: 26, w: 92, h: 2, fill: T.corp, radius: 1 });
  });

  const notes = card(s, { name: 'bitacora', x: X, y: 680, w: 740, h: 184 });
  const items = [
    ['MR', 'María Rojas', '22/10/2026 09:14', 'Se llamó al cliente, solicita cotización formal con financiamiento. Se agenda visita para el 24/10.', T.constr],
    ['JP', 'Jorge Pérez', '21/10/2026 16:02', 'Primer contacto por WhatsApp. Confirmado el interés en tractor 55 HP.', T.corpSoft],
    ['JP', 'Jorge Pérez', '20/10/2026 15:10', 'Lead asignado desde el formulario web. Se valida número de teléfono.', T.corpSoft]
  ];
  items.forEach(function (n, i) {
    const yy = 20 + i * 56;
    circle(notes, { x: 24, y: yy, d: 30, fill: tint(n[4], 0.8) });
    txt(notes, n[0], { size: 10, bold: true, color: n[4], x: 31, y: yy + 10 });
    txt(notes, n[1], { size: 11, bold: true, color: T.text, x: 66, y: yy });
    txt(notes, n[2], { size: 10, color: T.text3, x: 150, y: yy + 1 });
    txt(notes, n[3], { size: 11, color: T.text2, x: 66, y: yy + 16, w: 640, lh: 16 });
    if (i < items.length - 1) rect(notes, { x: 66, y: yy + 50, w: 650, h: 1, fill: T.borderSoft });
  });

  // columna derecha
  const next = card(s, { name: 'proxima-accion', x: X + 760, y: 244, w: 368, h: 168 });
  txt(next, 'Próxima acción', { size: 12, bold: true, color: T.text3, x: 24, y: 20, upper: true, ls: 0.6 });
  const na = ['24/10/2026', 'Visita a finca en Liberia', 'J. Pérez'];
  txt(next, '24', { size: 26, bold: true, color: T.corp, x: 24, y: 44 });
  txt(next, 'OCT', { size: 11, bold: true, color: T.text3, x: 62, y: 52 });
  txt(next, na[1], { size: 13, bold: true, color: T.text, x: 24, y: 84, w: 320 });
  txt(next, 'Responsable: ' + na[2], { size: 11, color: T.text2, x: 24, y: 106 });
  const chg = button(next, 'Reagendar', { variant: 'secondary' });
  chg.x = 24; chg.y = 126;
  const done = button(next, 'Completar');
  done.x = 24 + chg.width + 8; done.y = 126;

  const hist = card(s, { name: 'historial', x: X + 760, y: 428, w: 368, h: 252 });
  cardTitle(hist, 'Historial de estados', null, 24, 20);
  const hs = [['Nuevo', '20/10 14:32', T.corp], ['Asignado', '20/10 15:10', T.corpSoft], ['Contactado', '21/10 16:02', T.precision], ['En seguimiento', '22/10 09:14', T.constr]];
  hs.forEach(function (h, i) {
    const yy = 56 + i * 44;
    circle(hist, { x: 24, y: yy, d: 10, fill: h[2] });
    if (i < hs.length - 1) rect(hist, { x: 28, y: yy + 10, w: 2, h: 34, fill: T.border });
    txt(hist, h[0], { size: 11, bold: true, color: T.text, x: 44, y: yy - 2 });
    txt(hist, h[1], { size: 10, color: T.text3, x: 44, y: yy + 14 });
  });

  const reg = card(s, { name: 'registro', x: X + 760, y: 696, w: 368, h: 168 });
  cardTitle(reg, 'Registro y auditoría', null, 24, 20);
  [['Creado', '20/10/2026 14:32'], ['Última actualización', '22/10/2026 09:14'], ['Código', 'LEAD-2026-0142']].forEach(function (r, i) {
    txt(reg, r[0], { size: 10, color: T.text3, x: 24, y: 54 + i * 32 });
    txt(reg, r[1], { size: 11, bold: true, color: T.text, x: 190, y: 54 + i * 32 });
  });
  return s;
}

function overlay(s, name) {
  const o = mkFrame(s, name, { w: 1440, h: 900, fill: '#0B1A2E', fillOpacity: 0.55, x: 0, y: 0, clip: true });
  return o;
}

function scrModalEstado(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 06 · Cambio de estado', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Leads');
  topbar(s, 'LEAD-2026-0142', 'Finca La Sabana · Ana Rodríguez');
  const ov = overlay(s, 'overlay');

  const m = mkFrame(ov, 'modal', { w: 560, h: 604, fill: T.surface, radius: 14, x: 440, y: 148 });
  rect(m, { x: 0, y: 0, w: 560, h: 4, fill: T.corp, radius: 2 });
  txt(m, 'Cambiar estado del lead', { size: 18, bold: true, color: T.text, x: 32, y: 28 });
  txt(m, 'El cambio queda registrado en el historial con su nombre y la fecha.', { size: 11, color: T.text3, x: 32, y: 54, w: 470 });
  txt(m, 'Estado actual', { size: 10, color: T.text3, x: 32, y: 88, upper: true, ls: 0.5 });
  const cur = chip(m, 'En seguimiento', STATUS['En seguimiento']);
  cur.x = 32; cur.y = 104;

  rect(m, { x: 32, y: 144, w: 496, h: 1, fill: T.borderSoft });
  txt(m, 'Nuevo estado', { size: 11, bold: true, color: T.text2, x: 32, y: 160 });

  const opts = ['Nuevo', 'Asignado', 'Contactado', 'En seguimiento', 'Oportunidad comercial', 'Ganado', 'Perdido'];
  opts.forEach(function (o, i) {
    const yy = 184 + i * 40;
    const on = o === 'Oportunidad comercial';
    rect(m, { x: 32, y: yy, w: 496, h: 34, fill: on ? tint(T.corp, 0.94) : null, stroke: on ? T.corp : T.borderSoft, radius: 8 });
    circle(m, { x: 46, y: yy + 11, d: 12, stroke: on ? T.corp : T.border, sw: 1.5 });
    if (on) circle(m, { x: 50, y: yy + 15, d: 4, fill: T.corp });
    txt(m, o, { size: 12, bold: on, color: on ? T.corp : T.text2, x: 68, y: yy + 9 });
    if (o === 'Ganado') txt(m, 'cierra el lead', { size: 10, color: T.text3, x: 420, y: yy + 11, w: 96, align: 'RIGHT' });
  });

  const com = field(m, 'Comentario *', 'Cliente confirma presupuesto aprobado para visita técnica.', { w: 496, tall: true });
  com.x = 32; com.y = 474;
  rect(m, { x: 0, y: 540, w: 560, h: 1, fill: T.border });
  const cancel = button(m, 'Cancelar', { variant: 'secondary' });
  cancel.x = 560 - 32 - cancel.width; cancel.y = 556;
  const ok = button(m, 'Guardar estado');
  ok.x = cancel.x - 12 - ok.width; ok.y = 556;
  return s;
}

function scrExport(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 07 · Exportar CSV', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  sidebar(s, 'Leads');
  topbar(s, 'Exportar registros', 'Leads filtrados');
  const ov = overlay(s, 'overlay');

  const m = mkFrame(ov, 'modal', { w: 520, h: 452, fill: T.surface, radius: 14, x: 460, y: 224 });
  rect(m, { x: 0, y: 0, w: 520, h: 4, fill: T.carga, radius: 2 });
  txt(m, 'Exportar CSV', { size: 18, bold: true, color: T.text, x: 32, y: 28 });
  txt(m, 'Se exportarán los registros que cumplen los filtros activos y a los que tiene acceso.', {
    size: 11, color: T.text3, x: 32, y: 54, w: 440, lh: 17
  });

  rect(m, { x: 32, y: 92, w: 456, h: 92, fill: T.bg, radius: 8 });
  [['Filtros aplicados', 'Estado + Canal + 01/10–22/10'], ['Registros', '184'], ['Formato', 'CSV UTF-8 (compatible con Excel)']].forEach(function (r, i) {
    txt(m, r[0], { size: 10, color: T.text3, x: 44, y: 104 + i * 26 });
    txt(m, r[1], { size: 11, bold: true, color: T.text, x: 190, y: 104 + i * 26 });
  });

  txt(m, 'Columnas a incluir', { size: 11, bold: true, color: T.text2, x: 32, y: 204 });
  const cols = ['Código y fechas', 'Datos de contacto', 'Canal y línea', 'Estado y responsable', 'Próxima acción', 'Notas de gestión'];
  cols.forEach(function (c, i) {
    const col = i % 2, row = Math.floor(i / 2);
    const xx = 32 + col * 236, yy = 226 + row * 30;
    mkFrame(m, 'chkbox', { x: xx, y: yy, w: 14, h: 14, fill: i < 4 ? T.corp : T.surface, stroke: i < 4 ? null : T.border, radius: 3 });
    if (i < 4) check(m, xx + 2, yy + 2, '#FFFFFF', 10);
    txt(m, c, { size: 11, color: T.text2, x: xx + 22, y: yy - 1 });
  });

  rect(m, { x: 32, y: 322, w: 456, h: 34, fill: tint(T.warning, 0.92), radius: 6 });
  txt(m, 'Datos ficticios de prototipo · no contienen información real de clientes', { size: 10, color: T.warning, x: 44, y: 332, bold: true });

  rect(m, { x: 0, y: 388, w: 520, h: 1, fill: T.border });
  const cancel = button(m, 'Cancelar', { variant: 'secondary' });
  cancel.x = 520 - 32 - cancel.width; cancel.y = 404;
  const ok = button(m, 'Descargar CSV', { icon: 'download' });
  ok.x = cancel.x - 12 - ok.width; ok.y = 404;
  return s;
}

function scrComponentes(x, y) {
  const s = mkFrame(page, '◆ CRAISA / 08 · Componentes y tokens', { w: 1440, h: 900, fill: T.bg, x: x, y: y, clip: true });
  topbar(s, 'Sistema de diseño', 'Tokens de marca, estados y componentes base');
  const X = 32;

  // paleta
  const pal = card(s, { x: X, y: 96, w: 560, h: 244 });
  cardTitle(pal, 'Paleta corporativa', 'Libro de marca CRAISA 2025', 24, 20);
  const sw = [
    ['#143F7F', 'PMS 7686C', 'Corporativo'],
    ['#AA182C', 'PMS 187C', 'Agrícola'],
    ['#D47E00', 'PMS 145C', 'Construcción'],
    ['#3DAE2B', 'PMS 361C', 'Mov. de Carga'],
    ['#004B70', 'PMS 114-16C', 'Agr. Precisión'],
    ['#B2D043', 'Carbono', 'Carbono Neutral']
  ];
  sw.forEach(function (c, i) {
    const xx = 24 + i * 86, yy = 58;
    rect(pal, { x: xx, y: yy, w: 74, h: 74, fill: c[0], radius: 8 });
    txt(pal, c[0], { size: 9, bold: true, color: T.text, x: xx, y: yy + 82 });
    txt(pal, c[1], { size: 9, color: T.text2, x: xx, y: yy + 96 });
    txt(pal, c[2], { size: 9, color: T.text3, x: xx, y: yy + 110 });
  });
  rect(pal, { x: 24, y: 190, w: 512, h: 34, fill: T.bg, radius: 6 });
  txt(pal, 'Neutrales UI  ·  #101828  #5C6675  #8A94A3  #E3E7ED  #F4F6F9', { size: 10, color: T.text2, x: 36, y: 202 });

  // tipografía
  const typ = card(s, { x: X, y: 356, w: 560, h: 244 });
  cardTitle(typ, 'Tipografía', 'Arial · familia indicada en el manual', 24, 20);
  txt(typ, 'Aa', { size: 44, bold: true, color: T.text, x: 24, y: 52 });
  txt(typ, 'Arial Bold', { size: 10, color: T.text3, x: 100, y: 62 });
  txt(typ, 'Aa', { size: 44, color: T.text, x: 190, y: 52 });
  txt(typ, 'Arial Regular', { size: 10, color: T.text3, x: 266, y: 62 });
  txt(typ, 'Aa', { size: 44, font: FONT.black, color: T.corp, x: 356, y: 52 });
  txt(typ, 'Arial Bold Italic', { size: 10, color: T.text3, x: 432, y: 62 });
  [['H1 · 22/30', 22, true], ['H2 · 18/26', 18, true], ['Body · 13/20', 13, false], ['Caption · 11/16', 11, false]].forEach(function (t, i) {
    txt(typ, 'Gestión comercial CRAISA', { size: t[1], bold: t[2], color: T.text, x: 24, y: 116 + i * 30 });
    txt(typ, t[0], { size: 9, color: T.text3, x: 340, y: 124 + i * 30 });
  });

  // estados
  const est = card(s, { x: X + 580, y: 96, w: 400, h: 244 });
  cardTitle(est, 'Estados del lead', '7 estados del flujo', 24, 20);
  Object.keys(STATUS).forEach(function (k, i) {
    const c = chip(est, k, STATUS[k]);
    c.x = 24 + (i % 2) * 190;
    c.y = 58 + Math.floor(i / 2) * 38;
  });
  txt(est, 'Ganado y Perdido cierran el lead y detienen la próxima acción.', {
    size: 10, color: T.text3, x: 24, y: 200, w: 340, lh: 15
  });

  // botones e inputs
  const ctl = card(s, { x: X + 580, y: 356, w: 400, h: 244 });
  cardTitle(ctl, 'Controles', null, 24, 20);
  const b1 = button(ctl, 'Acción principal'); b1.x = 24; b1.y = 54;
  const b2 = button(ctl, 'Secundario', { variant: 'secondary' }); b2.x = 24 + b1.width + 10; b2.y = 54;
  const b3 = button(ctl, 'Texto', { variant: 'ghost' }); b3.x = 24; b3.y = 104;
  const i1 = field(ctl, 'Campo normal', 'Texto de ejemplo', { w: 172 }); i1.x = 24; i1.y = 150;
  const i2 = field(ctl, 'Campo con error', 'dato inválido', { w: 172, error: 'Formato incorrecto' }); i2.x = 208; i2.y = 150;

  // componente tabla
  const tbl = card(s, { x: X, y: 616, w: 980, h: 250 });
  cardTitle(tbl, 'Fila de tabla', 'Altura 52 px · hover y selección', 24, 20);
  rect(tbl, { x: 0, y: 52, w: 980, h: 44, fill: T.bg });
  ['Código', 'Cliente', 'Empresa', 'Canal', 'Estado'].forEach(function (h, i) {
    txt(tbl, h, { size: 10, bold: true, color: T.text3, x: 24 + i * 190, y: 66, upper: true, ls: 0.5 });
  });
  const row = LEADS[1];
  rect(tbl, { x: 0, y: 96, w: 980, h: 52, fill: '#FAFBFD' });
  txt(tbl, row[0], { size: 11, bold: true, color: T.corp, x: 24, y: 115 });
  txt(tbl, row[2], { size: 12, bold: true, color: T.text, x: 214, y: 114 });
  txt(tbl, row[3], { size: 11, color: T.text2, x: 404, y: 115 });
  txt(tbl, row[4], { size: 11, color: T.text2, x: 594, y: 115 });
  const bc = chip(tbl, row[6], STATUS[row[6]]); bc.x = 784; bc.y = 111;
  rect(tbl, { x: 0, y: 148, w: 980, h: 1, fill: T.border });
  txt(tbl, 'Espaciado base 8 px · radios 6/8/12 · bordes #E3E7ED · sombra suave en tarjetas', { size: 10, color: T.text3, x: 24, y: 166 });

  const note = card(s, { x: X + 1004, y: 616, w: 404, h: 250 });
  cardTitle(note, 'Reglas de uso', null, 24, 20);
  ['El logo se usa con el sello Carbono Neutral cuando aparece solo.', 'El azul corporativo es el color de acción principal.', 'Cada línea de negocio conserva su color del paraguas.', 'Los estados usan color + texto, nunca solo color.'].forEach(function (t, i) {
    circle(note, { x: 24, y: 62 + i * 44, d: 6, fill: T.carbon });
    txt(note, t, { size: 11, color: T.text2, x: 40, y: 54 + i * 44, w: 340, lh: 16 });
  });

  txt(s, 'CRAISA · UI Kit v1 · Generado desde el Sistema de Gestión de Leads · 22/10/2026', {
    size: 10, color: T.text3, x: 32, y: 880
  });
  return s;
}

// ---------------------------------------------------------------- main -----
let LOGO_HASH = null;
let page = null;

function cleanup() {
  const kill = figma.currentPage.children.filter(function (n) {
    return n.name.indexOf('◆ CRAISA') === 0;
  });
  kill.forEach(function (n) { n.remove(); });
}

async function main() {
  await loadFonts();
  page = figma.currentPage;
  page.name = 'CRAISA · Leads UI Kit';

  const img = figma.createImage(figma.base64Decode(LOGO_B64));
  LOGO_HASH = img.hash;

  cleanup();

  const GAP = 80;
  const screens = [
    scrLogin, scrDashboard, scrListado, scrNuevo,
    scrDetalle, scrModalEstado, scrExport, scrComponentes
  ];
  const created = screens.map(function (fn, i) {
    return fn(i * (1440 + GAP), 0);
  });

  // encabezado del tablero
  const head = mkFrame(page, '◆ CRAISA / 00 · Portada', { w: 1200, h: 200, fill: null, x: 0, y: -300 });
  txt(head, 'CRAISA', { size: 12, bold: true, color: T.corp, x: 0, y: 0, upper: true, ls: 3 });
  txt(head, 'Sistema de Gestión y Seguimiento de Leads Comerciales', { size: 34, bold: true, color: T.text, x: 0, y: 26, w: 1100, lh: 42 });
  txt(head, 'Boceto de interfaz v1 · 8 pantallas · identidad basada en el Libro de Marca Craisa 2025 · datos ficticios', {
    size: 13, color: T.text2, x: 0, y: 86, w: 1000
  });
  txt(head, 'Página generada automáticamente · los frames son editables', { size: 11, color: T.text3, x: 0, y: 112 });
  rect(head, { x: 0, y: 146, w: 120, h: 4, fill: T.carbon, radius: 2 });

  figma.currentPage.selection = created;
  figma.viewport.scrollAndZoomIntoView(created);
  figma.notify('CRAISA · UI Kit generado: ' + created.length + ' pantallas', { timeout: 6000 });
  figma.closePlugin();
}

main().catch(function (e) {
  figma.notify('Error: ' + e.message, { error: true, timeout: 12000 });
  console.error(e);
  figma.closePlugin();
});
