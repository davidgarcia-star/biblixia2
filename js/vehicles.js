import * as THREE from 'three';
import { makeSportsCar, makeLuxSUV, makePickup } from './lujo.js';

/* =========================================================
   TRANSPORTES DE BIBLIXIA 2 (diseños propios, sin marcas)
   Todos miran hacia +z y tocan el suelo en y = 0.
   seats: [conductor, pasajero] · hide: el jugador va adentro (no se ve) · dim: [medio ancho, medio largo, centro] para los choques
   ========================================================= */
const M = {};
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, ...o });
function mats() {
  if (M.ok) return M; M.ok = true;
  Object.assign(M, {
    tire: std(0x161616, { roughness: .9 }), rim: std(0xcfd4da, { metalness: .9, roughness: .2 }), black: std(0x121214, { roughness: .45 }),
    chrome: std(0xe6e9ec, { metalness: 1, roughness: .12 }), glass: std(0x16222e, { metalness: .3, roughness: .05, transparent: true, opacity: .72 }),
    seat: std(0x2a2420, { roughness: .8 }), leather: std(0x7a4a28, { roughness: .7 }), white: std(0xf4f4f2, { roughness: .4 }),
    head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 2.5 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1010, emissiveIntensity: 2 }),
    metal: std(0x8a9098, { metalness: .7, roughness: .35 }), wood: std(0x7a5432, { roughness: .85 }), rope: std(0xc9b48a, { roughness: .9 }),
  });
  return M;
}
const paintCache = new Map();
const paint = c => { if (!paintCache.has(c)) paintCache.set(c, std(c, { metalness: .45, roughness: .3 })); return paintCache.get(c); };
const furCache = new Map();
const fur = c => { if (!furCache.has(c)) furCache.set(c, std(c, { roughness: .9 })); return furCache.get(c); };
function add(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
function wheel(g, x, y, z, r, w) {
  const wg = new THREE.Group(); wg.position.set(x, y, z); g.add(wg);
  add(wg, new THREE.CylinderGeometry(r, r, w, 18), M.tire, 0, 0, 0, 0, 0, Math.PI / 2);
  add(wg, new THREE.CylinderGeometry(r * .6, r * .6, w * 1.04, 12), M.rim, 0, 0, 0, 0, 0, Math.PI / 2);
  return wg;
}
function textTex(txt, bg, fg, w = 512, h = 96, font = '800 60px system-ui, sans-serif') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  const tw = x.measureText(txt).width; if (tw > w - 24) x.font = font.replace(/\d+px/, Math.floor(parseInt(font.match(/(\d+)px/)[1]) * (w - 24) / tw) + 'px');
  x.fillText(txt, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- Parámetros de manejo ---------- */
export const KINDS = {
  bici:      { name: 'la bicicleta', emoji: '🚲', max: 14, acc: 6, turn: 1.9, off: .8, cam: 6.5, ground: true, dim: [.32, .92, 0] },
  moto:      { name: 'el motor', emoji: '🏍️', max: 36, acc: 15, turn: 2.0, off: .55, cam: 7, ground: true, engine: true, dim: [.38, 1.1, .03] },
  carro:     { name: 'el carro', emoji: '🚗', max: 40, acc: 13, turn: 1.55, off: .5, cam: 9.5, ground: true, engine: true, hide: true, dim: [1.1, 2.45, .03] },
  jeepeta:   { name: 'la jeepeta', emoji: '🚙', max: 38, acc: 12, turn: 1.5, off: .8, cam: 10, ground: true, engine: true, hide: true, dim: [1.2, 2.57, 0] },
  camioneta: { name: 'la camioneta', emoji: '🛻', max: 36, acc: 11, turn: 1.45, off: .85, cam: 10.5, ground: true, engine: true, hide: true, dim: [1.2, 2.92, .03] },
  guagua:    { name: 'la guagua', emoji: '🚌', max: 31, acc: 8, turn: 1.1, off: .5, cam: 15, ground: true, engine: true, hide: true, dim: [1.28, 4.53, 0] },
  caballo:   { name: 'el caballo', emoji: '🐎', max: 23, acc: 10, turn: 2.2, off: 1, cam: 7.5, ground: true, animal: true, dim: [.4, 1.33, .17] },
  burro:     { name: 'el burro', emoji: '🫏', max: 12, acc: 6, turn: 2.0, off: 1, cam: 6.5, ground: true, animal: true, dim: [.45, .96, .12] },
  lancha:    { name: 'la lancha', emoji: '🚤', max: 34, acc: 11, turn: 1.3, cam: 11, water: true, engine: true, dim: [1.27, 3.1, .13] },
  avion:     { name: 'el avión', emoji: '✈️', max: 115, acc: 16, turn: .75, cam: 30, air: true, takeoff: 38, hide: true, engine: true, dim: [2.2, 9.2, -1] },
  heli:      { name: 'el helicóptero', emoji: '🚁', max: 62, acc: 20, turn: 1.6, cam: 20, air: true, heli: true, hide: true, engine: true, dim: [1.6, 4.9, -2] },
  tren:      { name: 'el tren', emoji: '🚆', max: 46, acc: 6, turn: 0, cam: 26, rail: true, hide: true, engine: true, dim: [1.7, 5.5, 0] },
};

/* ---------- Modelos ---------- */
export function makeVehicle(kind, color) {
  mats();
  const g = new THREE.Group(), u = { kind, wheels: [], legs: [], spin: [], seats: [[0, .5, 0], [0, .5, -.8]] };
  g.userData = u;
  if (kind === 'bici') {
    const c = paint(color ?? 0x2a7ad8);
    u.wheels.push(wheel(g, 0, .36, .55, .36, .05), wheel(g, 0, .36, -.55, .36, .05));
    add(g, new THREE.CylinderGeometry(.03, .03, 1.0), c, 0, .62, 0, Math.PI / 2 - .25);
    add(g, new THREE.CylinderGeometry(.03, .03, .6), c, 0, .55, -.25, .35);
    add(g, new THREE.CylinderGeometry(.03, .03, .55), c, 0, .62, .48, -.3);
    add(g, new THREE.BoxGeometry(.22, .06, .3), M.seat, 0, .92, -.28);
    add(g, new THREE.CylinderGeometry(.02, .02, .6), M.black, 0, .95, .5, 0, 0, Math.PI / 2);
    add(g, new THREE.BoxGeometry(.3, .03, .4), M.metal, 0, .78, -.68); // parrilla atrás
    u.seats = [[0, .42, -.25], [0, .32, -.7]];
  } else if (kind === 'moto') {
    const c = paint(color ?? 0xc81e1e);
    u.wheels.push(wheel(g, 0, .34, .78, .34, .14), wheel(g, 0, .34, -.72, .34, .16));
    add(g, new THREE.BoxGeometry(.32, .3, .9), c, 0, .62, .1);
    add(g, new THREE.BoxGeometry(.34, .14, .95), M.seat, 0, .82, -.35);
    add(g, new THREE.BoxGeometry(.26, .24, .4), M.metal, 0, .45, .05);
    add(g, new THREE.CylinderGeometry(.03, .03, .7), M.chrome, 0, .72, .62, -.4);
    add(g, new THREE.CylinderGeometry(.025, .025, .7), M.black, 0, 1.02, .52, 0, 0, Math.PI / 2);
    add(g, new THREE.BoxGeometry(.18, .12, .06), M.head, 0, .86, .78);
    add(g, new THREE.CylinderGeometry(.05, .05, .7), M.chrome, .2, .4, -.4, Math.PI / 2);
    add(g, new THREE.BoxGeometry(.18, .06, .05), M.tail, 0, .8, -.85);
    u.seats = [[0, .36, -.2], [0, .38, -.62]];
  } else if (kind === 'carro' || kind === 'jeepeta' || kind === 'camioneta') {
    // modelos modernos con pintura brillante (diseños propios, sin marcas)
    const inner = kind === 'carro' ? makeSportsCar(color ?? 0xf4f5f7) : kind === 'jeepeta' ? makeLuxSUV(color ?? 0x14161a) : makePickup(color ?? 0xf4f5f7);
    g.add(inner); u.wheels = inner.userData.wheels.slice();
    u.seats = kind === 'carro' ? [[-.36, .28, -.25], [.36, .28, -.25]] : kind === 'jeepeta' ? [[-.42, .5, .05], [.42, .5, .05]] : [[-.42, .55, .35], [.42, .55, .35]];
  } else if (kind === 'guagua') {
    const c = paint(color ?? 0xf0b81c), L = 9, W = 2.5;
    for (const [x, z] of [[-1.1, 2.9], [1.1, 2.9], [-1.1, -2.6], [1.1, -2.6]]) u.wheels.push(wheel(g, x, .5, z, .5, .34));
    add(g, new THREE.BoxGeometry(W, 2.4, L), c, 0, 1.75, 0);
    add(g, new THREE.BoxGeometry(W + .02, .8, L - 1.2), M.glass, 0, 2.3, -.3);
    add(g, new THREE.BoxGeometry(W - .2, 1.1, .05), M.glass, 0, 2.2, L / 2 + .01);
    add(g, new THREE.BoxGeometry(W + .03, .25, L + .02), paint(0x1f4fa8), 0, 1.2, 0);
    add(g, new THREE.BoxGeometry(W + .03, .12, L + .02), paint(0xc8202a), 0, 1.0, 0);
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(.35, .2, .05), M.head, s * .85, 1.0, L / 2 + .02);
    const sign = add(g, new THREE.PlaneGeometry(2.2, .35), new THREE.MeshBasicMaterial({ map: textTex('BIBLIXIA', '#111', '#ffd34d') }), 0, 2.85, L / 2 + .03);
    sign.castShadow = false;
    u.seats = [[-.7, 1.0, 3.6], [.6, 1.0, 1.5]];
  } else if (kind === 'caballo' || kind === 'burro') {
    const B = kind === 'burro', k = B ? .72 : 1, c = fur(color ?? (B ? 0x8a8278 : 0x6a3c1e)), dark = fur(B ? 0x4a4440 : 0x2a1a10);
    const body = add(g, new THREE.SphereGeometry(.5 * k, 14, 10), c, 0, 1.25 * k, 0); body.scale.set(.75, .78, 1.7);
    const neck = new THREE.Group(); neck.position.set(0, 1.45 * k, .72 * k); g.add(neck); u.neck = neck;
    add(neck, new THREE.CylinderGeometry(.16 * k, .24 * k, .8 * k, 10), c, 0, .3 * k, .15 * k, .6);
    const head = add(neck, new THREE.BoxGeometry(.24 * k, .26 * k, .6 * k), c, 0, .62 * k, .45 * k, .5);
    for (const s of [-1, 1]) add(neck, new THREE.ConeGeometry(.05 * k, (B ? .4 : .18) * k, 6), c, s * .08 * k, (B ? .95 : .85) * k, .32 * k, -.2, 0, s * .15);
    if (!B) add(neck, new THREE.BoxGeometry(.05, .5, .55), dark, 0, .5, .05, .6); // crin
    add(g, new THREE.CylinderGeometry(.04 * k, .08 * k, .7 * k, 6), dark, 0, 1.1 * k, -.92 * k, -.5);
    for (const [x, z] of [[-.2, .55], [.2, .55], [-.2, -.6], [.2, -.6]]) {
      const hip = new THREE.Group(); hip.position.set(x * k, 1.05 * k, z * k); g.add(hip);
      add(hip, new THREE.CylinderGeometry(.08 * k, .06 * k, .55 * k, 8), c, 0, -.27 * k, 0);
      const knee = new THREE.Group(); knee.position.set(0, -.52 * k, 0); hip.add(knee);
      add(knee, new THREE.CylinderGeometry(.055 * k, .045 * k, .48 * k, 8), c, 0, -.24 * k, 0);
      add(knee, new THREE.CylinderGeometry(.065 * k, .07 * k, .06 * k, 8), dark, 0, -.5 * k, 0);
      u.legs.push({ hip, knee, ph: (x < 0 ? 0 : Math.PI) + (z < 0 ? Math.PI / 2 : 0) });
    }
    add(g, new THREE.BoxGeometry(.62 * k, .12 * k, .7 * k), M.leather, 0, 1.62 * k, .05 * k);
    if (!B) { add(g, new THREE.BoxGeometry(.66, .1, .5), fur(0xb02a2a), 0, 1.6, .05); }
    else { for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(.18, .4, .45), M.rope, s * .42, 1.2 * k, -.15); } // árganas del burro
    u.seats = [[0, 1.22 * k, .05 * k], [0, 1.18 * k, -.55 * k]];
    u.straddle = true;
  } else if (kind === 'lancha') {
    const c = paint(color ?? 0xf4f4f2);
    const sh = new THREE.Shape(); sh.moveTo(-1.1, -2.6); sh.lineTo(1.1, -2.6); sh.lineTo(1.15, 1.2); sh.quadraticCurveTo(.9, 2.6, 0, 3.1); sh.quadraticCurveTo(-.9, 2.6, -1.15, 1.2); sh.closePath();
    const hull = new THREE.ExtrudeGeometry(sh, { depth: .8, bevelEnabled: true, bevelSize: .12, bevelThickness: .12, bevelSegments: 2 }); hull.rotateX(Math.PI / 2); hull.translate(0, .8, 0);
    add(g, hull, c, 0, -.15, 0);
    add(g, new THREE.BoxGeometry(2.3, .12, 5.3), paint(0x1f6fd1), 0, .2, .2);
    add(g, new THREE.BoxGeometry(1.6, .5, .1), M.glass, 0, 1.05, .8, -.4);
    for (const z of [.1, -1.2]) add(g, new THREE.BoxGeometry(1.7, .35, .6), M.white, 0, .82, z);
    const mot = add(g, new THREE.BoxGeometry(.45, .9, .45), M.black, 0, .75, -2.75); u.motor = mot;
    u.seats = [[-.4, .5, .1], [.4, .5, -1.2]];
  } else if (kind === 'avion') {
    const c = paint(color ?? 0xf4f6f8), blue = paint(0x1f4fa8), red = paint(0xc8202a);
    const fus = add(g, new THREE.CylinderGeometry(1.15, 1.15, 13, 20), c, 0, 2.4, 0, Math.PI / 2);
    add(g, new THREE.SphereGeometry(1.15, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 2.4, 6.5, Math.PI / 2).scale.set(1, 1.5, 1);
    add(g, new THREE.ConeGeometry(1.15, 3.6, 20), c, 0, 2.7, -8.3, -Math.PI / 2).scale.set(1, 1, .8);
    add(g, new THREE.BoxGeometry(16, .22, 2.6), c, 0, 2.0, .6, 0, 0, 0);
    for (const s of [-1, 1]) { add(g, new THREE.CylinderGeometry(.48, .42, 2.2, 14), M.metal, s * 3.4, 1.55, 1.3, Math.PI / 2); add(g, new THREE.BoxGeometry(.25, .6, 2.6), blue, s * 7.9, 2.3, .6); }
    add(g, new THREE.BoxGeometry(5.6, .16, 1.5), c, 0, 2.9, -8.6);
    add(g, new THREE.BoxGeometry(.2, 2.7, 2.0), blue, 0, 4.1, -8.8, -.3);
    add(g, new THREE.BoxGeometry(.21, .8, 1.2), red, 0, 4.6, -9.1, -.3);
    add(g, new THREE.BoxGeometry(2.32, .3, 12.2), blue, 0, 2.0, -.2);
    add(g, new THREE.BoxGeometry(2.33, .1, 12.2), red, 0, 1.78, -.2);
    const win = add(g, new THREE.BoxGeometry(2.34, .32, 10), new THREE.MeshStandardMaterial({ map: (() => { const t = textTex('▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪', '#f4f6f8', '#1a2430', 1024, 64, '700 48px monospace'); return t; })() }), 0, 2.75, .3); win.castShadow = false;
    for (const s of [-1, 1]) { const lab = add(g, new THREE.PlaneGeometry(4.4, .6), new THREE.MeshBasicMaterial({ map: textTex('BIBLIXIA AIR', '#f4f6f8', '#1f4fa8') }), s * 1.17, 3.2, -2.6, 0, s * Math.PI / 2); lab.castShadow = false; }
    add(g, new THREE.BoxGeometry(1.4, .4, .1), M.glass, 0, 3.1, 7.05, -.6);
    for (const [x, z] of [[0, 5.2], [-1.6, 0], [1.6, 0]]) { add(g, new THREE.CylinderGeometry(.07, .07, 1.2), M.metal, x, .9, z); u.wheels.push(wheel(g, x, .35, z, .35, .3)); }
    u.prop = []; for (const s of [-1, 1]) { const pr = new THREE.Group(); pr.position.set(s * 3.4, 1.55, 2.45); g.add(pr); add(pr, new THREE.BoxGeometry(.12, 1.7, .05), M.black); add(pr, new THREE.BoxGeometry(1.7, .12, .05), M.black); u.prop.push(pr); }
    u.seats = [[-.4, 1.9, 5.4], [.4, 1.9, 3.5]];
  } else if (kind === 'heli') {
    const c = paint(color ?? 0xc8202a);
    const b = add(g, new THREE.SphereGeometry(1.35, 18, 14), c, 0, 1.85, .3); b.scale.set(1, .92, 1.5);
    add(g, new THREE.SphereGeometry(1.2, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2.2), M.glass, 0, 1.95, 1.1, Math.PI / 2.4).scale.set(1, 1, .9);
    add(g, new THREE.CylinderGeometry(.22, .14, 5.6, 10), c, 0, 2.15, -3.6, Math.PI / 2 - .08);
    add(g, new THREE.BoxGeometry(.12, 1.3, .9), c, 0, 2.7, -6.2);
    for (const s of [-1, 1]) { add(g, new THREE.CylinderGeometry(.06, .06, 3.6), M.metal, s * .95, .15, .2, Math.PI / 2); for (const z of [-.8, 1.1]) add(g, new THREE.CylinderGeometry(.05, .05, .8), M.metal, s * .8, .5, z, 0, 0, s * .35); }
    add(g, new THREE.CylinderGeometry(.12, .12, .5), M.metal, 0, 3.4, .2);
    const rot = new THREE.Group(); rot.position.set(0, 3.65, .2); g.add(rot); u.rotor = rot;
    for (let i = 0; i < 4; i++) add(rot, new THREE.BoxGeometry(.32, .05, 5.4), M.black, 0, 0, 0, 0, i * Math.PI / 2);
    const tr = new THREE.Group(); tr.position.set(.18, 2.7, -6.3); g.add(tr); u.tailRotor = tr;
    for (let i = 0; i < 2; i++) add(tr, new THREE.BoxGeometry(.04, 1.3, .14), M.black, 0, 0, 0, i * Math.PI / 2);
    u.seats = [[-.45, 1.1, .9], [.45, 1.1, .9]];
  } else if (kind === 'tren') {
    // locomotora + 2 vagones (cada parte se mueve sobre la vía por separado)
    const c = paint(color ?? 0x1f6fd1), cars = [];
    for (let n = 0; n < 3; n++) {
      const cg = new THREE.Group(); g.add(cg); cars.push(cg);
      const L = 11;
      add(cg, new THREE.BoxGeometry(3, 3.1, L), n ? M.white : c, 0, 2.2, 0);
      add(cg, new THREE.BoxGeometry(3.04, .9, L - 1.2), M.glass, 0, 2.7, 0);
      add(cg, new THREE.BoxGeometry(3.05, .3, L + .02), c, 0, 1.5, 0);
      add(cg, new THREE.BoxGeometry(2.6, .5, L - 1), M.black, 0, .5, 0);
      for (const z of [-3.6, 3.6]) for (const x of [-.8, .8]) u.wheels.push(wheel(cg, x, .45, z, .45, .2));
      if (!n) { add(cg, new THREE.BoxGeometry(2.6, 1.4, .1), M.glass, 0, 2.8, L / 2 + .02); for (const s of [-1, 1]) add(cg, new THREE.BoxGeometry(.4, .25, .06), M.head, s * 1.0, 1.3, L / 2 + .03); const lab = add(cg, new THREE.PlaneGeometry(5, .7), new THREE.MeshBasicMaterial({ map: textTex('TREN BIBLIXIA', '#f4f4f2', '#1f4fa8') }), 1.53, 3.4, -.5, 0, Math.PI / 2); lab.castShadow = false; }
    }
    u.cars = cars; u.carLen = 11.6;
    u.seats = [[0, 1.4, 4], [0, 1.4, -1]];
  }
  g.traverse(o => { if (o.isMesh) o.frustumCulled = true; });
  return g;
}

/* ---------- Animación de ruedas, patas, hélices ---------- */
export function animateVehicle(v, dt, speed, t) {
  const u = v.userData;
  for (const w of u.wheels) w.rotation.x += speed * dt / .4;
  if (u.legs.length) {
    const s = Math.abs(speed), f = s > .3 ? 2.2 + s * .35 : 0;
    u.gait = (u.gait || 0) + dt * f;
    for (const L of u.legs) {
      const a = s > .3 ? Math.sin(u.gait + L.ph) * Math.min(.7, .25 + s * .03) : 0;
      L.hip.rotation.x = THREE.MathUtils.lerp(L.hip.rotation.x, a, Math.min(1, dt * 12));
      L.knee.rotation.x = THREE.MathUtils.lerp(L.knee.rotation.x, s > .3 ? Math.max(0, -Math.sin(u.gait + L.ph + .8)) * .9 : 0, Math.min(1, dt * 12));
    }
    if (u.neck) u.neck.rotation.x = Math.sin(u.gait * 2) * .05 * Math.min(1, s / 5) + (s < .3 ? Math.sin(t * .7) * .06 : 0);
  }
  if (u.prop) for (const p of u.prop) p.rotation.z += dt * (8 + Math.abs(speed) * .8);
  if (u.rotor) { u.rotSpd = THREE.MathUtils.lerp(u.rotSpd || 0, u.engineOn ? 22 : 0, dt * .8); u.rotor.rotation.y += dt * u.rotSpd; u.tailRotor.rotation.x += dt * u.rotSpd * 1.6; }
}

/* ---------- Tráfico decorativo: carros que van y vienen por las carreteras ---------- */
export const TRAFFIC_COLORS = [0xf2f2f0, 0x1a1a1e, 0xc0392b, 0x2a4a9a, 0x8a9098, 0x2e7d4f, 0xe0a31a, 0x6a2a8a];
