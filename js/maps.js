import { BOUNDS, PROVINCES, AIRPORTS, PLACES, toXZ } from './rd-data.js';
import { POLY, LINES } from './terrain.js';
import { TOLL_LIST, PUMPS } from './towns.js';

/* =========================================================
   MAPA DE REPÚBLICA DOMINICANA (minimapa y mapa completo)
   Se dibuja una sola vez en una imagen y luego se recorta.
   ========================================================= */
const { x0, x1, z0, z1 } = BOUNDS;
const PX = 260;                         // unidades del juego por píxel de la imagen base
const W = Math.ceil((x1 - x0) / PX), H = Math.ceil((z1 - z0) / PX);
let base = null;
const tx = x => (x - x0) / PX, tz = z => (z - z0) / PX;

export function buildBaseMap() {
  base = document.createElement('canvas'); base.width = W; base.height = H;
  const g = base.getContext('2d');
  const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#0e5c8a'); sea.addColorStop(1, '#0a4a74'); g.fillStyle = sea; g.fillRect(0, 0, W, H);
  const path = pts => { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))); g.closePath(); };
  g.fillStyle = '#6f8a54'; path(POLY.haiti); g.fill();
  g.fillStyle = '#5f9a44'; path(POLY.rd); g.fill(); POLY.islands.forEach(p => { path(p); g.fill(); });
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; path(POLY.rd); g.stroke();
  g.fillStyle = '#2f8fc0'; POLY.lakes.forEach(p => { path(p); g.fill(); });
  // frontera
  g.setLineDash([5, 4]); g.strokeStyle = '#ff5a5a'; g.lineWidth = 2; g.beginPath();
  const bp = POLY.haiti.slice(5); bp.forEach(([x, z], i) => i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '700 22px system-ui'; g.textAlign = 'center'; const [hx, hz] = toXZ(-72.45, 19.0); g.fillText('HAITÍ', tx(hx), tz(hz));
  // montañas (sombreado suave)
  // carreteras y tren
  for (const r of LINES.roads) { g.strokeStyle = r.main ? '#ffd34d' : '#f2efe6'; g.lineWidth = r.main ? 2.4 : 1.3; g.beginPath(); r.pts.forEach(([x, z], i) => i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))); g.stroke(); }
  for (const r of LINES.rails) { g.strokeStyle = '#' + r.color.toString(16).padStart(6, '0'); g.lineWidth = 2; g.setLineDash([6, 3]); g.beginPath(); r.pts.forEach(([x, z], i) => i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))); g.stroke(); g.setLineDash([]); }
  return base;
}

// Dibuja el mapa: centro (cx, cz), escala (unidades por píxel en pantalla), opciones
export function drawMap(ctx, w, h, cx, cz, upp, o = {}) {
  ctx.save(); ctx.clearRect(0, 0, w, h);
  const s = PX / upp; // píxeles de pantalla por píxel base
  const sx = w / 2 - tx(cx) * s, sy = h / 2 - tz(cz) * s;
  const P = (x, z) => [sx + tx(x) * s, sy + tz(z) * s];
  ctx.fillStyle = '#0a4a74'; ctx.fillRect(0, 0, w, h);
  if (upp > 90) ctx.drawImage(base, sx, sy, W * s, H * s);
  else {
    // dibujo vectorial (nítido) cuando se ve de cerca
    const path = pts => { ctx.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); };
    ctx.fillStyle = '#6f8a54'; path(POLY.haiti); ctx.fill();
    ctx.fillStyle = '#5f9a44'; path(POLY.rd); ctx.fill(); POLY.islands.forEach(p => { path(p); ctx.fill(); });
    ctx.fillStyle = '#2f8fc0'; POLY.lakes.forEach(p => { path(p); ctx.fill(); });
    const vx0 = cx - w / 2 * upp - 400, vx1 = cx + w / 2 * upp + 400, vz0 = cz - h / 2 * upp - 400, vz1 = cz + h / 2 * upp + 400;
    ctx.fillStyle = 'rgba(200,200,190,.55)';
    for (const p of PROVINCES) { if (p.px === undefined || p.px < vx0 - p.R || p.px > vx1 + p.R || p.pz < vz0 - p.R || p.pz > vz1 + p.R) continue; const [a, b] = P(p.px, p.pz); ctx.beginPath(); ctx.arc(a, b, p.R * .8 / upp, 0, 7); ctx.fill(); }
    const line = (r, color, width, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.beginPath(); let pen = false;
      for (const [x, z] of r.pts) { if (x < vx0 || x > vx1 || z < vz0 || z > vz1) { pen = false; continue; } const [a, b] = P(x, z); if (pen) ctx.lineTo(a, b); else { ctx.moveTo(a, b); pen = true; } }
      ctx.stroke(); ctx.setLineDash([]);
    };
    for (const r of LINES.roads) { line(r, 'rgba(0,0,0,.45)', Math.max(r.main ? 5 : 3.5, r.w / upp + 2)); line(r, r.main ? '#ffd34d' : '#f2efe6', Math.max(r.main ? 3 : 2, r.w / upp)); }
    for (const r of LINES.rails) line(r, '#' + r.color.toString(16).padStart(6, '0'), 2.5, [6, 4]);
  }
  const big = !!o.big;
  // provincias
  ctx.textAlign = 'center';
  for (const p of PROVINCES) {
    const [x, y] = P(p.x, p.z); if (x < -50 || y < -20 || x > w + 50 || y > h + 20) continue;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b2a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, big ? 4.5 : 3.5, 0, 7); ctx.fill(); ctx.stroke();
    if (big || upp < 120) { ctx.font = `700 ${big ? 12 : 10}px system-ui`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(p.name, x, y - 7); ctx.fillStyle = '#fff'; ctx.fillText(p.name, x, y - 7); if (big && upp < 160) { ctx.font = '500 10px system-ui'; ctx.strokeText(p.cap, x, y + 15); ctx.fillStyle = '#ffe9a8'; ctx.fillText(p.cap, x, y + 15); } }
  }
  const icon = (e, x, z, sz = 13) => { const [px, py] = P(x, z); if (px < -20 || py < -20 || px > w + 20 || py > h + 20) return; ctx.font = `${sz}px system-ui`; ctx.fillText(e, px, py + sz * .35); };
  if (o.layers?.air !== false) for (const a of AIRPORTS) icon('✈️', a.x, a.z, big ? 15 : 12);
  if (o.layers?.toll !== false) for (const t of TOLL_LIST) icon('🚧', t.x, t.z, big ? 13 : 11);
  if (o.layers?.gas !== false && (big || upp < 60)) for (const p of PUMPS) icon('⛽', p.x, p.z, big ? 11 : 10);
  if (o.layers?.places !== false && big) for (const p of PLACES) if (p.x !== undefined) icon('★', p.x, p.z, 12);
  if (o.ports && big) for (const p of o.ports) icon('⚓', p.x, p.z, 11);
  // ruta (GPS) hasta el personaje o el destino
  if (o.route && o.route.length > 1) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const trace = () => { ctx.beginPath(); o.route.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); };
    trace(); ctx.strokeStyle = 'rgba(6,20,46,.85)'; ctx.lineWidth = big ? 8 : 7; ctx.stroke();
    trace(); ctx.strokeStyle = o.routeColor || '#39d4ff'; ctx.lineWidth = big ? 4.5 : 4; ctx.stroke();
    if (o.routeStraight) { trace(); ctx.setLineDash([2, 9]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
  }
  // objetivos
  for (const m of o.marks || []) {
    const [x, y] = P(m.x, m.z), inside = x > 6 && y > 6 && x < w - 6 && y < h - 6;
    let px = x, py = y;
    if (!inside) { const a = Math.atan2(y - h / 2, x - w / 2), r = Math.min(w, h) / 2 - 10; px = w / 2 + Math.cos(a) * r; py = h / 2 + Math.sin(a) * r; }
    ctx.fillStyle = m.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, inside ? 8 : 6, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = '12px system-ui'; ctx.fillText(m.icon || '', px, py + 4.5);
  }
  // jugador
  if (o.player) {
    const [x, y] = P(o.player.x, o.player.z); ctx.translate(x, y); ctx.rotate(-o.player.yaw + Math.PI);
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#0b2a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
export const mapInfo = () => ({ W, H, PX });
