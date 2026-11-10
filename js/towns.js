import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROVINCES, PROV, AIRPORTS, PORTS, PLACES, TOLLS, toXZ } from './rd-data.js';
import { heightAt, H0, Hfull, nearRoad, LINES, linePos, CH, fbm, rand2, typeAt, sdAt } from './terrain.js';

/* =========================================================
   PUEBLOS, LUGARES FAMOSOS, AEROPUERTOS, ESTACIONES, BOMBAS Y PEAJES
   ========================================================= */
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
const MT = {
  white: std(0xf2efe8), cream: std(0xe9dcc0), stone: std(0xb9ad96, { roughness: .9 }), dark: std(0x2a2c30), glass: std(0x2a4258, { metalness: .4, roughness: .1 }),
  red: std(0xc8202a), blue: std(0x1f4fa8), gold: std(0xffc93c, { metalness: .9, roughness: .25 }), grass: std(0x4f8f3a, { roughness: 1 }), path: std(0xd8ccb0, { roughness: 1 }),
  wood: std(0x7a5432), metal: std(0x9aa0a8, { metalness: .7, roughness: .3 }), concrete: std(0xcfcac0, { roughness: .95 }), water: std(0x3aa0d0, { roughness: .05, transparent: true, opacity: .85 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe0a0, emissiveIntensity: 1.5 }), sand: std(0xe6d6a8, { roughness: 1 }), rock: std(0x7e7466, { roughness: 1 }),
  zinc: std(0x9aa3aa, { metalness: .6, roughness: .45 }), green: std(0x2e7d4f),
};
export const NIGHT_MATS = [MT.lamp];
const add = (g, geo, m, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
const box = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }


/* ---------- Unir piezas fijas por material (menos llamadas de dibujo) ---------- */
export const DETAIL = []; // objetos que se ocultan de lejos: { obj, x, z, d }
export function bakeGroup(g, maxD = 6000) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), rm = [];
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    let k = o; while (k && k !== g) { if (k.userData.keep) return; k = k.parent; }
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const a of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(a)) geo.deleteAttribute(a);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(geo); rm.push(o);
  });
  for (const o of rm) o.parent.remove(o);
  for (const [mat, list] of by) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  if (maxD) DETAIL.push({ obj: g, x: g.position.x, z: g.position.z, d: maxD });
  return g;
}

/* ---------- Letreros ---------- */
export function label(text, sub = '', { color = '#ffd34d', bg = 'rgba(10,22,48,.82)', scale = 1, fixed = false } = {}) {
  const t = canvasTex(768, 192, (x, w, h) => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(12, 12, w - 24, h - 24, 40); x.fill();
    x.strokeStyle = color; x.lineWidth = 5; x.stroke();
    x.textAlign = 'center'; x.fillStyle = color; x.font = '800 40px system-ui, sans-serif'; if (sub) x.fillText(sub.toUpperCase(), w / 2, 70);
    x.fillStyle = '#fff'; x.font = '900 64px system-ui, sans-serif'; const tw = x.measureText(text).width; if (tw > w - 70) x.font = `900 ${Math.floor(64 * (w - 70) / tw)}px system-ui, sans-serif`;
    x.fillText(text, w / 2, sub ? 146 : 118);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, sizeAttenuation: !fixed, fog: !fixed }));
  if (fixed) s.scale.set(.2 * scale, .05 * scale, 1); else s.scale.set(24 * scale, 6 * scale, 1);
  s.renderOrder = 5;
  return s;
}
function panel(text, sub, w = 16, h = 4, bg = '#0b2a6a', fg = '#ffffff') {
  // el texto se ajusta al ancho y se ve bien por los dos lados (no al revés)
  const t = canvasTex(1024, 256, (x, W, H) => {
    x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(10, 10, W - 20, H - 20); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = fg;
    const fit = (txt, size, weight, y) => { x.font = `${weight} ${size}px system-ui, sans-serif`; const tw = x.measureText(txt).width; if (tw > W - 70) x.font = `${weight} ${Math.floor(size * (W - 70) / tw)}px system-ui, sans-serif`; x.fillText(txt, W / 2, y); };
    if (sub) fit(sub, 50, 700, 80);
    fit(text, 92, 900, sub ? 190 : 160);
  });
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: .6 });
  const g = new THREE.Group(), geo = new THREE.PlaneGeometry(w, h);
  const a = new THREE.Mesh(geo, m), b = new THREE.Mesh(geo, m); b.rotation.y = Math.PI; b.position.z = -.02;
  g.add(a, b); return g;
}
/* ---------- Fachadas (ventanas que se encienden de noche) ---------- */
const facade = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = '#3a4a5a'; x.fillRect(18 + i * 60, 22 + j * 60, 36, 40); x.fillStyle = '#ffffff'; x.fillRect(16 + i * 60, 64 + j * 60, 40, 4); } });
const facadeEm = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { if (Math.random() < .55) { x.fillStyle = '#ffcf80'; x.fillRect(18 + i * 60, 22 + j * 60, 36, 40); } } });
export const facadeMat = new THREE.MeshStandardMaterial({ map: facade, emissiveMap: facadeEm, emissive: 0xffffff, emissiveIntensity: 0, roughness: .8 });
const roofMat = new THREE.MeshStandardMaterial({ roughness: .7 });
const PASTEL = [0xf6d7a7, 0xa7d8f6, 0xf6a7c1, 0xb8f0b0, 0xfff1a8, 0xf2f2ee, 0xd4b8f0, 0xffc49a, 0x9ae6d8, 0xf0c0a0, 0xe8e8e0, 0xc8dce8];
const ROOFS = [0x8a3a2a, 0x9aa3aa, 0x5a6a7a, 0xb04a32, 0x6a7078, 0x2a6a8a];


/* ---------- Superficies para pisar (plazas, andenes, pistas, muelles) ---------- */
export const PADS = []; const padGrid = new Map(), PC = 500, pk = (i, j) => i * 100003 + j;
export function pad(x, z, hw, hd, yaw, y) {
  const p = { x, z, hw, hd, c: Math.cos(yaw), s: Math.sin(yaw), y }, r = Math.hypot(hw, hd);
  for (let i = Math.floor((x - r) / PC); i <= Math.floor((x + r) / PC); i++) for (let j = Math.floor((z - r) / PC); j <= Math.floor((z + r) / PC); j++) { const k = pk(i, j); if (!padGrid.has(k)) padGrid.set(k, []); padGrid.get(k).push(p); }
  PADS.push(p); return p;
}
export function padAt(x, z) {
  const l = padGrid.get(pk(Math.floor(x / PC), Math.floor(z / PC))); if (!l) return -1e9;
  let y = -1e9;
  for (const p of l) { const dx = x - p.x, dz = z - p.z, lx = dx * p.c - dz * p.s, lz = dx * p.s + dz * p.c; if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd && p.y > y) y = p.y; }
  return y;
}
/* ---------- Fachadas modernas ---------- */
function facadeCanvas(kind) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    if (kind === 'house') { // casa: puerta, ventanas con persianas y zócalo
      x.fillStyle = '#d8d8d8'; x.fillRect(0, 220, w, 36);
      x.fillStyle = '#6a4a2a'; x.fillRect(108, 120, 40, 112);
      for (const wx of [30, 176]) { x.fillStyle = '#3a4a5a'; x.fillRect(wx, 110, 50, 60); x.fillStyle = '#2e7d4f'; x.fillRect(wx - 10, 110, 10, 60); x.fillRect(wx + 50, 110, 10, 60); }
      x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, w, 14);
    } else if (kind === 'apt') { // apartamentos con balcones
      for (let j = 0; j < 4; j++) { const y = j * 64; x.fillStyle = '#e4e4e4'; x.fillRect(0, y + 52, w, 12); for (let i = 0; i < 3; i++) { x.fillStyle = '#2c3e52'; x.fillRect(14 + i * 82, y + 10, 56, 40); x.fillStyle = '#9aa6b0'; x.fillRect(10 + i * 82, y + 44, 64, 3); for (let k = 0; k < 7; k++) x.fillRect(12 + i * 82 + k * 9, y + 44, 2, 10); } }
    } else { // torre de cristal
      for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { const v = 60 + Math.random() * 40; x.fillStyle = `rgb(${v * .55},${v * .8},${v + 40})`; x.fillRect(i * 32 + 2, j * 16 + 1, 29, 13); }
      x.fillStyle = '#cfd6dc'; for (let i = 0; i <= 8; i++) x.fillRect(i * 32, 0, 2, h);
    }
  });
}
function nightCanvas(kind) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcf80';
    if (kind === 'house') { for (const wx of [30, 176]) if (Math.random() < .7) x.fillRect(wx, 110, 50, 60); }
    else if (kind === 'apt') { for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) if (Math.random() < .55) x.fillRect(14 + i * 82, j * 64 + 10, 56, 40); }
    else for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) if (Math.random() < .4) { x.fillStyle = Math.random() < .5 ? '#ffe0a0' : '#d8ecff'; x.fillRect(i * 32 + 2, j * 16 + 1, 29, 13); }
  });
}
const houseMat = new THREE.MeshStandardMaterial({ map: facadeCanvas('house'), emissiveMap: nightCanvas('house'), emissive: 0xffffff, emissiveIntensity: 0, roughness: .85 });
const aptMat = new THREE.MeshStandardMaterial({ map: facadeCanvas('apt'), emissiveMap: nightCanvas('apt'), emissive: 0xffffff, emissiveIntensity: 0, roughness: .75 });
const glassMat = new THREE.MeshStandardMaterial({ map: facadeCanvas('glass'), emissiveMap: nightCanvas('glass'), emissive: 0xffffff, emissiveIntensity: 0, roughness: .12, metalness: .65 });
export const FACADES = [houseMat, aptMat, glassMat];
const zincMat = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .5 });
const streetTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#3a3b3f'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) { const v = 48 + Math.random() * 30; x.fillStyle = `rgb(${v},${v},${v + 2})`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  x.fillStyle = '#c9c4b8'; x.fillRect(30, 30, w - 60, h - 60);                  // acera
  x.fillStyle = '#9a958a'; x.fillRect(30, 30, w - 60, 3); x.fillRect(30, h - 33, w - 60, 3); x.fillRect(30, 30, 3, h - 60); x.fillRect(w - 33, 30, 3, h - 60);
  x.fillStyle = '#b8b4aa'; x.fillRect(44, 44, w - 88, h - 88);                  // solar
  x.fillStyle = '#f2f2ee'; for (let i = 0; i < 6; i++) { x.fillRect(4 + i * 4, 40, 2, 30); x.fillRect(40, 4 + i * 4, 30, 2); } // pasos de peatones
  x.fillStyle = '#f5c518'; x.fillRect(w / 2 - 12, 13, 24, 3); x.fillRect(13, h / 2 - 12, 3, 24);
});
streetTex.wrapS = streetTex.wrapT = THREE.RepeatWrapping;
const streetMat = new THREE.MeshStandardMaterial({ map: streetTex, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

export const TOWNS = [];
export function buildTown(p, scene) {
  // la plaza va en un punto cerca del centro que no quede encima de la carretera ni de la vía del tren
  let cx = p.x, cz = p.z;
  search: for (let r = 0; r <= 700; r += 25) for (let k = 0; k < (r ? 16 : 1); k++) {
    const a = k / 16 * Math.PI * 2, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, rd = nearRoad(x, z, 120);
    if ((!rd || rd.e > 105) && heightAt(x, z) > 2) { cx = x; cz = z; break search; }
  }
  p.px = cx; p.pz = cz;
  const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
  const big = p.big || 0, R = p.R, rnd = (() => { let s = p.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const fy = heightAt(cx, cz);
  const town = { p, g, fy, R, pumps: [], spots: {} }, used = new Set();
  // plaza central
  add(g, box(80, .3, 80), MT.path, 0, fy, 0);
  add(g, box(70, .35, 70), MT.grass, 0, fy, 0);
  for (const r of [0, Math.PI / 2]) add(g, box(70, .4, 5), MT.path, 0, fy, 0, r);
  add(g, new THREE.CylinderGeometry(6, 6.5, 1.2, 24), MT.stone, 0, fy + .6, 0);
  add(g, new THREE.CylinderGeometry(5.4, 5.4, .3, 24), MT.water, 0, fy + 1.2, 0);
  add(g, box(1.6, 6, 1.6), MT.stone, 0, fy, 0); add(g, new THREE.SphereGeometry(1, 12, 10), MT.gold, 0, fy + 6.8, 0);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(g, box(.2, 5, .2), MT.dark, Math.cos(a) * 33, fy, Math.sin(a) * 33); add(g, new THREE.SphereGeometry(.45, 8, 6), MT.lamp, Math.cos(a) * 33, fy + 5.2, Math.sin(a) * 33); }
  // iglesia frente a la plaza (norte)
  const ch = new THREE.Group(); ch.position.set(0, fy, -62); g.add(ch);
  const S = 1 + big * .25;
  add(ch, box(22 * S, 14 * S, 36 * S), MT.cream, 0, 0, -8 * S);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(.01, 13 * S, 7 * S, 4, 1), std(0x8a3a2a)); roof.rotation.set(0, Math.PI / 4, 0); roof.scale.set(1, 1, 1.9); roof.position.set(0, 17.5 * S, -8 * S); ch.add(roof);
  add(ch, box(8 * S, 30 * S, 8 * S), MT.white, 0, 0, 10 * S);
  add(ch, new THREE.ConeGeometry(5.6 * S, 9 * S, 4), std(0x8a3a2a), 0, 34.5 * S, 10 * S, Math.PI / 4);
  add(ch, box(.8, 6, .8), MT.gold, 0, 39 * S, 10 * S); add(ch, box(3.6, .8, .8), MT.gold, 0, 43 * S, 10 * S);
  add(ch, box(5 * S, 8 * S, .5), MT.wood, 0, 0, 14.1 * S);
  // letrero grande con el nombre de la provincia
  const sg = panel(p.name.toUpperCase(), 'PROVINCIA · ' + p.cap, 26, 6.5); sg.position.set(0, fy + 9, 44); g.add(sg);
  for (const s of [-1, 1]) add(g, box(.6, 12, .6), MT.metal, s * 12.5, fy, 44);
  const lab = label(p.name, 'Provincia', { scale: 2.2 + big * .6 }); lab.position.set(cx, fy + 70 + big * 25, cz); scene.add(lab); town.label = lab;
  // calles con aceras (textura en cuadrícula de 34 u: los edificios van en el centro de cada cuadra)
  const offC = Math.hypot(cx - p.x, cz - p.z), core = Math.max(150, Math.min(R * .78 - offC, 260 + big * 260));
  const nT = Math.floor(core / 34), SS = 34 * (2 * nT + 1), sg0 = new THREE.PlaneGeometry(SS, SS), suv = sg0.attributes.uv;
  for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) * (2 * nT + 1), suv.getY(i) * (2 * nT + 1));
  const st = new THREE.Mesh(sg0, streetMat); st.rotation.x = -Math.PI / 2; st.position.set(0, fy + .06, 0); st.receiveShadow = true; st.userData.keep = true; g.add(st);
  pad(cx, cz, SS / 2, SS / 2, 0, fy + .06);
  pad(cx, cz, 40, 40, 0, fy + .36);
  // edificios (instanciados): casas de colores, apartamentos con balcones y torres de cristal
  const N = [110, 220, 380, 600][big], dummy = new THREE.Object3D(), col = new THREE.Color();
  const mk = (mat, n2) => new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), mat, n2);
  const houses = mk(houseMat, N), apts = mk(aptMat, N), towers = mk(glassMat, N);
  const flat = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), roofMat, N);
  const zinc = new THREE.InstancedMesh(new THREE.ConeGeometry(.75, 1, 4).rotateY(Math.PI / 4).translate(0, .5, 0), zincMat, N);
  const cnt = { h: 0, a: 0, t: 0, f: 0, z: 0 };
  for (let tries = 0; tries < N * 6 && cnt.h + cnt.a + cnt.t < N; tries++) {
    const r = 60 + Math.pow(rnd(), .8) * (core - 40), ang = rnd() * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * r / 34) * 34, z = Math.round(Math.sin(ang) * r / 34) * 34;
    if ((Math.abs(x) < 70 && z > -140 && z < 70) || (x > 15 && x < 95 && z > -20 && z < 32)) continue;
    if (used.has(x + ',' + z)) continue;
    const wx = cx + x, wz = cz + z;
    const rd = nearRoad(wx, wz, 40); if (rd && rd.e < 16) continue;
    const gy = heightAt(wx, wz); if (gy < 1.5) continue;
    used.add(x + ',' + z);
    const cen = 1 - r / (core + 60);
    let h = 4 + rnd() * 4, w = 12 + rnd() * 10, d = 12 + rnd() * 10;
    let kind = 'h';
    if (rnd() < cen * .9) { kind = 'a'; h = 10 + rnd() * 14; }
    if (big >= 1 && rnd() < cen * cen * (big >= 2 ? .7 : .25)) { kind = 't'; h = 24 + rnd() * (big === 3 ? 80 : big === 2 ? 50 : 22); w = 16 + rnd() * 8; d = 16 + rnd() * 8; }
    const im = kind === 'h' ? houses : kind === 'a' ? apts : towers, i = cnt[kind]++;
    dummy.position.set(x, gy - .5, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(w, h + .5, d); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    im.setColorAt(i, col.setHex(kind === 't' ? [0xbcd8f0, 0x9fc4e0, 0xd8e6f2, 0x8fb8d8][i % 4] : kind === 'a' ? [0xf2efe8, 0xe8dcc8, 0xd8e4ec, 0xf6e6c8, 0xe0e0dc][i % 5] : PASTEL[Math.floor(rnd() * PASTEL.length)]));
    if (kind === 'h') { const j = cnt.z++; dummy.position.set(x, gy + h, z); dummy.scale.set(w * 1.02, 3.2, d * 1.02); dummy.updateMatrix(); zinc.setMatrixAt(j, dummy.matrix); zinc.setColorAt(j, col.setHex(ROOFS[Math.floor(rnd() * ROOFS.length)])); }
    else { const j = cnt.f++; dummy.position.set(x, gy + h, z); dummy.scale.set(w + .6, kind === 't' ? 2.2 : .8, d + .6); dummy.updateMatrix(); flat.setMatrixAt(j, dummy.matrix); flat.setColorAt(j, col.setHex(kind === 't' ? 0x5a6470 : 0xe8e4dc)); }
  }
  houses.count = cnt.h; apts.count = cnt.a; towers.count = cnt.t; flat.count = cnt.f; zinc.count = cnt.z;
  for (const im of [houses, apts, towers, flat, zinc]) { im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); if (im.count) g.add(im); }
  // palmas y árboles en la plaza
  const pt = new THREE.InstancedMesh(TREE.palm, TREE.mat, 16); for (let i = 0; i < 16; i++) { const a2 = i / 16 * Math.PI * 2; dummy.position.set(Math.cos(a2) * 26, fy + .3, Math.sin(a2) * 26); dummy.rotation.set(0, a2, 0); dummy.scale.setScalar(.8 + (i % 3) * .15); dummy.updateMatrix(); pt.setMatrixAt(i, dummy.matrix); } pt.castShadow = true; pt.userData.shared = true; g.add(pt);
  // estación de transporte (parqueo) al este de la plaza
  town.spots.parking = [cx + 52, cz + 6];
  add(g, box(60, .25, 34), MT.dark, 52, fy - .1, 6); pad(cx + 52, cz + 6, 30, 17, 0, fy + .16);
  const ps = panel('TRANSPORTE', p.cap, 14, 3.5, '#c8202a'); ps.position.set(52, fy + 7, -11); g.add(ps);
  // bomba de combustible a la salida del pueblo, junto a la carretera
  const gas = gasStation(cx, cz, R * .55, scene); if (gas) town.pumps.push(gas);
  bakeGroup(g, 9000 + big * 3000);
  TOWNS.push(town);
  return town;
}

/* ---------- Bomba de combustible ---------- */
export const PUMPS = [];
export function gasStation(cx, cz, rr, scene, exact) {
  // busca un punto junto a una carretera
  let best = null;
  if (exact) best = { x: cx, z: cz };
  else for (let k = 0; k < 24 && !best; k++) { const a = k / 24 * Math.PI * 2, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, r = nearRoad(x, z, 400); if (r) { const s = r.s, t = r.t, px = s.ax + (s.bx - s.ax) * t, pz = s.az + (s.bz - s.az) * t, dx = s.bx - s.ax, dz = s.bz - s.az, l = Math.hypot(dx, dz) || 1; best = { x: px - dz / l * (s.w / 2 + 16), z: pz + dx / l * (s.w / 2 + 16), yaw: Math.atan2(dx, dz) }; } }
  if (!best) return null;
  const g = new THREE.Group(), y = heightAt(best.x, best.z); g.position.set(best.x, y, best.z); g.rotation.y = best.yaw || 0; scene.add(g);
  add(g, box(26, .25, 20), MT.concrete);
  for (const [x, z] of [[-8, -5], [8, -5], [-8, 5], [8, 5]]) add(g, box(.7, 6, .7), MT.white, x, 0, z);
  add(g, box(22, 1.2, 16), MT.red, 0, 6, 0);
  add(g, box(22.2, .3, 16.2), MT.white, 0, 6.6, 0);
  for (const x of [-4, 4]) { add(g, box(1.2, 1.8, .8), MT.white, x, 0, 0); add(g, box(1.25, .5, .85), MT.blue, x, 1.3, 0); }
  add(g, box(10, 4, 6), MT.cream, 0, 0, -12);
  const s = panel('⛽ BOMBA', 'COMBUSTIBLE', 7, 1.8, '#1f4fa8'); s.position.set(0, 6.6, 8.3); g.add(s);
  const pole = add(g, box(.5, 10, .5), MT.metal, 13, 0, 9); const s2 = panel('⛽', '', 3, 3, '#c8202a'); s2.position.set(13, 11, 9); g.add(s2);
  pad(best.x, best.z, 13, 10, best.yaw || 0, y + .25);
  bakeGroup(g, 3500);
  const pump = { x: best.x, z: best.z, g };
  PUMPS.push(pump);
  return pump;
}
// bombas a lo largo de las autopistas (cada ~12 km reales)
export function highwayPumps(scene) {
  for (const r of LINES.roads) {
    if (!r.main) continue;
    const L = r.cum[r.cum.length - 1];
    for (let s = 6000; s < L - 3000; s += 6000) {
      const p = linePos(r, s); if (PUMPS.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 2500)) continue;
      if (PROVINCES.some(q => Math.hypot(q.x - p.x, q.z - p.z) < q.R)) continue;
      const nx = -Math.cos(p.yaw), nz = Math.sin(p.yaw);
      gasStation(p.x + nx * (r.w / 2 + 16), p.z + nz * (r.w / 2 + 16), 0, scene, true).g.rotation.y = p.yaw;
    }
  }
}

/* ---------- Peajes ---------- */
export const TOLL_LIST = [];
export function buildTolls(scene) {
  for (const t of TOLLS) {
    const [x, z] = toXZ(t.lon, t.lat), r = nearRoad(x, z, 3000); if (!r) continue;
    const s = r.s, px = s.ax + (s.bx - s.ax) * r.t, pz = s.az + (s.bz - s.az) * r.t, yaw = Math.atan2(s.bx - s.ax, s.bz - s.az), y = r.y;
    const g = new THREE.Group(); g.position.set(px, y, pz); g.rotation.y = yaw; scene.add(g);
    const W = s.w + 14;
    add(g, box(W, 1.2, 10), MT.white, 0, 6.5, 0);
    add(g, box(W + .2, .4, 10.2), MT.red, 0, 7.4, 0);
    for (const x2 of [-W / 2, -W / 4, 0, W / 4, W / 2]) { add(g, box(1.8, 6.5, 3), MT.cream, x2, 0, 0); add(g, box(1.85, 1.6, 3.05), MT.glass, x2, 2.6, 0); }
    const bars = []; for (const x2 of [-W / 2 + 1, -W / 4 + 1, 1, W / 4 + 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(W / 4 - 2, .2, .2).translate((W / 4 - 2) / 2, 0, 0), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, emissive: 0x220000 })); b.position.set(x2, 1.1, 2); b.userData.keep = true; g.add(b); bars.push(b); }
    const sg = panel('PEAJE', t.name.replace('Peaje ', '').replace(/^de la |^de /, ''), 14, 3.5, '#f5c518', '#111'); sg.position.set(0, 9.8, 5.2); g.add(sg);
    const sg2 = sg.clone(); sg2.position.z = -5.2; sg2.rotation.y = Math.PI; g.add(sg2);
    const lab = label('🚧 ' + t.name, 'Detente en la caseta', { color: '#f5c518', scale: .8 }); lab.position.set(0, 18, 0); g.add(lab);
    bakeGroup(g, 5000);
    TOLL_LIST.push({ ...t, x: px, z: pz, yaw, g, bars, last: 0 });
  }
}

/* ---------- Aeropuertos ---------- */
export function buildAirport(a, scene) {
  const g = new THREE.Group(), y = heightAt(a.x, a.z) + .05, yaw = Math.atan2(a.dir[0], a.dir[1]); g.position.set(a.x, y, a.z); g.rotation.y = yaw; scene.add(g);
  const tex = canvasTex(256, 2048, (x, w, h) => { x.fillStyle = '#2e3034'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f4f0'; for (let i = 0; i < h; i += 64) x.fillRect(w / 2 - 3, i, 6, 34); for (const yy of [30, h - 90]) for (let i = 0; i < 8; i++) x.fillRect(20 + i * 28, yy, 14, 60); x.fillRect(6, 0, 4, h); x.fillRect(w - 10, 0, 4, h); x.font = '900 40px sans-serif'; x.textAlign = 'center'; x.fillText(a.code, w / 2, 160); });
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(45, 1700), new THREE.MeshStandardMaterial({ map: tex, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 })); rw.rotation.x = -Math.PI / 2; rw.position.y = .25; rw.receiveShadow = true; g.add(rw);
  const tw = new THREE.Mesh(new THREE.PlaneGeometry(25, 900), new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 })); tw.rotation.x = -Math.PI / 2; tw.position.set(70, .22, 0); g.add(tw);
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(160, 260), tw.material); ap.rotation.x = -Math.PI / 2; ap.position.set(160, .2, 0); g.add(ap);
  add(g, box(40, 14, 200), MT.white, 260, 0, 0); add(g, box(40.5, 8, 196), MT.glass, 260, 3, 0);
  add(g, box(46, 1.5, 206), MT.blue, 260, 14, 0);
  add(g, new THREE.CylinderGeometry(3, 4, 34, 12).translate(0, 17, 0), MT.white, 230, 0, 130);
  add(g, new THREE.CylinderGeometry(6, 5, 6, 12).translate(0, 37, 0), MT.glass, 230, 0, 130);
  const sg = panel(a.name, a.code, 80, 10, '#0b2a6a'); sg.position.set(239.5, 17, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
  add(g, new THREE.CylinderGeometry(14, 14, .3, 32), MT.concrete, 160, 0, 110);
  const hm = canvasTex(128, 128, (x) => { x.fillStyle = '#cfcac0'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#f5c518'; x.lineWidth = 8; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.font = '900 70px sans-serif'; x.textAlign = 'center'; x.fillText('H', 64, 88); });
  const hp = new THREE.Mesh(new THREE.CircleGeometry(13, 32), new THREE.MeshStandardMaterial({ map: hm })); hp.rotation.x = -Math.PI / 2; hp.position.set(160, .4, 110); g.add(hp);
  const lab = label('✈️ ' + a.code, a.name, { scale: 2.4, color: '#9fd8ff' }); lab.position.set(200, 90, 0); g.add(lab);
  pad(a.x, a.z, 23, 850, yaw, y + .25);
  { const c = Math.cos(yaw), sn = Math.sin(yaw); pad(a.x + c * 160, a.z - sn * 160, 80, 130, yaw, y + .2); pad(a.x + c * 70, a.z - sn * 70, 13, 450, yaw, y + .22); }
  bakeGroup(g, 12000);
  g.updateMatrixWorld(true);
  const w = v => v.clone().applyMatrix4(g.matrixWorld);
  return { a, g, yaw, plane: w(new THREE.Vector3(160, 0, -50)), plane2: w(new THREE.Vector3(160, 0, 40)), heli: w(new THREE.Vector3(160, 0, 110)), runwayStart: w(new THREE.Vector3(0, 0, -780)), runwayEnd: w(new THREE.Vector3(0, 0, 780)) };
}

/* ---------- Estaciones del tren ---------- */
export function buildStations(scene) {
  const out = [];
  for (const line of LINES.rails) for (const st of line.stops) {
    const p = linePos(line, st.s), g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw; scene.add(g);
    const nx = 1;
    add(g, box(8, 1.1, 90), MT.concrete, 7.5 * nx, -.5, 0);
    for (const z of [-36, -12, 12, 36]) add(g, box(.5, 5, .5), MT.metal, 9 * nx, .6, z);
    add(g, box(8, .5, 84), std(line.color), 7.5 * nx, 5.6, 0);
    const sg = panel(st.name, '🚆 ' + line.name, 18, 4, '#' + new THREE.Color(line.color).getHexString()); sg.position.set(11.6, 4, 0); sg.rotation.y = Math.PI / 2; g.add(sg);
    pad(p.x + Math.cos(p.yaw) * 7.5, p.z - Math.sin(p.yaw) * 7.5, 4, 45, p.yaw, p.y + .6);
    bakeGroup(g, 5000);
    out.push({ line, st, x: p.x, z: p.z, y: p.y });
  }
  return out;
}

/* ---------- Puertos ---------- */
export function buildPorts(scene) {
  const out = [];
  for (const pt of PORTS) {
    const [x, z] = toXZ(pt.lon, pt.lat);
    // busca el agua más cercana
    let wpt = null, land = null;
    for (let r = 0; r < 2500 && !wpt; r += 40) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (H0(px, pz) < -3) { wpt = [px, pz]; break; } }
    if (!wpt) continue;
    for (let r = 0; r < 1500 && !land; r += 15) { const t = r / 1500, px = wpt[0] + (x - wpt[0]) * t, pz = wpt[1] + (z - wpt[1]) * t; if (H0(px, pz) > 1.5) land = [px, pz]; }
    if (!land) land = [x, z];
    const yaw = Math.atan2(wpt[0] - land[0], wpt[1] - land[1]), len = Math.min(120, Math.hypot(wpt[0] - land[0], wpt[1] - land[1]) + 30);
    const g = new THREE.Group(); g.position.set(land[0], 0, land[1]); g.rotation.y = yaw; scene.add(g);
    add(g, box(6, .6, len), MT.wood, 0, 1.6, len / 2);
    for (let zz = 4; zz < len; zz += 8) for (const s of [-2.6, 2.6]) add(g, new THREE.CylinderGeometry(.25, .25, 6).translate(0, -1, 0), MT.wood, s, 0, zz);
    const lab = label('⚓ ' + pt.name, 'Muelle · lanchas', { scale: 1, color: '#9fd8ff' }); lab.position.set(0, 16, len * .5); g.add(lab);
    { const c = Math.cos(yaw), sn = Math.sin(yaw); pad(land[0] + sn * len / 2, land[1] + c * len / 2, 3, len / 2, yaw, 1.9); }
    bakeGroup(g, 5000);
    g.updateMatrixWorld(true);
    const boat = new THREE.Vector3(5, 0, len - 6).applyMatrix4(g.matrixWorld);
    out.push({ ...pt, x: land[0], z: land[1], yaw, boat, dock: new THREE.Vector3(0, 0, len - 4).applyMatrix4(g.matrixWorld) });
  }
  return out;
}

/* ---------- Lugares famosos ---------- */
export function buildPlace(pl, scene) {
  const [x, z] = toXZ(pl.lon, pl.lat); pl.x = x; pl.z = z;
  const y = Math.max(0, heightAt(x, z)), g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const T = pl.type;
  if (T === 'catedral') {
    add(g, box(30, 20, 60), MT.stone); add(g, box(32, 26, 10), MT.stone, 0, 0, 30);
    for (const s of [-1, 1]) add(g, box(4, 30, 4), MT.stone, s * 14, 0, 30);
    add(g, box(8, 10, .6), MT.wood, 0, 0, 35.2);
    add(g, box(40, .3, 40), MT.path, 0, 0, 60); add(g, box(2, 8, 2), MT.stone, 0, 0, 60); add(g, box(1, 3, 1), MT.dark, 0, 8, 60);
  } else if (T === 'obelisco') {
    add(g, new THREE.CylinderGeometry(.8, 3, 42, 4).translate(0, 21, 0), MT.white, 0, 0, 0, Math.PI / 4); add(g, box(8, 2, 8), MT.stone);
    add(g, box(300, .6, 10), MT.path, 0, 0, 30);
  } else if (T === 'faro') {
    add(g, box(40, 32, 220), MT.stone); add(g, box(140, 26, 36), MT.stone, 0, 0, 40);
    for (let i = 0; i < 6; i++) add(g, box(36, 2, 2), MT.dark, 0, 32, -100 + i * 40);
    const beamM = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false });
    const beams = new THREE.Group(); beams.userData.keep = true; g.add(beams); pl.beams = beams; beams.visible = false;
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(8, 1400, 8).translate(0, 700, 0), beamM); b1.position.set(0, 32, 0); beams.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(400, 8, 8), beamM); b2.position.set(0, 900, 0); beams.add(b2);
  } else if (T === 'columna') {
    add(g, box(30, 4, 30), MT.white); add(g, box(18, 30, 18), MT.white, 0, 4); add(g, new THREE.CylinderGeometry(4, 5, 34, 16).translate(0, 34, 0), MT.white);
    add(g, box(3, 8, 3), std(0x5a6a5a, { metalness: .6 }), 0, 68);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(g, box(3, .5, 60), MT.path, Math.cos(a) * 40, 0, Math.sin(a) * 40, -a); }
  } else if (T === 'basilica') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(26, 4, 8, 32, Math.PI), MT.concrete); arc.position.set(0, 2, 0); arc.scale.set(.7, 2.2, 1); g.add(arc);
    add(g, box(50, 18, 70), MT.concrete, 0, 0, -38); add(g, box(.8, 14, .8), MT.gold, 0, 56, 0); add(g, box(6, .8, .8), MT.gold, 0, 66, 0);
  } else if (T === 'iglesia') {
    add(g, box(14, 10, 24), MT.stone); add(g, box(6, 20, 6), MT.stone, 0, 0, 12); add(g, box(.5, 4, .5), MT.gold, 0, 20, 12); add(g, box(2.4, .5, .5), MT.gold, 0, 22.6, 12);
  } else if (T === 'morro') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(150, 240, 120, 24, 3), MT.rock); m.position.y = 40; m.scale.z = .6; g.add(m);
    add(g, new THREE.CylinderGeometry(150, 150, 2, 24), MT.grass, 0, 100).scale.z = .6;
  } else if (T === 'teleferico') {
    const top = [0, 0, -1200], ty = Math.max(y + 300, heightAt(x, z - 1200) + 10);
    add(g, box(10, 10, 10), MT.white); const st2 = add(g, box(10, 10, 10), MT.white, top[0], ty - y, top[2]);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, Math.hypot(1200, ty - y)), MT.dark); cable.position.set(0, 10 + (ty - y) / 2, -600); cable.rotation.x = Math.atan2(1200, ty - y); g.add(cable);
    const cab = add(g, box(4, 3.5, 4), MT.red, 0, 0, 0); cab.userData.keep = true; pl.cab = { m: cab, from: new THREE.Vector3(0, 6.5, 0), to: new THREE.Vector3(0, ty - y + 6.5, -1200) };
    const cristo = add(g, box(2, 14, 2), MT.white, 0, ty - y + 10, -1220); add(g, box(10, 1.6, 1.6), MT.white, 0, ty - y + 21, -1220);
  } else if (T === 'fuerte') {
    for (const [a, b, w2, d2] of [[0, -20, 50, 4], [0, 20, 50, 4], [-25, 0, 4, 44], [25, 0, 4, 44]]) add(g, box(w2, 9, d2), MT.stone, a, 0, b);
    for (const [a, b] of [[-25, -20], [25, -20], [-25, 20], [25, 20]]) add(g, new THREE.CylinderGeometry(4, 4.5, 12, 12).translate(0, 6, 0), MT.stone, a, 0, b);
    add(g, box(10, 14, 10), MT.stone);
  } else if (T === 'pico') {
    add(g, box(3, 2, 3), MT.stone); add(g, new THREE.SphereGeometry(1.2, 12, 10), std(0x6a6a5a, { metalness: .5 }), 0, 3, 0);
    add(g, box(.2, 9, .2), MT.metal, 4, 0, 0);
    const fl = canvasTex(96, 64, (x2) => { x2.fillStyle = '#002d62'; x2.fillRect(0, 0, 40, 26); x2.fillRect(56, 38, 40, 26); x2.fillStyle = '#ce1126'; x2.fillRect(56, 0, 40, 26); x2.fillRect(0, 38, 40, 26); x2.fillStyle = '#fff'; x2.fillRect(40, 0, 16, 64); x2.fillRect(0, 26, 96, 12); });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), new THREE.MeshStandardMaterial({ map: fl, side: THREE.DoubleSide })); f.position.set(6.3, 7.4, 0); f.userData.keep = true; g.add(f); pl.flag = f;
  } else if (T === 'valle') {
    for (let i = 0; i < 8; i++) { const gh = add(g, box(24, 5, 50), new THREE.MeshStandardMaterial({ color: 0xe8f0f0, transparent: true, opacity: .6 }), -120 + i * 34, heightAt(x - 120 + i * 34, z + 60) - y, 60); }
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 120), std([0xc83a4a, 0x7ab04a, 0xe8c040][i % 3], { roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 })); f.rotation.x = -Math.PI / 2; f.position.set(-150 + i * 65, heightAt(x - 150 + i * 65, z - 90) - y + .5, -90); g.add(f); }
  } else if (T === 'salto') {
    add(g, box(40, 40, 14), MT.rock, 0, 0, -10);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: .8, emissive: 0x204050 })); w2.position.set(0, 20, -2.8); g.add(w2); pl.fall = w2;
    add(g, new THREE.CylinderGeometry(14, 14, .5, 24), MT.water, 0, 0, 8);
  } else if (T === 'lago') {
    for (let i = 0; i < 6; i++) { const cr = add(g, box(1.4, .5, 4), std(0x4a5a32), (i - 3) * 7, 0, 12 + (i % 2) * 5, i); }
    for (let i = 0; i < 5; i++) add(g, box(.6, .5, 1.4), std(0x8a7a5a), (i - 2) * 4, 0, -6, i * .7);
    add(g, box(.3, 3, .3), MT.wood); const s2 = panel(pl.name, 'Parque', 6, 1.6, '#2e5a2e'); s2.position.y = 3.4; g.add(s2);
  } else if (T === 'playa') {
    for (let i = 0; i < 10; i++) { const px = (i - 5) * 9, pz = (i % 2) * 8; add(g, new THREE.CylinderGeometry(.1, .1, 3).translate(0, 1.5, 0), MT.wood, px, 0, pz); add(g, new THREE.ConeGeometry(2.4, .9, 10), [MT.red, MT.blue, std(0xf5c518)][i % 3], px, 3.2, pz); add(g, box(.8, .3, 2), MT.white, px + 1.5, 0, pz + 1); }
  } else if (T === 'mirador') {
    add(g, box(16, 1, 10), MT.wood); for (const s of [-1, 1]) add(g, box(16, 1.1, .2), MT.wood, 0, 1, s * 5);
  } else if (T === 'mogotes') {
    for (let i = 0; i < 6; i++) add(g, box(.3, 3, .3), MT.wood, 0, 0, 0);
    const s2 = panel('Los Haitises', 'Parque Nacional', 8, 2, '#2e5a2e'); s2.position.y = 3.4; g.add(s2);
  } else if (T === 'dunas') {
    for (let i = 0; i < 9; i++) { const d2 = new THREE.Mesh(new THREE.SphereGeometry(30 + i * 3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MT.sand); d2.scale.set(1.6, .45, 1); d2.position.set((i % 3 - 1) * 70, -2, Math.floor(i / 3) * 60 - 60); g.add(d2); }
  } else if (T === 'cueva') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(8, 4, 8, 16, Math.PI), MT.rock); arc.scale.set(1, 1, 2); g.add(arc);
    add(g, new THREE.CylinderGeometry(6, 6, .3, 16), MT.water, 0, 0, -4);
  } else if (T === 'reloj') {
    add(g, box(5, 18, 5), MT.white); add(g, new THREE.ConeGeometry(4, 5, 4), MT.red, 0, 20.5, 0, Math.PI / 4);
    const ck = canvasTex(128, 128, (x2) => { x2.fillStyle = '#fff'; x2.beginPath(); x2.arc(64, 64, 60, 0, 7); x2.fill(); x2.strokeStyle = '#111'; x2.lineWidth = 6; x2.stroke(); x2.beginPath(); x2.moveTo(64, 64); x2.lineTo(64, 20); x2.moveTo(64, 64); x2.lineTo(94, 64); x2.stroke(); });
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshStandardMaterial({ map: ck })); f.rotation.y = i * Math.PI / 2; f.position.set(Math.sin(i * Math.PI / 2) * 2.55, 15, Math.cos(i * Math.PI / 2) * 2.55); g.add(f); }
  } else if (T === 'mercado') {
    for (let i = 0; i < 12; i++) { const px = (i % 4 - 1.5) * 9, pz = Math.floor(i / 4) * 9 - 9; add(g, box(6, 2.6, 6), MT.wood, px, 0, pz); add(g, box(7, .3, 7), [MT.red, MT.blue, std(0xf5c518), MT.green][i % 4], px, 3, pz); }
  } else if (T === 'parque') {
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; add(g, new THREE.SphereGeometry(5, 10, 8), MT.green, Math.cos(a) * 30, 6, Math.sin(a) * 30); add(g, box(.8, 5, .8), MT.wood, Math.cos(a) * 30, 0, Math.sin(a) * 30); }
    const s2 = panel(pl.name, '', 10, 2, '#2e5a2e'); s2.position.y = 3; g.add(s2);
  }
  const lab = label(pl.name, '★ Lugar especial', { scale: 1.4, color: '#7ef0a4' }); lab.position.set(0, (T === 'faro' ? 70 : T === 'morro' ? 160 : T === 'columna' ? 90 : 45), 0); g.add(lab);
  bakeGroup(g, T === 'faro' ? 0 : 9000);
  pl.g = g;
  return g;
}

/* ---------- Árboles y casitas del campo (por pedazo de terreno) ---------- */
function vcolor(geo, c) { const n = geo.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
const clean = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; };
const TREE = (() => {
  const palm = [];
  palm.push(vcolor(new THREE.CylinderGeometry(.22, .35, 9, 6).translate(0, 4.5, 0), 0x8a6a48));
  for (let i = 0; i < 7; i++) { const f = new THREE.BoxGeometry(.9, .08, 5).translate(0, 0, 2.5); f.rotateX(.45); f.rotateY(i / 7 * Math.PI * 2); f.translate(0, 9, 0); palm.push(vcolor(f, 0x3f8a32)); }
  const tree = [vcolor(new THREE.CylinderGeometry(.3, .45, 4, 6).translate(0, 2, 0), 0x6a4a2a), vcolor(new THREE.IcosahedronGeometry(3.6, 0).translate(0, 6.4, 0), 0x3f7f2e), vcolor(new THREE.IcosahedronGeometry(2.6, 0).translate(1.8, 7.6, .8), 0x4a8f34)];
  const pine = [vcolor(new THREE.CylinderGeometry(.25, .4, 4, 6).translate(0, 2, 0), 0x5a3e24), vcolor(new THREE.ConeGeometry(3, 6, 7).translate(0, 6, 0), 0x2a5a2a), vcolor(new THREE.ConeGeometry(2.2, 5, 7).translate(0, 9.5, 0), 0x2f6a30)];
  const house = [vcolor(new THREE.BoxGeometry(6, 3.2, 5).translate(0, 1.6, 0), 0xffffff), vcolor(new THREE.ConeGeometry(4.8, 2, 4).rotateY(Math.PI / 4).scale(1, 1, .85).translate(0, 4.2, 0), 0x9aa3aa)];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
  const mk = parts => { const g = mergeGeometries(parts.map(clean)); return g; };
  return { palm: mk(palm), tree: mk(tree), pine: mk(pine), house: mk(house), mat: m };
})();
export function decorateChunk(cx, cz, scene) {
  const g = new THREE.Group(), ox = cx * CH, oz = cz * CH;
  const lists = { palm: [], tree: [], pine: [], house: [] };
  const dens = fbm(ox / 5000 + 3, oz / 5000 - 7);
  const N = Math.floor(60 + dens * 260);
  for (let k = 0; k < N; k++) {
    const x = ox + rand2(cx * 977 + k, cz * 131) * CH, z = oz + rand2(cx * 31 + k * 7, cz * 919 + k) * CH;
    const h = H0(x, z); if (h < 2.5) continue;
    const local = fbm(x / 400, z / 400); if (local < .38) continue;
    if (TOWNS.some(t => Math.hypot(x - t.p.x, z - t.p.z) < t.R * .9)) continue;
    const r = nearRoad(x, z, 30); if (r && r.e < 22) continue;
    const sd = sdAt(x, z), y = heightAt(x, z);
    const kind = h > 620 ? 'pine' : (sd < 2500 || rand2(k, cx) < .3) ? 'palm' : 'tree';
    lists[kind].push([x - ox, y - .3, z - oz, rand2(k, cz) * 6.28, .8 + rand2(cz, k) * .6]);
  }
  // casitas junto a las carreteras
  for (let k = 0; k < 14; k++) {
    const x = ox + rand2(cx * 13 + k, cz * 29) * CH, z = oz + rand2(cx * 41, cz * 17 + k) * CH;
    const r = nearRoad(x, z, 80); if (!r || r.kind !== 'road' || r.e < 14 || r.e > 60) continue;
    if (TOWNS.some(t => Math.hypot(x - t.p.x, z - t.p.z) < t.R * .8)) continue;
    const s = r.s; lists.house.push([x - ox, heightAt(x, z) - .2, z - oz, Math.atan2(s.bx - s.ax, s.bz - s.az), 1]);
  }
  const d = new THREE.Object3D(), col = new THREE.Color();
  for (const [kind, arr] of Object.entries(lists)) {
    if (!arr.length) continue;
    const im = new THREE.InstancedMesh(TREE[kind], TREE.mat, arr.length); im.userData.shared = true;
    arr.forEach(([x, y, z, ry, s], i) => { d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (kind === 'house') im.setColorAt(i, col.setHex(PASTEL[(i * 7 + cx + cz) % PASTEL.length])); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im);
  }
  g.position.set(ox, 0, oz);
  scene.add(g);
  return g;
}
export { MT };
