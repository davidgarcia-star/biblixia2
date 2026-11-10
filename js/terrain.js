import * as THREE from 'three';
import { toXZ, BOUNDS, RD, HAITI, ISLANDS, LAKES, RIVERS, RIDGES, PROVINCES, PROV, ROADS, RAILS, AIRPORTS, KM } from './rd-data.js';

/* =========================================================
   TERRENO DE LA ISLA (escala 1:2) — se carga por partes alrededor del jugador
   - Una cuadrícula de 400 u guarda la distancia con signo a la costa (+ tierra, − mar).
   - La altura sale de esa distancia, las cordilleras reales y ruido suave.
   - Pueblos, aeropuertos, carreteras y la vía del tren aplanan el terreno.
   ========================================================= */
const { x0, x1, z0, z1 } = BOUNDS;
const G = 400, GX = Math.ceil((x1 - x0) / G) + 1, GZ = Math.ceil((z1 - z0) / G) + 1;
const SD = new Float32Array(GX * GZ), TY = new Uint8Array(GX * GZ); // TY: 0 mar · 1 RD · 2 Haití · 3 lago
const sm = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const P = poly => poly.map(([lo, la]) => toXZ(lo, la));
export const POLY = { rd: P(RD), haiti: P(HAITI), islands: ISLANDS.map(i => P(i.poly)), lakes: LAKES.map(l => P(l.poly)) };
export function inPoly(pts, x, z) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function segD(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px, qz = az + dz * t - pz; return [Math.sqrt(qx * qx + qz * qz), t];
}
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const rand2 = hash;
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z) => vnoise(x, z) * .55 + vnoise(x * 2.03 + 17, z * 2.03 + 9) * .3 + vnoise(x * 4.1 + 3, z * 4.1 + 41) * .15;

/* ---------- 1) Máscaras y distancia a la costa ---------- */
export function buildMasks() {
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
    const x = x0 + i * G, z = z0 + j * G, k = j * GX + i;
    let t = 0;
    if (inPoly(POLY.rd, x, z) || POLY.islands.some(p => inPoly(p, x, z))) t = 1;
    else if (inPoly(POLY.haiti, x, z)) t = 2;
    if (t && POLY.lakes.some(p => inPoly(p, x, z))) t = 3;
    if (t === 2 && (i < 3 || j < 3 || j > GZ - 4)) t = 0; // Haití baja al mar en el borde del mundo
    TY[k] = t;
  }
  // distancia (chaflán en dos pasadas) a la tierra y al agua
  const dl = new Float32Array(GX * GZ), dw = new Float32Array(GX * GZ), BIG = 1e9;
  for (let k = 0; k < GX * GZ; k++) { const land = TY[k] === 1 || TY[k] === 2; dl[k] = land ? 0 : BIG; dw[k] = land ? BIG : 0; }
  const pass = d => {
    const R2 = Math.SQRT2;
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { const k = j * GX + i; let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + 1); if (j > 0) { v = Math.min(v, d[k - GX] + 1); if (i > 0) v = Math.min(v, d[k - GX - 1] + R2); if (i < GX - 1) v = Math.min(v, d[k - GX + 1] + R2); } d[k] = v; }
    for (let j = GZ - 1; j >= 0; j--) for (let i = GX - 1; i >= 0; i--) { const k = j * GX + i; let v = d[k];
      if (i < GX - 1) v = Math.min(v, d[k + 1] + 1); if (j < GZ - 1) { v = Math.min(v, d[k + GX] + 1); if (i < GX - 1) v = Math.min(v, d[k + GX + 1] + R2); if (i > 0) v = Math.min(v, d[k + GX - 1] + R2); } d[k] = v; }
  };
  pass(dl); pass(dw);
  for (let k = 0; k < GX * GZ; k++) SD[k] = (dw[k] > 0 ? dw[k] - .5 : -(dl[k] - .5)) * G;
}
function sdAt(x, z) {
  const fx = (x - x0) / G, fz = (z - z0) / G;
  const i = Math.max(0, Math.min(GX - 2, Math.floor(fx))), j = Math.max(0, Math.min(GZ - 2, Math.floor(fz)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j)), k = j * GX + i;
  return (SD[k] * (1 - u) + SD[k + 1] * u) * (1 - v) + (SD[k + GX] * (1 - u) + SD[k + GX + 1] * u) * v;
}
export function typeAt(x, z) {
  const i = Math.round((x - x0) / G), j = Math.round((z - z0) / G);
  if (i < 0 || j < 0 || i >= GX || j >= GZ) return 0;
  const t = TY[j * GX + i];
  if (t === 0 && sdAt(x, z) > 0) return 1;
  return t;
}
export const inHaiti = (x, z) => x < POLY.rd[0][0] + 9000 && inPoly(POLY.haiti, x, z);

/* ---------- 2) Montañas ---------- */
const ridgeList = RIDGES.map(r => ({ w: r.w * KM, pts: r.pts.map(([lo, la, h]) => [...toXZ(lo, la), h]) }));
function ridgeH(x, z) {
  let h = 0;
  for (const r of ridgeList) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1];
    if (x < Math.min(a[0], b[0]) - r.w * 2.6 || x > Math.max(a[0], b[0]) + r.w * 2.6 || z < Math.min(a[1], b[1]) - r.w * 2.6 || z > Math.max(a[1], b[1]) + r.w * 2.6) continue;
    const [d, t] = segD(x, z, a[0], a[1], b[0], b[1]);
    const hh = (a[2] + (b[2] - a[2]) * t) * Math.exp(-((d / r.w) ** 2));
    if (hh > h) h = hh;
  }
  return h;
}

/* ---------- 3) Lugares planos: pueblos y aeropuertos ---------- */
export const FLATS = [];
for (const p of PROVINCES) { const [x, z] = toXZ(p.lon, p.lat); p.x = x; p.z = z; p.R = [650, 950, 1350, 1800][p.big || 0]; }
for (const a of AIRPORTS) { const [x, z] = toXZ(a.lon, a.lat); a.x = x; a.z = z; const r = a.hdg * Math.PI / 180; a.dir = [Math.sin(r), -Math.cos(r)]; }

// altura base (sin carreteras)
function H0raw(x, z) {
  const sd = sdAt(x, z), t = typeAt(x, z);
  if (sd > 0 && t !== 3) {
    const n1 = fbm(x / 7000, z / 7000), n2 = fbm(x / 900, z / 900), k = sm(sd, 0, 5000);
    let h = 1.2 + 4 * sm(sd, 0, 700) + 55 * sm(sd, 500, 16000) + (ridgeH(x, z) * (.78 + .44 * n1) + (n1 - .35) * 90 + (n2 - .5) * 22) * k;
    // mogotes de Los Haitises
    const [hx, hz] = HAI, dh = Math.hypot(x - hx, z - hz);
    if (dh < 12000) h += Math.max(0, vnoise(x / 700, z / 700) - .42) * 220 * (1 - dh / 12000) * k;
    return Math.max(.6, h);
  }
  return -1.5 - 70 * sm(-sd, 0, 9000) - (t === 3 ? 6 : 0);
}
const HAI = toXZ(-69.58, 19.0);
for (const p of PROVINCES) FLATS.push({ x: p.x, z: p.z, r: p.R, h: 0, kind: 'city' });
for (const a of AIRPORTS) FLATS.push({ x: a.x, z: a.z, r: 1, h: 0, kind: 'air', a });
function flatW(f, x, z) {
  if (f.kind === 'air') { const [dx, dz] = f.a.dir, px = x - f.x, pz = z - f.z, al = Math.abs(px * dx + pz * dz), sd2 = Math.abs(-px * dz + pz * dx); return 1 - sm(Math.max(al / 1150, sd2 / 360), .8, 1.3); }
  const d = Math.hypot(x - f.x, z - f.z); return 1 - sm(d, f.r * .85, f.r * 1.5);
}
function H0(x, z) {
  let h = H0raw(x, z);
  if (h <= 0) return h;
  for (const f of FLATS) { if (Math.abs(x - f.x) > 3200 || Math.abs(z - f.z) > 3200) continue; const w = flatW(f, x, z); if (w > 0) h = h + (f.h - h) * w; }
  return h;
}
export function initFlats() { for (const f of FLATS) f.h = Math.max(3, H0raw(f.x, f.z)); }

/* ---------- 4) Carreteras y tren (perfil suave + corredor plano) ---------- */
const resolve = path => path.map(p => typeof p === 'string' ? [PROV[p].x, PROV[p].z] : toXZ(p[0], p[1]));
export function densify(pts, step) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(n).map(v => [v.x, v.z]);
}
const CELL = 400, grid = new Map(), gk = (i, j) => i * 100003 + j;
function indexSeg(s) {
  const m = s.w / 2 + 60;
  const i0 = Math.floor((Math.min(s.ax, s.bx) - m) / CELL), i1 = Math.floor((Math.max(s.ax, s.bx) + m) / CELL), j0 = Math.floor((Math.min(s.az, s.bz) - m) / CELL), j1 = Math.floor((Math.max(s.az, s.bz) + m) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = gk(i, j); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(s); }
}
// carretera más cercana: { y, d, kind, s }
export function nearRoad(x, z, maxD = 60) {
  const l = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL))); if (!l) return null;
  let best = null;
  for (const s of l) { const [d, t] = segD(x, z, s.ax, s.az, s.bx, s.bz); const e = d - s.w / 2; if (e < maxD && (!best || e < best.e)) best = { e, d, t, y: s.y0 + (s.y1 - s.y0) * t, kind: s.kind, s }; }
  return best;
}
export const LINES = { roads: [], rails: [] };
function profile(pts, w) {
  let ys = pts.map(([x, z]) => H0(x, z));
  const water = ys.map(y => y < 1);
  for (let pass = 0; pass < 4; pass++) { const n = ys.length, o = ys.slice(); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -6; k <= 6; k++) { const q = Math.min(n - 1, Math.max(0, i + k)); s += o[q]; c++; } ys[i] = s / c; } }
  return ys.map((y, i) => water[i] ? Math.max(y, 6) : Math.max(y, 2));
}
export function buildLines() {
  for (const r of ROADS) {
    const pts = densify(resolve(r.path), r.city ? 25 : 40), w = r.main ? 15 : r.city ? 13 : 10, ys = profile(pts, w);
    for (let i = 0; i < pts.length - 1; i++) indexSeg({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1], w, y0: ys[i], y1: ys[i + 1], kind: 'road', main: !!r.main, line: LINES.roads.length, i });
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    LINES.roads.push({ name: r.name, pts, ys, w, main: !!r.main, cum });
  }
  for (const rl of RAILS) {
    const base = densify(resolve(rl.path), 40);
    const pts = base.map(([x, z], i) => { const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [x - dz / l * 70, z + dx / l * 70]; });
    const ys = profile(pts, 6).map(y => y + .3);
    for (let i = 0; i < pts.length - 1; i++) indexSeg({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1], w: 7, y0: ys[i], y1: ys[i + 1], kind: 'rail', line: LINES.rails.length, i });
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const stops = rl.stops.map(id => { const p = PROV[id]; let bi = 0, bd = 1e12; pts.forEach(([x, z], i) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; bi = i; } }); return { id, name: p.cap, s: cum[bi], i: bi }; });
    LINES.rails.push({ ...rl, pts, ys, cum, len: cum[cum.length - 1], stops });
  }
}
export function linePos(line, s) {
  s = Math.max(0, Math.min(line.cum[line.cum.length - 1], s));
  let lo = 0, hi = line.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (line.cum[m] <= s) lo = m; else hi = m; }
  const t = (s - line.cum[lo]) / Math.max(1e-6, line.cum[hi] - line.cum[lo]), a = line.pts[lo], b = line.pts[hi];
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: line.ys[lo] + (line.ys[hi] - line.ys[lo]) * t, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), i: lo };
}

/* ---------- 5) Altura final ---------- */
export function Hfull(x, z) {
  let h = H0(x, z);
  const r = nearRoad(x, z, 70);
  if (r && h > .3) { const w = 1 - sm(r.e, 1, 70); const target = r.y - .12; if (Math.abs(target - h) < 160) h = h + (target - h) * w; }
  return h;
}
// altura del suelo igual que la malla cercana (triángulos de 20 u)
export const FINE = 20;
export function heightAt(x, z) {
  const fx = x / FINE, fz = z / FINE, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const X = i * FINE, Z = j * FINE;
  const a = Hc(X, Z), b = Hc(X + FINE, Z), c = Hc(X, Z + FINE);
  if (u + v < 1) return a + (b - a) * u + (c - a) * v;
  const d = Hc(X + FINE, Z + FINE); return d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
// caché pequeña de alturas (el jugador consulta mucho los mismos puntos)
const hc = new Map();
function Hc(x, z) { const k = x * 7919 + z; let v = hc.get(k); if (v === undefined) { v = Hfull(x, z); if (hc.size > 6000) hc.clear(); hc.set(k, v); } return v; }
// superficie donde se apoya un vehículo o persona: carretera/vía o terreno
export function groundAt(x, z) {
  const r = nearRoad(x, z, 0);
  const t = heightAt(x, z);
  if (r && r.e <= 0) return { y: Math.max(t, r.y + .2), road: r.kind, main: r.s.main };
  return { y: t, road: null };
}

/* ---------- 6) Colores del suelo ---------- */
const C = h => new THREE.Color(h);
const cSand = C(0xe6d6a8), cWet = C(0xcbb98a), cGrass = C(0x5a9638), cGrass2 = C(0x79a944), cCane = C(0x9cbc4e), cForest = C(0x3b7530), cPine = C(0x2d5a2c), cRock = C(0x8a806e), cDry = C(0xa09c60), cDeep = C(0x245a6a), cReef = C(0x5fc7c0), cHaiti = C(0x75904a), cCity = C(0xb4b0a6), cRun = C(0x6a6c70);
const [dxW] = toXZ(-70.6, 0), [, dzS] = toXZ(0, 18.6), [nwX] = toXZ(-71.2, 0), [, nwZ] = toXZ(0, 19.45), [eastX] = toXZ(-69.5, 0);
function colorAt(x, z, h, out) {
  const sd = sdAt(x, z), n = fbm(x / 2500, z / 2500);
  if (h <= .4) {
    if (h > -6) out.copy(cSand).lerp(cReef, sm(-h, .5, 6)); else out.copy(cReef).lerp(cDeep, sm(-h, 6, 40));
    return out;
  }
  out.copy(n > .5 ? cGrass2 : cGrass).lerp(cGrass, .5);
  const dry = (x < dxW && z > dzS) || (x < nwX && z < nwZ);
  if (dry) out.lerp(cDry, .62);
  if (x > eastX && n > .56 && h < 120) out.lerp(cCane, .8);
  if (!dry && n < .38) out.lerp(cForest, .55);
  if (h > 300) out.lerp(cForest, sm(h, 300, 500));
  if (h > 650) out.lerp(cPine, sm(h, 650, 850));
  if (h > 1250) out.lerp(cRock, sm(h, 1250, 1450));
  if (inHaitiFast(x, z)) out.lerp(cHaiti, .35);
  if (sd < 260 && h < 9) out.copy(cSand).lerp(cWet, h < 2 ? .6 : 0);
  for (const f of FLATS) { if (Math.abs(x - f.x) > 2600 || Math.abs(z - f.z) > 2600) continue; const w = flatW(f, x, z); if (w > .3) out.lerp(f.kind === 'air' ? cRun : cCity, Math.min(.85, (w - .3) * 1.4)); }
  out.multiplyScalar(.9 + vnoise(x / 60, z / 60) * .2);
  return out;
}
const [borderX] = toXZ(-71.7, 0);
const inHaitiFast = (x, z) => x < borderX && typeAt(x, z) === 2;

/* ---------- 7) Pedazos del terreno (chunks) con 3 niveles de detalle ---------- */
export const CH = 1000;
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
(() => { // grano fino
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), im = x.createImageData(128, 128);
  for (let q = 0; q < 128 * 128; q++) { const v = 205 + Math.random() * 50; im.data.set([v, v, v, 255], q * 4); } x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; terrainMat.map = t;
})();
function chunkGeo(cx, cz, res) {
  const n = res + 1, step = CH / res, ox = cx * CH, oz = cz * CH;
  const cnt = n * n + 4 * n, pos = new Float32Array(cnt * 3), col = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), c = new THREE.Color();
  const Y = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = ox + i * step, z = oz + j * step, k = j * n + i, h = res >= 50 ? Hc(x, z) : (res >= 16 ? Hfull(x, z) : H0(x, z));
    Y[k] = h; pos.set([i * step, h, j * step], k * 3); colorAt(x, z, h, c); col.set([c.r, c.g, c.b], k * 3); uv.set([x / 50, z / 50], k * 2);
  }
  const idx = [];
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { const a = j * n + i, b = a + 1, cc = a + n, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
  // faldas hacia abajo en los 4 bordes (tapan rendijas entre niveles de detalle)
  const edges = [[...Array(n).keys()].map(i => i), [...Array(n).keys()].map(i => (n - 1) * n + i), [...Array(n).keys()].map(j => j * n), [...Array(n).keys()].map(j => j * n + n - 1)];
  let base = n * n;
  edges.forEach((e, ei) => {
    e.forEach((k, q) => { pos.set([pos[k * 3], Y[k] - 60, pos[k * 3 + 2]], (base + q) * 3); col.set([col[k * 3], col[k * 3 + 1], col[k * 3 + 2]], (base + q) * 3); });
    for (let q = 0; q < n - 1; q++) { const a = e[q], b = e[q + 1], A = base + q, B = base + q + 1; if (ei === 0 || ei === 3) idx.push(a, b, A, b, B, A); else idx.push(a, A, b, b, A, B); }
    base += n;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
// Mapa completo de baja resolución (se ve desde el avión, lejos)
export function buildFarMesh() {
  const S = 1000, nx = Math.ceil((x1 - x0) / S) + 1, nz = Math.ceil((z1 - z0) / S) + 1;
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S, k = j * nx + i, h = H0(x, z); pos.set([x, h, z], k * 3); colorAt(x, z, h, c); col.set([c.r, c.g, c.b], k * 3); }
  const idx = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const uBox = { value: new THREE.Vector4(0, 0, 0, 0) };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uBox = uBox;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform vec4 uBox;\nvarying vec3 vWP;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vWP.x > uBox.x && vWP.x < uBox.z && vWP.z > uBox.y && vWP.z < uBox.w) discard;');
  };
  const m = new THREE.Mesh(g, mat); m.userData.uBox = uBox; m.receiveShadow = false; m.frustumCulled = false; m.name = 'mapaLejano';
  return m;
}

export class Chunks {
  constructor(scene, decorate) { this.scene = scene; this.map = new Map(); this.queue = []; this.decorate = decorate; this.cx = 1e9; this.cz = 1e9; }
  want(d) { return d <= 2 ? 50 : d <= 4 ? 16 : 6; }
  update(px, pz, far, budgetMs = 6) {
    const cx = Math.floor(px / CH), cz = Math.floor(pz / CH);
    if (cx !== this.cx || cz !== this.cz) {
      this.cx = cx; this.cz = cz;
      const R = 7; if (far) far.userData.uBox.value.set((cx - R) * CH + 5, (cz - R) * CH + 5, (cx + R + 1) * CH - 5, (cz + R + 1) * CH - 5);
      const need = new Map();
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const d = Math.max(Math.abs(i), Math.abs(j)); need.set((cx + i) + ',' + (cz + j), { x: cx + i, z: cz + j, res: this.want(d), d }); }
      for (const [k, c] of this.map) { const n = need.get(k); if (!n) { this.drop(k, c); } }
      this.queue = [];
      for (const [k, n] of need) { const c = this.map.get(k); if (!c || c.res !== n.res) this.queue.push({ k, ...n }); }
      this.queue.sort((a, b) => a.d - b.d);
    }
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < budgetMs) {
      const q = this.queue.shift(), old = this.map.get(q.k);
      const g = chunkGeo(q.x, q.z, q.res);
      const m = new THREE.Mesh(g, terrainMat); m.position.set(q.x * CH, 0, q.z * CH); m.receiveShadow = true; m.castShadow = q.res >= 50; m.matrixAutoUpdate = false; m.updateMatrix();
      this.scene.add(m);
      const c = { mesh: m, res: q.res, deco: null };
      if (old) { if (old.deco && q.res >= 50) { c.deco = old.deco; old.deco = null; } this.drop(q.k, old, true); }
      if (q.res >= 50 && !c.deco && this.decorate) c.deco = this.decorate(q.x, q.z);
      if (q.res < 50 && old && old.deco) {}
      this.map.set(q.k, c);
    }
    return this.queue.length;
  }
  drop(k, c, keep) {
    this.scene.remove(c.mesh); c.mesh.geometry.dispose();
    if (c.deco) { this.scene.remove(c.deco); c.deco.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    if (!keep) this.map.delete(k);
  }
  pending() { return this.queue.length; }
}

/* ---------- 8) Cintas de carretera, vía y ríos por pedazos ---------- */
function texCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const roadTex = { main: null, sec: null };
function roadMat(main) {
  const k = main ? 'main' : 'sec';
  if (!roadTex[k]) roadTex[k] = new THREE.MeshStandardMaterial({ roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, map: texCanvas(128, 256, (x, w, h) => {
    x.fillStyle = '#3b3c40'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { const v = 48 + Math.random() * 34; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    x.fillStyle = '#f2f2ee'; x.fillRect(3, 0, 4, h); x.fillRect(w - 7, 0, 4, h);
    if (main) { x.fillStyle = '#f5c518'; x.fillRect(w / 2 - 5, 0, 3, h); x.fillRect(w / 2 + 2, 0, 3, h); x.fillStyle = '#f2f2ee'; x.fillRect(w / 4 - 2, 0, 3, h * .45); x.fillRect(3 * w / 4 - 1, 0, 3, h * .45); }
    else { x.fillStyle = '#f5c518'; x.fillRect(w / 2 - 2, 0, 4, h * .5); }
  }) });
  return roadTex[k];
}
let railMat = null;
function getRailMat() {
  if (!railMat) railMat = new THREE.MeshStandardMaterial({ roughness: .8, metalness: .2, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, map: texCanvas(64, 64, (x, w, h) => {
    x.fillStyle = '#8a7a64'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { const v = 100 + Math.random() * 60; x.fillStyle = `rgb(${v},${v - 8},${v - 20})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    x.fillStyle = '#5a3c22'; x.fillRect(4, 8, w - 8, 14); x.fillRect(4, 40, w - 8, 14);
    x.fillStyle = '#d2d5da'; x.fillRect(14, 0, 4, h); x.fillRect(w - 18, 0, 4, h);
  }) });
  return railMat;
}
function ribbon(pts, ys, width, lift, vScale, ox, oz) {
  const n = pts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = []; let acc = 0;
  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz * width / 2, nz = dx * width / 2, y = ys[i] + lift;
    if (i) acc += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    pos.set([x + nx - ox, y, z + nz - oz, x - nx - ox, y, z - nz - oz], i * 6); uv.set([0, acc / vScale, 1, acc / vScale], i * 4);
    if (i < n - 1) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Cintas (carretera y vía) que pasan por un pedazo, subdividas cada 10 u para seguir el terreno
export function linesInChunk(cx, cz, group) {
  const ox = cx * CH, oz = cz * CH, M = 30;
  const take = (line, w, mat, lift, vs, kind) => {
    let run = null;
    const flush = () => { if (run && run.p.length > 1) { const m = new THREE.Mesh(ribbon(run.p, run.y, w, lift, vs, ox, oz), mat); m.receiveShadow = true; m.userData.kind = kind; group.add(m); } run = null; };
    for (let i = 0; i < line.pts.length - 1; i++) {
      const a = line.pts[i], b = line.pts[i + 1];
      const inside = p => p[0] >= ox - M && p[0] <= ox + CH + M && p[1] >= oz - M && p[1] <= oz + CH + M;
      if (!inside(a) && !inside(b)) { flush(); continue; }
      if (!run) run = { p: [], y: [] };
      const sub = 4;
      for (let s = run.p.length ? 1 : 0; s <= sub; s++) { const t = s / sub; run.p.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); run.y.push(line.ys[i] + (line.ys[i + 1] - line.ys[i]) * t); }
    }
    flush();
  };
  for (const r of LINES.roads) take(r, r.w, roadMat(r.main), .22, 30, 'road');
  for (const r of LINES.rails) take(r, 5.2, getRailMat(), .3, 5.2, 'rail');
}
const riverMat = new THREE.MeshStandardMaterial({ color: 0x3a8fb8, roughness: .1, metalness: .1, transparent: true, opacity: .88, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
export const RIVER_LINES = RIVERS.map(r => { const pts = densify(r.pts.map(([lo, la]) => toXZ(lo, la)), 60); return { name: r.name, pts, ys: pts.map(() => 0) }; });
export function riversInChunk(cx, cz, group) {
  const ox = cx * CH, oz = cz * CH;
  for (const r of RIVER_LINES) {
    const sel = []; for (let i = 0; i < r.pts.length; i++) { const p = r.pts[i]; if (p[0] > ox - 80 && p[0] < ox + CH + 80 && p[1] > oz - 80 && p[1] < oz + CH + 80) sel.push(i); }
    if (sel.length < 1) continue;
    const i0 = Math.max(0, sel[0] - 1), i1 = Math.min(r.pts.length - 1, sel[sel.length - 1] + 1), pts = [];
    for (let i = i0; i < i1; i++) for (let s = 0; s < 6; s++) { const t = s / 6, a = r.pts[i], b = r.pts[i + 1]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    pts.push(r.pts[i1]);
    const ys = pts.map(([x, z]) => Math.max(.1, Hc(Math.round(x / 50) * 50, Math.round(z / 50) * 50)) + .5);
    const m = new THREE.Mesh(ribbon(pts, ys, 22, 0, 60, ox, oz), riverMat); group.add(m);
  }
}

export function buildWater() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#8080ff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 4 + Math.random() * 14; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, 'rgba(160,150,255,.5)'); gr.addColorStop(1, 'rgba(110,110,255,0)'); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
  const nt = new THREE.CanvasTexture(cv); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(600, 600);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b84b8, roughness: .08, metalness: .15, transparent: true, opacity: .74, normalMap: nt, normalScale: new THREE.Vector2(.35, .35), depthWrite: false });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), mat); w.rotation.x = -Math.PI / 2; w.renderOrder = 1; w.name = 'agua'; w.frustumCulled = false;
  w.userData.follow = (px, pz, dt) => { const s = 100; w.position.set(Math.round(px / s) * s, 0, Math.round(pz / s) * s); nt.offset.set(w.position.x / 100 + (nt.userData.t = (nt.userData.t || 0) + dt * .004), -w.position.z / 100); };
  return w;
}
export { sdAt, H0 };
