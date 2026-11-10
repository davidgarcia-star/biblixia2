import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createHuman, bakeStatic } from './human.js';
import { makeVehicle, animateVehicle } from './vehicles.js';
import { heightAt } from './terrain.js';

/* =========================================================
   VIDA EN LOS PUEBLOS
   - El platanero: camioneta con plátanos y bocina («¡Llegó el platanero, aprovecha la oferta!»).
     Cuando se detiene, la gente se agrupa alrededor.
   - Grupos de personas conversando en los parques.
   - Calles en anillo alrededor de cada plaza para el tráfico de la ciudad.
   ========================================================= */
const SKINS = [0xf1cbb0, 0xe8b896, 0xc68e6a, 0xa8714f, 0x8a5636, 0x5e3a24, 0xb57c57];
const CLOTH = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a, 0x2e7d4f, 0x2a4a9a, 0xe87aa0, 0xf2f0e8, 0x1a9ab0, 0xf5c518, 0x6a2a8a];
const PANTS = [0x2b3a57, 0x22243a, 0x1a1a1e, 0x6a4a2a, 0x8a2a3a, 0xe8dcc0, 0x5a6a3a];
function randomPerson(i) {
  const f = i % 2 === 1, r = k => [SKINS, CLOTH, PANTS][k][(i * [7, 5, 3][k] + k) % [SKINS, CLOTH, PANTS][k].length];
  const h = createHuman({ detail: .38, gender: f ? 'f' : 'm', skin: r(0), top: r(1), pants: r(2), skirt: r(2), legwear: f && i % 4 === 1 ? 'falda' : 'pantalon', topStyle: ['camiseta', 'camisa', 'mangalarga'][i % 3], hair: f ? (i % 3 ? 'long' : 'ponytail') : 'short', hairColor: [0x1d130c, 0x3a2314, 0x2a1a10][i % 3], shoes: [0xf2f2f0, 0x1a1a1a, 0x6a4528][i % 3] });
  // brazos un poco distintos para que no se vean todos iguales
  h.arms[0].shoulder.rotation.set(-.1 - (i % 3) * .2, 0, -.08); h.arms[1].shoulder.rotation.set(i % 2 ? -.6 : .05, 0, .08); h.arms[1].elbow.rotation.x = i % 2 ? -1.2 : -.2;
  return bakeStatic(h.root);
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

/* ---------- La camioneta del platanero ---------- */
let bananaGeo = null;
function bananas() {
  if (!bananaGeo) {
    const parts = [], rnd = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    for (let i = 0; i < 70; i++) {
      const g = new THREE.TorusGeometry(.2, .045, 5, 8, 1.5); g.rotateZ(rnd() * 6.28); g.rotateY(rnd() * 6.28);
      g.translate((rnd() - .5) * 1.6, rnd() * .5, (rnd() - .5) * 1.9); parts.push(g.toNonIndexed());
    }
    bananaGeo = mergeGeometries(parts);
  }
  return bananaGeo;
}
const greenM = new THREE.MeshStandardMaterial({ color: 0x8fb03a, roughness: .6 }), yellowM = new THREE.MeshStandardMaterial({ color: 0xf2cf3a, roughness: .55 });
export function makePlatanero() {
  const v = makeVehicle('camioneta', 0x2e7d4f);
  const b1 = new THREE.Mesh(bananas(), greenM); b1.position.set(0, 1.05, -1.45); b1.castShadow = true; v.add(b1);
  const b2 = new THREE.Mesh(bananas(), yellowM); b2.position.set(.1, 1.25, -1.5); b2.scale.set(.8, .8, .7); b2.rotation.y = 1.3; b2.castShadow = true; v.add(b2);
  // bocina en el techo
  const horn = new THREE.Mesh(new THREE.ConeGeometry(.22, .5, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: .6, roughness: .3, side: THREE.DoubleSide }));
  horn.rotation.x = -Math.PI / 2; horn.position.set(0, 2.25, .5); v.add(horn);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .3), horn.material); post.position.set(0, 2.05, .5); v.add(post);
  // letreros a los lados
  const t = canvasTex(1024, 256, (x, w, h) => { x.fillStyle = '#f5c518'; x.fillRect(0, 0, w, h); x.fillStyle = '#2e7d4f'; x.fillRect(0, 0, w, 26); x.fillRect(0, h - 26, w, 26); x.fillStyle = '#1a3a12'; x.textAlign = 'center'; x.font = '900 92px system-ui, sans-serif'; x.fillText('🍌 ¡LLEGÓ EL PLATANERO!', w / 2, 128); x.font = '800 52px system-ui, sans-serif'; x.fillText('¡Aprovecha la oferta!', w / 2, 200); });
  const sm = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), sm); p.position.set(s * 1.1, 1.55, -1.45); p.rotation.y = s * Math.PI / 2; v.add(p); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .5), sm); back.position.set(0, 1.5, -2.82); back.rotation.y = Math.PI; v.add(back);
  return v;
}

/* ---------- Calles en anillo para el tráfico de la ciudad ---------- */
export const CITY_LOOPS = [];
function loops(town) {
  const p = town.p, big = p.big || 0; if (!big) return;
  const cx = p.px, cz = p.pz, fy = town.fy, maxK = [0, 6, 9, 12][big];
  for (let k = 2; k <= maxK; k += 2) {
    const h = (k + .5) * 34, corners = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]];
    const pts = [], ys = [];
    for (let c = 0; c < 4; c++) { const [ax, az] = corners[c], [bx, bz] = corners[c + 1]; for (let s = 0; s < 12; s++) { const t = s / 12; pts.push([cx + ax + (bx - ax) * t, cz + az + (bz - az) * t]); ys.push(fy + .06); } }
    pts.push([cx + corners[0][0], cz + corners[0][1]]); ys.push(fy + .06);
    if (pts.some(([x, z]) => Math.abs(heightAt(x, z) - fy) > 1.5)) continue;
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    CITY_LOOPS.push({ town, pts, ys, cum, w: 8, loop: true });
  }
}

/* ---------- Estado ---------- */
const PLAT = [], crowdA = [], crowdB = [];
let scene = null, buildQ = [], TW = [];
export function initGente(sc, towns) {
  scene = sc; TW = towns;
  for (const t of towns) loops(t);
  for (const t of towns) {
    const n = t.p.id === 'dn' || t.p.id === 'sdo' ? 2 : t.p.big ? 1 : (t.p.id.length % 2 ? 1 : 0);
    for (let i = 0; i < n; i++) PLAT.push({ town: t, s: i * 400, r: (i ? 4.5 : 2.5) * 34, stop: 20 + i * 15, wait: 0, obj: null, sayT: 0 });
  }
  for (let i = 0; i < 20; i++) buildQ.push(i);
}
const PHRASES = ['¡Llegó el platanero! ¡Aprovecha la oferta!', '¡Plátanos verdes, plátanos maduros y guineítos! ¡Llegó el platanero!', '¡Aprovecha la oferta, que llegó el platanero! ¡A la orden!', '¡Mire, mire, llegó el platanero! ¡Plátanos frescos del campo!'];
function crowdAround(pool, x, z, y, r0, n, look) {
  pool.forEach((m, i) => {
    if (i >= n) { m.visible = false; return; }
    const a = i / n * Math.PI * 2 + (i % 3) * .2, r = r0 + (i % 3) * 1.1, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    m.visible = true; m.position.set(px, y ?? heightAt(px, pz), pz); m.rotation.y = Math.atan2((look ? look[0] : x) - px, (look ? look[1] : z) - pz);
  });
}
let chatT = 0, roosterT = 8, bellT = 20, plazaTown = null, plazaT = 0;
export function updateGente(dt, P, t, sound, canSpeak, groundY) {
  // construir de a poco las personas (no congela la pantalla)
  if (buildQ.length) { const i = buildQ.shift(); const m = randomPerson(i); m.visible = false; scene.add(m); (i < 10 ? crowdA : crowdB).push(m); }
  // plataneros
  let near = null, nd = 1e9;
  for (const q of PLAT) {
    const d = Math.hypot(q.town.p.px - P.x, q.town.p.pz - P.z);
    if (d > 1600) { if (q.obj) { scene.remove(q.obj); q.obj = null; } continue; }
    if (!q.obj) { q.obj = makePlatanero(); scene.add(q.obj); }
    const L = q.r * 8;
    if (q.wait > 0) q.wait -= dt; else { q.s = (q.s + 4 * dt) % L; if ((q.stop -= dt) <= 0) { q.stop = 35 + Math.random() * 25; q.wait = 28; } }
    const side = Math.floor(q.s / (q.r * 2)), f = (q.s % (q.r * 2)) / (q.r * 2) * 2 - 1, h = q.r, cx = q.town.p.px, cz = q.town.p.pz;
    const [x, z, yaw] = side === 0 ? [cx + f * h, cz - h, Math.PI / 2] : side === 1 ? [cx + h, cz + f * h, 0] : side === 2 ? [cx - f * h, cz + h, -Math.PI / 2] : [cx - h, cz - f * h, Math.PI];
    q.obj.position.set(x + Math.cos(yaw) * 2.2, q.town.fy + .06, z - Math.sin(yaw) * 2.2); q.obj.rotation.set(0, yaw, 0);
    animateVehicle(q.obj, dt, q.wait > 0 ? 0 : 4, t);
    const dp = Math.hypot(q.obj.position.x - P.x, q.obj.position.z - P.z);
    if (dp < nd) { nd = dp; near = q; }
    // anuncio por la bocina
    q.sayT -= dt;
    if (dp < 150 && q.sayT <= 0) {
      q.sayT = 16 + Math.random() * 8;
      const vol = Math.max(.25, 1 - dp / 150);
      sound.note(784, .18, { type: 'square', vol: .05 * vol, filter: 2200 }); sound.note(988, .18, { type: 'square', vol: .05 * vol, when: .2, filter: 2200 }); sound.note(1175, .3, { type: 'square', vol: .05 * vol, when: .4, filter: 2200 });
      if (canSpeak()) setTimeout(() => sound.say(PHRASES[Math.floor(Math.random() * PHRASES.length)], { male: true, rate: 1.05, pitch: .8 }), 700);
      q.lastSay = t;
    }
  }
  // gente agrupada alrededor del platanero detenido
  if (near && nd < 220 && near.wait > 0) { const o = near.obj.position; crowdAround(crowdA, o.x - Math.cos(near.obj.rotation.y) * 4.2, o.z + Math.sin(near.obj.rotation.y) * 4.2, near.town.fy + .06, 2.4, crowdA.length, [o.x, o.z]); }
  else crowdA.forEach(m => m.visible = false);
  // grupos en el parque del pueblo más cercano
  if ((plazaT -= dt) <= 0) {
    plazaT = 1; plazaTown = null;
    for (const q of TW) { if (Math.hypot(q.p.px - P.x, q.p.pz - P.z) < 700) { plazaTown = q; break; } }
  }
  if (plazaTown) {
    const c = plazaTown, half = Math.ceil(crowdB.length / 2);
    crowdAround(crowdB.slice(0, half), c.p.px + 18, c.p.pz + 14, c.fy + .36, 1.4, half);
    crowdAround(crowdB.slice(half), c.p.px - 16, c.p.pz - 12, c.fy + .36, 1.5, crowdB.length - half);
    const d = Math.hypot(c.p.px - P.x, c.p.pz - P.z);
    if (d < 120 && (chatT -= dt) <= 0) { chatT = .8 + Math.random() * 1.6; sound.chatter(Math.max(.1, .7 - d / 180), (Math.random() - .5) * 1.4, Math.random() < .5); }
  } else crowdB.forEach(m => m.visible = false);
  // gallos y campanas de la iglesia en los pueblos
  if (plazaTown) {
    if ((roosterT -= dt) <= 0) { roosterT = 18 + Math.random() * 25; sound.animal('gallo', .35, (Math.random() - .5) * 1.6); }
    if ((bellT -= dt) <= 0) { bellT = 45 + Math.random() * 40; const d = Math.hypot(plazaTown.p.px - P.x, plazaTown.p.pz - 62 - P.z); if (d < 500) for (let i = 0; i < 4; i++) sound.note(392, 1.6, { type: 'sine', vol: .08 * (1 - d / 500), when: i * 1.1 }); }
  }
}
export { PLAT };
