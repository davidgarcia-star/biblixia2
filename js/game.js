import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { VERSES } from './verses.js';
import { createHuman, animateHuman } from './human.js';
import { CHARACTERS, createCharacter, nameSprite } from './characters.js';
import { Sound2 } from './audio2.js';
import { PROVINCES, PROV, AIRPORTS, PLACES, MISSIONS, BOUNDS, toXZ, KM } from './rd-data.js';
import { buildMasks, initFlats, buildLines, buildFarMesh, buildWater, Chunks, linesInChunk, riversInChunk, heightAt, groundAt as groundAt0, H0, inHaiti, typeAt, LINES, linePos, nearRoad, CH } from './terrain.js';
import { buildTown, buildAirport, buildPorts, buildStations, buildTolls, highwayPumps, buildPlace, decorateChunk, TOWNS, PUMPS, TOLL_LIST, facadeMat, NIGHT_MATS, label, DETAIL, padAt, FACADES } from './towns.js';
// suelo = terreno, carretera o superficie construida (plaza, andén, pista, muelle): así los pies no se entierran
const groundAt = (x, z) => { const g = groundAt0(x, z), p = padAt(x, z); return p > g.y - .02 ? { y: p, road: 'pad', main: false } : g; };
import { makeVehicle, animateVehicle, KINDS, TRAFFIC_COLORS } from './vehicles.js';
import { buildBaseMap, drawMap } from './maps.js';
import { initGente, updateGente, CITY_LOOPS } from './gente.js';
import { bakeInPlace } from './human.js';

/* =========================================================
   BIBLIXIA 2 · Lleva a los personajes de la Biblia por República Dominicana
   Creado por Luis David Esteban García · MIPROAA
   ========================================================= */
const $ = id => document.getElementById(id);
const SAVE_KEY = 'biblixia2_v1';
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let save = { player: null, time: 'dia', done: {}, gifts: [], verses: [], deliveries: 0, stars: 0, pos: null, mission: null, fuel: {}, best: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const fmtKm = u => (u / KM).toFixed(u / KM < 10 ? 1 : 0) + ' km';
const fmtT = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

/* ---------- Render ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch || devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.debug.checkShaderErrors = /^(localhost|127\.)/.test(location.hostname);
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); persist(); $('glLost').classList.remove('hidden'); setTimeout(() => location.reload(), 1500); });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .7, 70000);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// Cielo, sol, luna, estrellas
const sky = new Sky(); sky.scale.setScalar(60000); scene.add(sky);
const su = sky.material.uniforms; su.turbidity.value = 4; su.rayleigh.value = 1.4; su.mieCoefficient.value = .005; su.mieDirectionalG.value = .85;
const sunDir = new THREE.Vector3();
const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4b5a3c, .6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 3); sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 900 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
scene.add(sun, sun.target);
scene.fog = new THREE.Fog(0xc4d6ea, 3000, 26000);
const stars = (() => { const n = 2500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * 6.283, ph = Math.acos(1 - Math.random() * .95); p.set([Math.sin(ph) * Math.cos(th) * 50000, Math.cos(ph) * 50000, Math.sin(ph) * Math.sin(th) * 50000], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const s = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xe8eeff, fog: false })); s.visible = false; scene.add(s); return s; })();
const moon = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, '#e8eefc'); gr.addColorStop(.42, 'rgba(200,215,255,.35)'); gr.addColorStop(1, 'rgba(180,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false })); s.scale.set(5000, 5000, 1); s.visible = false; scene.add(s); return s; })();
const lamp = new THREE.PointLight(0xffe2b0, 0, 60, 1.6); scene.add(lamp);
const headlight = new THREE.SpotLight(0xfff4dc, 0, 160, .55, .5, 1.2); scene.add(headlight, headlight.target);

const TIMES = {
  dia: { name: '☀️ Día', elev: 42, az: 140, sunC: 0xfff1dc, sunI: 3.0, hemi: .45, exp: .42, fog: 0xbcd4ea, fogN: 3500, fogF: 30000, turb: 3, ray: 1.2, stars: false, win: 0 },
  atardecer: { name: '🌅 Atardecer', elev: 4, az: 250, sunC: 0xff9a50, sunI: 2.2, hemi: .4, exp: .55, fog: 0xd8a078, fogN: 2500, fogF: 22000, turb: 9, ray: 2.6, stars: false, win: .8 },
  noche: { name: '🌙 Noche', elev: -12, az: 200, sunC: 0x9fb8ff, sunI: .9, hemi: .32, exp: 1.1, fog: 0x0c1428, fogN: 1200, fogF: 14000, turb: 1, ray: .3, stars: true, win: 1.6 },
};
const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); let envSky = null, envRT = null;
const moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(120));
function applyTime(mode) {
  const T = TIMES[mode] || TIMES.dia; save.time = mode;
  const sd = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.elev), THREE.MathUtils.degToRad(T.az));
  su.sunPosition.value.copy(sd); su.turbidity.value = T.turb; su.rayleigh.value = T.ray;
  sunDir.copy(T.stars ? moonDir : sd); if (sunDir.y < .3) sunDir.y = .3; sunDir.normalize();
  sun.color.set(T.sunC); sun.intensity = T.sunI; hemi.intensity = T.hemi;
  renderer.toneMappingExposure = T.exp; scene.fog.color.set(T.fog); scene.fog.near = T.fogN; scene.fog.far = T.fogF;
  scene.background = T.stars ? new THREE.Color(0x05070f) : null; sky.visible = !T.stars; stars.visible = moon.visible = T.stars;
  facadeMat.emissiveIntensity = T.win; FACADES.forEach(m => m.emissiveIntensity = T.win); NIGHT_MATS.forEach(m => m.emissiveIntensity = T.stars ? 3 : .6);
  for (const p of PLACES) if (p.beams) p.beams.visible = T.stars;
  // luz del cielo para los metales y la pintura de los carros
  try { if (!envSky) { envSky = new Sky(); envSky.scale.setScalar(50); envScene.add(envSky); } const eu = envSky.material.uniforms; eu.sunPosition.value.copy(sd); eu.turbidity.value = T.turb; eu.rayleigh.value = T.ray; eu.mieCoefficient.value = .005; if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0, .1, 100, { size: isTouch ? 128 : 256 }); scene.environment = envRT.texture; scene.environmentIntensity = T.stars ? .2 : .5; } catch (e) {}
  persist(); renderTimeButtons();
}

/* ---------- Sonido ---------- */
const sound = new Sound2();
try { sound.setMusic(localStorage.getItem(SAVE_KEY + '_music') !== '0'); sound.setSfx(localStorage.getItem(SAVE_KEY + '_sfx') !== '0'); } catch (e) {}
let musicStarted = false;
const ensureMusic = () => { sound.unlock(); if (!musicStarted) { musicStarted = true; sound.startMusic(state === 'play' ? 'play' : 'menu'); } };
addEventListener('pointerdown', ensureMusic); addEventListener('keydown', ensureMusic);

/* =========================================================
   MUNDO
   ========================================================= */
let world = null, chunks = null, farMesh = null, water = null;
const loadBar = (p, txt) => { $('loadFill').style.width = (p * 100).toFixed(0) + '%'; if (txt) $('loadTxt').textContent = txt; };
const idle = () => new Promise(r => setTimeout(r, 0));
async function buildWorld() {
  loadBar(.05, 'Dibujando la isla…'); await idle();
  buildMasks(); loadBar(.2, 'Levantando las cordilleras…'); await idle();
  initFlats(); buildLines(); loadBar(.35, 'Trazando autopistas y vías del tren…'); await idle();
  farMesh = buildFarMesh(); scene.add(farMesh); water = buildWater(); scene.add(water);
  loadBar(.45, 'Construyendo las 32 provincias…'); await idle();
  for (const [i, p] of PROVINCES.entries()) { buildTown(p, scene); if (i % 4 === 3) { loadBar(.45 + .25 * i / PROVINCES.length); await idle(); } }
  loadBar(.72, 'Aeropuertos, puertos y estaciones…'); await idle();
  const airports = AIRPORTS.map(a => buildAirport(a, scene));
  const ports = buildPorts(scene), stations = buildStations(scene); buildTolls(scene); highwayPumps(scene);
  loadBar(.82, 'Lugares famosos…'); await idle();
  for (const pl of PLACES) buildPlace(pl, scene);
  buildBaseMap(); initGente(scene, TOWNS);
  chunks = new Chunks(scene, (cx, cz) => { const g = decorateChunk(cx, cz, scene); linesInChunk(cx, cz, g); riversInChunk(cx, cz, g); return g; });
  world = { airports, ports, stations };
  spawnVehicles(); buildCoins();
  loadBar(.9, 'Preparando el terreno…'); await idle();
}

/* =========================================================
   JUGADOR
   ========================================================= */
export const SKINS = [0xf1cbb0, 0xe8b896, 0xc68e6a, 0xa8714f, 0x8a5636, 0x5e3a24];
export const TOPS = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a, 0x2e7d4f, 0x2a4a9a, 0xe87aa0, 0xf2f0e8, 0x8a5a2a, 0x6a2a8a, 0x1a9ab0];
export const BOTTOMS = [0x2b3a57, 0x22243a, 0x1a1a1e, 0x6a4a2a, 0x8a2a3a, 0x2d3a6a, 0x5a6a3a, 0xe8dcc0, 0x7a3b6e, 0x9a6a3a];
const OUTFITS = [
  { id: 'moderno', name: '👕 Moderna' }, { id: 'tunica', name: '🧥 Túnica y manto' }, { id: 'pastor', name: '🐑 Pastor' }, { id: 'levita', name: '🤍 Levita (lino)' },
  { id: 'chofer', name: '🧢 Chofer', req: 3, lockText: 'Con 3 entregas' }, { id: 'aaron', name: '👑 Sumo sacerdote Aarón', req: 10, lockText: 'Con 10 entregas' },
];
if (!save.player) save.player = { gender: 'm', name: '', skin: 2, top: 0, bottom: 0, outfit: 'moderno', legwear: 'pantalon', topStyle: 'camisa' };
const outfitOK = id => { const o = OUTFITS.find(x => x.id === id); return !!o && !(o.req && save.deliveries < o.req); };
function playerOpts(pl = save.player) {
  const f = pl.gender === 'f', top = TOPS[pl.top] ?? TOPS[0], bot = BOTTOMS[pl.bottom] ?? BOTTOMS[0];
  const base = { gender: pl.gender, name: pl.name, skin: SKINS[pl.skin] ?? SKINS[2], hairColor: f ? 0x3a2314 : 0x1d130c, eye: f ? 0x4a6b3a : 0x5a3a22, detail: 1 };
  const out = outfitOK(pl.outfit) ? pl.outfit : 'moderno';
  if (out === 'tunica') return { ...base, outfit: 'robe', robe: top, mantle: bot, sash: 0x8a2b2b, hair: f ? 'cloth' : 'short', cloth: bot };
  if (out === 'pastor') return { ...base, outfit: 'robe', robe: 0xb8a074, mantle: bot, sash: 0x5a3a1e, hair: 'cloth', cloth: f ? bot : 0xe8dcc0 };
  if (out === 'levita') return { ...base, outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: top, hair: f ? 'cloth' : 'turban', cloth: 0xf4f0e6 };
  if (out === 'aaron') return { ...base, gender: 'm', outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: 0x5b2a7a, hair: 'turban', priest: true, beard: { color: 0x5a4a3a, len: .13 }, hairColor: 0x4a3a2a };
  if (out === 'chofer') return { ...base, top: 0x1f4fa8, pants: 0x22243a, skirt: 0x22243a, legwear: 'pantalon', topStyle: 'camisa', hair: f ? 'ponytail' : 'short', shoes: 0x1a1a1a };
  const suit = pl.topStyle === 'traje';
  return { ...base, top, pants: suit ? new THREE.Color(top).multiplyScalar(.92).getHex() : bot, skirt: suit ? top : bot, legwear: f ? (pl.legwear || 'falda') : 'pantalon', topStyle: pl.topStyle || 'camisa', tie: bot, hair: f ? 'long' : 'short', shoes: 0xf2f2f0 };
}
let human = createHuman(playerOpts()); scene.add(human.root);
function rebuildPlayer() { const r = human.root.rotation.y, p = human.root.position.clone(); scene.remove(human.root); human = createHuman(playerOpts()); human.root.rotation.y = r; human.root.position.copy(p); scene.add(human.root); }
const P = { pos: new THREE.Vector3(), vy: 0, heading: 0, speed: 0, onGround: true, veh: null, land: 0 };
let state = 'loading';

/* =========================================================
   VEHÍCULOS
   ========================================================= */
const VEH = [];
function addVeh(kind, x, z, yaw = 0, color, extra = {}) {
  const v = { kind, K: KINDS[kind], x, z, y: groundAt(x, z).y, yaw, speed: 0, vy: 0, obj: null, color, fuel: 1, home: [x, z, yaw], pitch: 0, roll: 0, onGround: true, ...extra };
  v.id = kind + VEH.length; if (save.fuel[v.id] !== undefined) v.fuel = save.fuel[v.id];
  VEH.push(v); return v;
}
function spawnVehicles() {
  const rnd = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  for (const t of TOWNS) {
    const [px, pz] = t.spots.parking, list = ['moto', 'carro', 'caballo', 'bici', 'jeepeta', 'camioneta'];
    if (t.p.big) list.push('guagua'); if (!t.p.big || t.p.big === 1) list.push('burro');
    list.forEach((k, i) => addVeh(k, px - 24 + (i % 4) * 11, pz - 12 + Math.floor(i / 4) * 16, Math.PI, k === 'carro' || k === 'jeepeta' || k === 'camioneta' ? TRAFFIC_COLORS[Math.floor(rnd() * TRAFFIC_COLORS.length)] : undefined));
  }
  for (const a of world.airports) {
    addVeh('avion', a.plane.x, a.plane.z, a.yaw, undefined, { air: a });
    addVeh('heli', a.heli.x, a.heli.z, a.yaw, [0xc8202a, 0x1f4fa8, 0xf4f4f2][VEH.length % 3], { air: a });
  }
  for (const p of world.ports) { const v = addVeh('lancha', p.boat.x, p.boat.z, p.yaw + Math.PI / 2, [0xf4f4f2, 0xf5c518, 0xc8202a][VEH.length % 3], { port: p }); v.y = 0; }
  for (const line of LINES.rails) { const st = line.stops[0]; const v = addVeh('tren', 0, 0, 0, line.color, { line, s: st.s + 30, dir: 1, auto: 'wait', waitT: 6, stopIdx: 0 }); placeTrain(v); }
}
function vehMesh(v) {
  if (!v.obj) { v.obj = makeVehicle(v.kind, v.color); scene.add(v.obj); }
  return v.obj;
}
function placeTrain(v) {
  const p = linePos(v.line, v.s); v.x = p.x; v.z = p.z; v.y = p.y; v.yaw = v.dir > 0 ? p.yaw : p.yaw + Math.PI;
  if (!v.obj) return;
  const cars = v.obj.userData.cars, L = v.obj.userData.carLen;
  cars.forEach((c, i) => { const q = linePos(v.line, v.s - v.dir * i * L); c.position.set(q.x, q.y, q.z); c.rotation.set(0, v.dir > 0 ? q.yaw : q.yaw + Math.PI, 0); });
}
function syncVeh(v) {
  if (v.kind === 'tren') { placeTrain(v); return; }
  const o = v.obj; if (!o) return;
  o.position.set(v.x, v.y + (v.kind === 'lancha' ? Math.sin(performance.now() / 600 + v.x) * .12 : 0), v.z);
  o.rotation.set(0, 0, 0); o.rotateY(v.yaw); o.rotateX(-v.pitch); o.rotateZ(v.roll);
}

/* =========================================================
   CONTROLES
   ========================================================= */
const keys = {};
let takePressed = false, jumpPressed = false, runToggle = false;
addEventListener('keydown', e => {
  const tg = e.target && e.target.tagName; if (tg === 'INPUT') return;
  keys[e.code] = true;
  if (state === 'play') {
    if (e.code === 'KeyT' || e.code === 'Enter') takePressed = true;
    if (e.code === 'Space') { jumpPressed = true; e.preventDefault(); }
    if (e.code === 'KeyM') openMap(); if (e.code === 'KeyP' || e.code === 'Escape') pauseGame();
    if (e.code === 'KeyH' && P.veh) sound.honk(1, 0); if (e.code === 'KeyV') cycleCam();
    if (e.code === 'KeyC') toggleRun(); if (e.code === 'KeyF') toggleFull();
    if (e.code === 'KeyR' && P.veh && P.veh.fuel <= 0) askGallon();
  } else if (state === 'map' && (e.code === 'KeyM' || e.code === 'Escape')) closeMap();
  else if (state === 'pause' && (e.code === 'KeyP' || e.code === 'Escape')) resumeGame();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// cámara: arrastrar para girar, rueda para acercar
const cam = { yaw: 0, pitch: .22, dist: 7, drag: false, lx: 0, ly: 0, idle: 0, mode: 0 };
canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; cam.drag = true; cam.lx = e.clientX; cam.ly = e.clientY; });
addEventListener('pointerup', () => cam.drag = false);
addEventListener('pointermove', e => { if (!cam.drag) return; cam.yaw -= (e.clientX - cam.lx) * .006; cam.pitch = clamp(cam.pitch + (e.clientY - cam.ly) * .004, -.15, 1.25); cam.lx = e.clientX; cam.ly = e.clientY; cam.idle = 0; });
canvas.addEventListener('wheel', e => { cam.zoom = clamp((cam.zoom || 1) * (e.deltaY > 0 ? 1.12 : .89), .45, 3.5); }, { passive: true });
const CAMS = [1, .6, 1.8];
function cycleCam() { cam.mode = (cam.mode + 1) % CAMS.length; cam.zoom = CAMS[cam.mode]; toast(['🎥 Vista normal', '🎥 Vista cerca', '🎥 Vista lejos'][cam.mode], '#ffd34d', true); }
// toque: joystick + botones
const joy = { x: 0, y: 0, id: null };
const joyEl = $('joy'), knob = $('joyKnob');
function joyMove(cx, cy) { const r = joyEl.getBoundingClientRect(), R = r.width / 2; let dx = cx - (r.left + R), dy = cy - (r.top + R); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } joy.x = dx / R; joy.y = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; }
joyEl.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; joy.id = t.identifier; joyMove(t.clientX, t.clientY); }, { passive: false });
joyEl.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) joyMove(t.clientX, t.clientY); }, { passive: false });
const joyEnd = e => { for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
joyEl.addEventListener('touchend', joyEnd); joyEl.addEventListener('touchcancel', joyEnd);
let look = null;
canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; look = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (look && t.identifier === look.id) { cam.yaw -= (t.clientX - look.x) * .008; cam.pitch = clamp(cam.pitch + (t.clientY - look.y) * .005, -.15, 1.25); look.x = t.clientX; look.y = t.clientY; cam.idle = 0; } }, { passive: true });
canvas.addEventListener('touchend', () => look = null);
const hold = (id, code) => { const b = $(id); const on = e => { e.preventDefault(); sound.unlock(); keys[code] = true; b.classList.add('on'); }; const off = () => { keys[code] = false; b.classList.remove('on'); }; b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off); b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off); };
const tap = (id, fn) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); sound.unlock(); fn(); }, { passive: false }); b.addEventListener('click', fn); };
hold('tGas', 'KeyW'); hold('tUp', 'KeyE'); hold('tDown', 'KeyQ'); hold('tBrake', 'ShiftLeft');
tap('tTake', () => takePressed = true); tap('tJump', () => jumpPressed = true); tap('tHonk', () => sound.honk(1, 0)); tap('tRun', () => toggleRun());
function toggleRun() { runToggle = !runToggle; $('tRun').classList.toggle('active', runToggle); toast(runToggle ? '🏃 Correr' : '🚶 Caminar', '#ffd34d', true); }
function input() {
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz += 1; if (keys.KeyS || keys.ArrowDown) fz -= 1;
  if (keys.KeyA || keys.ArrowLeft) fx -= 1; if (keys.KeyD || keys.ArrowRight) fx += 1;
  if (joy.id !== null) { fx += joy.x; fz += joy.y; }
  return { fx: clamp(fx, -1, 1), fz: clamp(fz, -1, 1), up: !!(keys.KeyE || keys.Space && P.veh && P.veh.K.air), down: !!(keys.KeyQ || (keys.ShiftLeft || keys.ShiftRight) && P.veh && P.veh.K.air), run: runToggle || keys.ShiftLeft || keys.ShiftRight, brake: !!(keys.Space || keys.ShiftLeft) };
}

/* =========================================================
   MISIONES
   ========================================================= */
const CHAR = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));
const destOf = id => { const p = PROV[id]; if (p) return { x: p.px ?? p.x, z: p.pz ?? p.z, name: p.name, full: 'provincia ' + p.name, r: 230, prov: true }; const pl = PLACES.find(q => q.id === id); return { x: pl.x, z: pl.z, name: pl.name, full: pl.name, r: 260, place: pl }; };
let M = null; // misión actual: { m, def, pick:{x,z,prov}, dest, phase:'pick'|'ride', time, total, late }
let waiting = null, passenger = null;
const PAX = { pos: new THREE.Vector3(), heading: 0, speed: 0 };
function nearestProvinces(x, z) { return PROVINCES.slice().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)); }
function missionOffers() {
  const all = MISSIONS.filter(m => CHAR[m.who]);
  const fresh = all.filter(m => !save.done[m.who]); const pool = (fresh.length >= 3 ? fresh : all).slice().sort(() => Math.random() - .5);
  const near = nearestProvinces(P.pos.x, P.pos.z);
  const out = [];
  for (const m of pool) {
    const d = destOf(m.dest);
    const pick = near.slice(0, 7).find(p => Math.hypot(p.x - d.x, p.z - d.z) > 9000 && !(d.place && d.place.prov === p.id) && p.id !== m.dest) || near.find(p => Math.hypot(p.x - d.x, p.z - d.z) > 9000);
    if (!pick) continue;
    const dist = Math.hypot(pick.x - d.x, pick.z - d.z);
    out.push({ m, def: CHAR[m.who], pick, dest: d, dist, time: Math.round(dist / 24 + 150) });
    if (out.length === 3) break;
  }
  return out.sort((a, b) => a.dist - b.dist);
}
function startMission(o) {
  clearMission(true);
  M = { m: o.m, def: o.def, pick: { x: o.pick.px + 14, z: o.pick.pz + 22, prov: o.pick }, dest: o.dest, phase: 'pick', time: o.time, total: o.time, late: false, talk: 0, line: 0 };
  spawnWaiting();
  save.mission = { who: o.m.who, dest: o.m.dest, pick: o.pick.id, time: o.time, phase: 'pick' }; persist();
  toast(`📍 Recoge a ${o.def.name} en ${o.pick.name}`, '#ffd34d');
  updMissionHUD();
}
function resumeMission() {
  const s = save.mission; if (!s) return;
  const m = MISSIONS.find(q => q.who === s.who && q.dest === s.dest), p = PROV[s.pick]; if (!m || !p || !CHAR[m.who]) { save.mission = null; return; }
  const d = destOf(m.dest), dist = Math.hypot(p.x - d.x, p.z - d.z), total = Math.round(dist / 24 + 150);
  M = { m, def: CHAR[m.who], pick: { x: p.px + 14, z: p.pz + 22, prov: p }, dest: d, phase: 'pick', time: s.time ?? total, total, late: !!s.late, talk: 0, line: 0 };
  if (s.phase === 'ride') { M.phase = 'ride'; boardPassengerNow(); } else spawnWaiting();
  updMissionHUD();
}
function spawnWaiting() {
  if (waiting) scene.remove(waiting);
  const def = M.def, g = new THREE.Group(); const fig = createCharacter(def); g.add(fig);
  const tag = nameSprite(def.name.split(' (')[0], def.kind); tag.position.y = 2.35 * (def.scale || 1) + .2; tag.scale.multiplyScalar(1.4); g.add(tag);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 400, 16, 1, true).translate(0, 200, 0), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; g.add(ring);
  g.position.set(M.pick.x, groundAt(M.pick.x, M.pick.z).y, M.pick.z); g.rotation.y = Math.atan2(M.pick.prov.px - M.pick.x, M.pick.prov.pz - M.pick.z);
  waiting = g; scene.add(g);
}
let destMark = null;
function showDestMark(on) {
  if (destMark) { scene.remove(destMark); destMark = null; }
  if (!on || !M) return;
  const g = new THREE.Group(), d = M.dest;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 900, 20, 1, true).translate(0, 450, 0), new THREE.MeshBasicMaterial({ color: 0x5fe08a, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(d.r - 6, d.r, 64), new THREE.MeshBasicMaterial({ color: 0x5fe08a, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2; g.add(ring);
  const lab = label('🏁 ' + d.name, 'Destino', { color: '#7ef0a4', scale: 2 }); lab.position.y = 120; g.add(lab);
  g.position.set(d.x, Math.max(0, heightAt(d.x, d.z)), d.z); destMark = g; scene.add(g);
}
function boardPassengerNow() {
  if (waiting) { scene.remove(waiting); waiting = null; }
  const def = M.def;
  passenger = createHuman(Object.assign({ detail: .75, outfit: 'robe', hair: 'short', gender: def.gender || 'm', skin: [0xa8714f, 0xb98260, 0x9a6444, 0xc08a66][def.id.length % 4], eye: 0x3a2414 }, def.look));
  if (def.scale) passenger.root.scale.setScalar(def.scale);
  scene.add(passenger.root);
  PAX.pos.copy(P.pos).add(new THREE.Vector3(1.5, 0, -1.5));
  M.phase = 'ride'; showDestMark(true); M.talk = 6; M.line = 0;
  save.mission.phase = 'ride'; persist();
}
function pickUp() {
  sound.talk(); boardPassengerNow();
  const def = M.def, first = def.name.split(' (')[0];
  openTalk({ kind: def.kind, name: def.name, msg: `¡Shalom! Soy ${first} y ${M.m.why} ¿Me llevas a ${M.dest.full}?`, ref: `Tiempo: ${fmtT(M.time)} · Distancia: ${fmtKm(Math.hypot(M.dest.x - P.pos.x, M.dest.z - P.pos.z))} en línea recta · Tesoro: ${def.emoji || '🎁'} ${def.gift}`, btn: '🚀 ¡Vamos!', onOk: () => { closeTalk(); sound.say(`¡Gracias! Vamos a ${M.dest.name}.`, { male: def.gender !== 'f' }); } });
  sound.say(`¡Hola! Soy ${first}. ¿Me llevas a ${M.dest.name}?`, { male: def.gender !== 'f' });
}
function arrive() {
  const def = M.def, ontime = !M.late, frac = M.time / M.total;
  const st = ontime ? (frac > .4 ? 3 : frac > .15 ? 2 : 1) : 0;
  save.deliveries++; save.stars += st;
  save.done[def.id] = Math.max(save.done[def.id] || 0, st);
  if (ontime && !save.gifts.includes(def.id)) save.gifts.push(def.id);
  save.mission = null; persist(); sound.cash(); sound.win();
  const msg = def.msg;
  openTalk({ kind: def.kind, name: def.name, msg, ref: def.ref, gift: ontime ? `💎 Tesoro bíblico: ${def.emoji || '🎁'} ${def.gift}` : '⏰ Llegaste tarde: esta vez no hay tesoro, ¡pero gracias por traerme!', btn: ontime ? '💎 Tomar el tesoro' : 'Continuar', onOk: () => { closeTalk(); sound.gift && sound.gift(); openVerse(() => showResult(st, ontime)); } });
  sound.say(ontime ? `¡Llegamos a ${M.dest.name}! Gracias, que Dios te bendiga.` : `Llegamos. Gracias por traerme hasta ${M.dest.name}.`, { male: def.gender !== 'f' });
  // el pasajero se baja y se queda en el destino
  dropPassenger(true);
  showDestMark(false); updMissionHUD();
}
function dropPassenger(stay) { if (passenger) { if (!stay) scene.remove(passenger.root); else { const pr = passenger.root; setTimeout(() => scene.remove(pr), 12000); } passenger = null; } }
function clearMission(silent) { if (waiting) { scene.remove(waiting); waiting = null; } dropPassenger(false); showDestMark(false); M = null; if (!silent) { save.mission = null; persist(); } updMissionHUD(); $('subs').classList.remove('show'); }
function showResult(st, got) {
  state = 'result'; $('resStars').textContent = st ? '★'.repeat(st) + '☆'.repeat(3 - st) : '⏰';
  $('resTitle').textContent = st ? '¡Entrega completada!' : 'Entrega tarde';
  $('resText').innerHTML = `Llevaste a <b>${M.def.name}</b> a <b>${M.dest.name}</b>.<br>${got ? `💎 Tesoro: <b>${M.def.emoji || '🎁'} ${M.def.gift}</b><br>` : ''}Tesoros: <b>${save.gifts.length}</b> de ${MISSIONS.length} · Entregas: ${save.deliveries}`;
  M = null; updMissionHUD(); show('result');
}
// conversación durante el viaje: el personaje cuenta su historia (voz de hombre o de mujer)
const CHAT = ['¿Sabías que en esta tierra hay muchas iglesias que alaban a Dios?', '¡Qué bonita es la República Dominicana!', 'Maneja con cuidado, que el SEÑOR nos guarda.', 'Mira esas montañas: «Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro?».', '¿Ya echaste combustible? No nos vayamos a quedar en el camino.'];
function rideTalk(dt) {
  if (!M || M.phase !== 'ride' || !passenger) return;
  M.talk -= dt; if (M.talk > 0) return;
  const parts = (M.def.msg.match(/[^.!?]+[.!?»]+/g) || [M.def.msg]).map(s => s.trim());
  let txt;
  if (M.line < parts.length) txt = parts[M.line];
  else txt = CHAT[(M.line - parts.length) % CHAT.length];
  M.line++; M.talk = M.line <= parts.length ? 9 + txt.length * .05 : 45;
  subtitle(M.def.name.split(' (')[0], txt); lastNarr = clockT;
  sound.say(txt, { male: M.def.gender !== 'f', rate: .95 });
}
function subtitle(who, txt) { $('subWho').textContent = who; $('subTxt').textContent = txt; $('subs').classList.add('show'); clearTimeout(subtitle.h); subtitle.h = setTimeout(() => $('subs').classList.remove('show'), 4000 + txt.length * 55); }

/* ---------- Monedas de fe (versículos) a lo largo de las carreteras ---------- */
const COINS = []; const coinPool = [];
function buildCoins() {
  let k = 0;
  for (const r of LINES.roads) { const L = r.cum[r.cum.length - 1]; for (let s = 900; s < L; s += 2600) { const p = linePos(r, s); COINS.push({ x: p.x + Math.cos(p.yaw) * (k % 2 ? 2.5 : -2.5), z: p.z - Math.sin(p.yaw) * (k % 2 ? 2.5 : -2.5), y: p.y + 1.6, t: 0 }); k++; } }
  const geo = new THREE.CylinderGeometry(.9, .9, .16, 28).rotateX(Math.PI / 2), mat = new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: .9, roughness: .25, emissive: 0x6a4400, emissiveIntensity: .6 });
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; scene.add(m); coinPool.push(m); }
}
let coinT = 0, nearCoins = [];
function updateCoins(dt, t) {
  if ((coinT -= dt) <= 0) { coinT = .5; const now = Date.now(); nearCoins = COINS.filter(c => now > c.t && Math.abs(c.x - P.pos.x) < 1600 && Math.abs(c.z - P.pos.z) < 1600).sort((a, b) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z)).slice(0, coinPool.length); }
  coinPool.forEach((m, i) => { const c = nearCoins[i]; m.visible = !!c; if (c) { m.position.set(c.x, c.y + Math.sin(t * 2 + i) * .25, c.z); m.rotation.y = t * 2 + i; } });
  const R = P.veh ? 4.5 : 2.2;
  for (const c of nearCoins) if (Date.now() > c.t && Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < R && Math.abs(c.y - P.pos.y - 1.2) < 5) {
    c.t = Date.now() + 8 * 60 * 1000; coinT = 0; sound.coin();
    if (M && M.phase === 'ride') { M.time += 30; toast('🪙 Moneda de fe · +30 s', '#ffd34d'); } else toast('🪙 Moneda de fe', '#ffd34d');
    openVerse(); break;
  }
}

/* =========================================================
   FÍSICA: A PIE
   ========================================================= */
const BX0 = BOUNDS.x0 + 2000, BX1 = BOUNDS.x1 - 2000, BZ0 = BOUNDS.z0 + 2000, BZ1 = BOUNDS.z1 - 2000;
function blocked(x, z, air) {
  if (x < BX0 || x > BX1 || z < BZ0 || z > BZ1) return 'limite';
  if (inHaiti(x, z)) return 'haiti';
  return null;
}
let blockMsgT = 0;
function blockMsg(b) { if (performance.now() - blockMsgT < 2500) return; blockMsgT = performance.now(); toast(b === 'haiti' ? '🛂 Frontera con Haití: no se puede cruzar' : '🌊 Hasta aquí llega el mapa', '#ffb36b'); sound.hurt(); }
function walk(dt) {
  const I = input(), run = I.run;
  const target = Math.hypot(I.fx, I.fz) > .1 ? (run ? 8.5 : 4.6) * Math.min(1, Math.hypot(I.fx, I.fz)) : 0;
  P.speed = lerp(P.speed, target, Math.min(1, dt * 8));
  if (target > 0) { const a = cam.yaw - Math.atan2(I.fx, I.fz); let d = a - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); P.heading += d * Math.min(1, dt * 10); }
  const nx = P.pos.x + Math.sin(P.heading) * P.speed * dt, nz = P.pos.z + Math.cos(P.heading) * P.speed * dt;
  const b = blocked(nx, nz), g = groundAt(nx, nz);
  if (b) { blockMsg(b); P.speed = 0; }
  else if (g.y < -.9 && !g.road) { if (performance.now() - blockMsgT > 2500) { blockMsgT = performance.now(); toast('🌊 El agua es profunda: usa una lancha ⚓', '#9fd8ff'); } P.speed = 0; }
  else { P.pos.x = nx; P.pos.z = nz; }
  if (jumpPressed && P.onGround) { P.vy = 6; P.onGround = false; sound.jump(); }
  jumpPressed = false;
  P.vy -= 20 * dt; P.pos.y += P.vy * dt;
  const fy = Math.max(groundAt(P.pos.x, P.pos.z).y, -.9);
  if (P.pos.y <= fy) { if (!P.onGround && P.vy < -6) sound.step('hard', true); P.pos.y = fy; P.vy = 0; P.onGround = true; }
  else if (P.pos.y - fy > .3) P.onGround = false;
  if (P.onGround && P.speed > 1) { P.stepT = (P.stepT || 0) - dt * P.speed; if (P.stepT <= 0) { P.stepT = 1.6; sound.step(groundAt(P.pos.x, P.pos.z).road ? 'hard' : 'grass', run); } }
  human.root.position.copy(P.pos); human.root.rotation.set(0, P.heading, 0); human.root.visible = true;
  animateHuman(human, dt, { speed: P.speed, onGround: P.onGround, vy: P.vy, land: 0, t: clockT });
}

/* =========================================================
   FÍSICA: VEHÍCULOS
   ========================================================= */
let fuelMsgT = 0;
function drive(dt) {
  const v = P.veh, K = v.K, I = input();
  const hasFuel = !K.engine || K.rail || v.fuel > 0;
  if (!hasFuel && performance.now() - fuelMsgT > 4000) { fuelMsgT = performance.now(); toast('⛽ ¡Sin combustible! Busca una bomba o pide un galón (R)', '#ff6b6b'); $('btnGallon').classList.remove('hidden'); }
  const thr = hasFuel ? I.fz : Math.min(0, I.fz) * 0;
  if (K.rail) return driveTrain(v, dt, I);
  if (K.air) return driveAir(v, dt, I, hasFuel);
  // ---- tierra y agua ----
  const g0 = groundAt(v.x, v.z);
  const top = K.max * (K.water ? 1 : (g0.road ? (g0.main ? 1 : .85) : K.off));
  if (thr > 0) v.speed += K.acc * thr * dt * (v.speed < 0 ? 2.5 : 1);
  else if (thr < 0) v.speed += K.acc * thr * dt * (v.speed > 0 ? 2.2 : .6);
  else v.speed *= Math.pow(K.water ? .7 : .55, dt);
  if (I.brake && !K.water) v.speed *= Math.pow(.15, dt);
  v.speed = clamp(v.speed, -top * .35, top);
  if (Math.abs(v.speed) > top) v.speed = lerp(v.speed, Math.sign(v.speed) * top, dt * 2);
  const steer = -I.fx * K.turn * clamp(Math.abs(v.speed) / 6, 0, 1) * (1 - clamp(Math.abs(v.speed) / (K.max * 1.6), 0, .5));
  v.yaw += steer * Math.sign(v.speed || 1) * dt;
  v.roll = lerp(v.roll, (v.kind === 'moto' || v.kind === 'bici') ? -steer * .35 : K.water ? -steer * .12 : 0, dt * 5);
  const nx = v.x + Math.sin(v.yaw) * v.speed * dt, nz = v.z + Math.cos(v.yaw) * v.speed * dt;
  const b = blocked(nx, nz);
  if (b) { blockMsg(b); v.speed = 0; }
  else if (K.water) {
    if (H0(nx, nz) > -1.2) { v.speed *= -.2; if (performance.now() - blockMsgT > 2500) { blockMsgT = performance.now(); toast('⚓ Llegaste a la orilla: pulsa T para bajarte', '#9fd8ff'); } }
    else { v.x = nx; v.z = nz; }
    v.y = 0; v.pitch = lerp(v.pitch, clamp(v.speed / K.max, 0, 1) * .08, dt * 3);
  } else {
    const g = groundAt(nx, nz);
    if (g.y < .2 && !g.road) { v.speed = 0; if (performance.now() - blockMsgT > 2500) { blockMsgT = performance.now(); toast('🌊 Agua: aquí necesitas una lancha', '#9fd8ff'); } }
    else {
      // cuesta arriba se va más lento
      const slope = (g.y - g0.y) / Math.max(.01, Math.hypot(nx - v.x, nz - v.z));
      if (slope > .35 && v.speed > 0) v.speed *= Math.pow(.5, dt * slope * 3);
      v.x = nx; v.z = nz;
      const fwd = groundAt(v.x + Math.sin(v.yaw) * 1.6, v.z + Math.cos(v.yaw) * 1.6).y, back = groundAt(v.x - Math.sin(v.yaw) * 1.6, v.z - Math.cos(v.yaw) * 1.6).y;
      v.pitch = lerp(v.pitch, Math.atan2(fwd - back, 3.2), dt * 8);
      v.y = lerp(v.y, g.y, Math.min(1, dt * 14));
      if (Math.abs(g.y - v.y) > 3) v.y = g.y;
    }
  }
  if (K.engine && Math.abs(v.speed) > .5) useFuel(v, Math.abs(v.speed) * dt);
  if (K.engine) sound.engine(v.kind, .6 + Math.abs(v.speed) / K.max * .4, Math.abs(v.speed) / K.max);
  if (K.animal && Math.abs(v.speed) > 2) { v.hoofT = (v.hoofT || 0) - dt * Math.abs(v.speed); if (v.hoofT <= 0) { v.hoofT = 3.2; sound.hoof(); } }
}
function driveAir(v, dt, I, hasFuel) {
  const K = v.K, u = vehMesh(v).userData; u.engineOn = hasFuel;
  const g = groundAt(v.x, v.z), floor = Math.max(g.y, 0) + (v.kind === 'avion' ? 0 : 0);
  if (v.kind === 'heli') {
    const target = hasFuel ? I.fz * K.max : 0;
    v.speed = lerp(v.speed, target, dt * (Math.abs(target) > Math.abs(v.speed) ? .6 : .9));
    v.vy = lerp(v.vy, hasFuel ? ((I.up ? 1 : 0) - (I.down ? 1 : 0)) * 16 : -8, dt * 2.5);
    if (!v.onGround || I.up) { v.y += v.vy * dt; }
    v.yaw -= I.fx * K.turn * dt;
    v.pitch = lerp(v.pitch, -v.speed / K.max * .25, dt * 3); v.roll = lerp(v.roll, -I.fx * .2, dt * 3);
    if (v.y <= floor) { v.y = floor; if (v.vy < 0) v.vy = 0; v.onGround = true; v.speed *= Math.pow(.2, dt); } else v.onGround = false;
    if (v.y > 2200) v.y = 2200;
  } else {
    // avión: acelera en la pista; con velocidad suficiente sube (E / ▲) o baja (Q / ▼)
    const thr = hasFuel ? I.fz : -.4;
    v.throttle = clamp((v.throttle || 0) + thr * dt * .5, 0, 1);
    if (v.onGround && I.fz < 0) v.speed = Math.max(0, v.speed - 14 * dt);
    const target = v.throttle * K.max;
    v.speed = lerp(v.speed, target, dt * (target > v.speed ? .18 : .1));
    const canFly = v.speed > K.takeoff;
    if (canFly) v.vy = lerp(v.vy, ((I.up ? 1 : 0) - (I.down ? 1.2 : 0)) * 22, dt * 1.5);
    else if (!v.onGround) v.vy = lerp(v.vy, -14, dt * .8);
    else v.vy = 0;
    v.y += v.vy * dt;
    const turn = I.fx * K.turn * (v.onGround ? clamp(v.speed / 10, 0, 1) * 1.6 : 1);
    v.yaw -= turn * dt;
    v.roll = lerp(v.roll, v.onGround ? 0 : -I.fx * .55, dt * 2.5);
    v.pitch = lerp(v.pitch, v.onGround ? 0 : clamp(v.vy / 40, -.35, .35), dt * 3);
    if (v.y <= floor) {
      if (!v.onGround && v.vy < -12) { toast('💥 ¡Aterrizaje brusco!', '#ffb36b'); sound.hurt(); v.speed *= .3; }
      v.y = floor; v.vy = Math.max(0, v.vy); v.onGround = true;
    } else if (v.y > floor + .5) v.onGround = false;
    if (v.y > 3000) v.y = 3000;
  }
  const nx = v.x + Math.sin(v.yaw) * v.speed * dt, nz = v.z + Math.cos(v.yaw) * v.speed * dt, b = blocked(nx, nz, true);
  if (b) { blockMsg(b); v.yaw += Math.PI * .5 * dt; v.speed *= .98; } else { v.x = nx; v.z = nz; }
  if (hasFuel) useFuel(v, (Math.abs(v.speed) + (v.kind === 'heli' && !v.onGround ? 30 : 3)) * dt);
  sound.engine(v.kind, hasFuel ? .7 + v.speed / K.max * .3 : 0, v.kind === 'heli' ? .4 + v.speed / K.max * .5 : v.speed / K.max);
}
function driveTrain(v, dt, I) {
  const K = v.K;
  if (I.fz > 0) v.speed += K.acc * I.fz * dt; else if (I.fz < 0) v.speed += K.acc * 1.6 * I.fz * dt; else v.speed *= Math.pow(.92, dt);
  v.speed = clamp(v.speed, -12, K.max);
  v.s += v.speed * dt * v.dir;
  if (v.s < 20 || v.s > v.line.len - 20) { v.s = clamp(v.s, 20, v.line.len - 20); v.speed = 0; toast('🚆 Fin de la línea: cambia de sentido con ⬇', '#ffd34d'); v.dir *= -1; }
  placeTrain(v);
  sound.engine('tren', .7 + Math.abs(v.speed) / K.max * .3, Math.abs(v.speed) / K.max);
}
const TANK = { moto: 60000, carro: 90000, jeepeta: 80000, camioneta: 85000, guagua: 85000, lancha: 45000, avion: 320000, heli: 140000 };
function useFuel(v, dist) { const T = TANK[v.kind]; if (!T) return; v.fuel = Math.max(0, v.fuel - dist / T); if (v.fuel < .15 && !v.lowWarn) { v.lowWarn = true; toast('⛽ Queda poco combustible', '#ffb36b'); sound.bell(); } }
function askGallon() {
  const v = P.veh; if (!v || !TANK[v.kind]) return;
  if (askGallon.busy) return; askGallon.busy = true; toast('⛽ Pediste un galón… llega en unos segundos', '#ffd34d');
  setTimeout(() => { askGallon.busy = false; v.fuel = Math.min(1, v.fuel + .12); v.lowWarn = false; $('btnGallon').classList.add('hidden'); toast('⛽ ¡Llegó el galón de emergencia! Busca una bomba', '#7ef0a4'); sound.bell(); persist(); }, 6000);
}

/* ---------- Subir y bajar ---------- */
function nearestVehicle() {
  let best = null, bd = 1e9;
  for (const v of VEH) {
    if (v === P.veh) continue;
    let d;
    if (v.kind === 'tren') { if (!v.obj) continue; d = 1e9; for (const c of v.obj.userData.cars) d = Math.min(d, Math.hypot(c.position.x - P.pos.x, c.position.z - P.pos.z)); d -= 4; if (Math.abs(v.speed) > 1 && v.auto !== 'wait') continue; }
    else d = Math.hypot(v.x - P.pos.x, v.z - P.pos.z) - ({ avion: 9, guagua: 4.5, heli: 4, lancha: 3, carro: 2, jeepeta: 2.2, camioneta: 2.4 }[v.kind] || 1);
    if (d < bd) { bd = d; best = v; }
  }
  return bd < 3.2 ? best : null;
}
function enter(v) {
  P.veh = v; v.auto = null; vehMesh(v);
  if (v.kind === 'tren') v.speed = 0;
  P.speed = 0; cam.yaw = 0; cam.idle = 99;
  if (passenger) { const d = PAX.pos.distanceTo(P.pos); if (d > 60) toast(`⏳ ${M.def.name.split(' (')[0]} viene corriendo…`, '#ffd34d'); }
  driveUI(true); sound.carStart && v.K.engine && sound.carStart();
  if (v.kind === 'tren') { sound.whistle(); toast(`🚆 ¡Manejas el ${v.line.name}! ⬆ avanzar · ⬇ frenar o reversa`, '#7ef0a4'); }
  else if (v.K.air) toast(v.kind === 'avion' ? '✈️ ⬆ acelerar · cuando vayas rápido: E/▲ subir, Q/▼ bajar · T bajarse en tierra' : '🚁 E/▲ subir · Q/▼ bajar · ⬆ avanzar', '#7ef0a4');
  else toast(`${v.K.emoji} ¡Vas en ${v.K.name}! · T para bajarte`, '#7ef0a4');
}
function exitVeh() {
  const v = P.veh;
  if ((v.K.air && (!v.onGround || v.speed > 5)) || (v.kind === 'tren' && Math.abs(v.speed) > 1)) { toast(v.K.air ? '✋ Aterriza y detente primero' : '✋ Detén el tren primero', '#ffb36b'); return; }
  let ex, ez;
  if (v.kind === 'lancha') {
    let found = null; for (let r = 4; r < 60 && !found; r += 4) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; if (groundAt(x, z).y > .4) { found = [x, z]; break; } }
    if (!found) { toast('⚓ Acércate a la orilla para bajarte', '#9fd8ff'); return; }
    [ex, ez] = found;
  } else if (v.kind === 'tren') { const c = v.obj.userData.cars[0], s = Math.sin(c.rotation.y), co = Math.cos(c.rotation.y); ex = c.position.x + co * 6; ez = c.position.z - s * 6; v.auto = 'resume'; v.waitT = 15; }
  else { const side = { avion: 10, guagua: 3, heli: 4.5 }[v.kind] || 2.2; ex = v.x + Math.cos(v.yaw) * side; ez = v.z - Math.sin(v.yaw) * side; }
  P.pos.set(ex, groundAt(ex, ez).y, ez); P.heading = v.yaw; P.vy = 0; P.onGround = true;
  if (v.kind !== 'tren') v.speed = 0; if (v.obj) v.obj.userData.engineOn = false;
  P.veh = null; sound.engineOff(); driveUI(false); $('btnGallon').classList.add('hidden');
  if (passenger) PAX.pos.set(ex + 1.5, P.pos.y, ez + 1.5);
  save.fuel[v.id] = +v.fuel.toFixed(3); persist();
}
function driveUI(on) {
  document.body.classList.toggle('driving', on); const air = on && P.veh && P.veh.K.air;
  $('tUp').classList.toggle('hidden', !air); $('tDown').classList.toggle('hidden', !air);
  $('tHonk').classList.toggle('hidden', !on || air); $('tJump').classList.toggle('hidden', on); $('tRun').classList.toggle('hidden', on); $('tBrake').classList.toggle('hidden', !on || air);
  $('gauges').classList.toggle('hidden', !on);
  $('tGas').classList.toggle('hidden', !on); $('tTakeLbl').textContent = on ? 'TOMAR / BAJAR' : 'SUBIR / TOMAR';
}

/* ---------- Tráfico, trenes y aviones automáticos ---------- */
const TRAFFIC = [];
function updateTraffic(dt) {
  // carros decorativos cerca del jugador (muchos más en Santo Domingo y en las ciudades grandes)
  const dSD = Math.min(Math.hypot(P.pos.x - PROV.dn.px, P.pos.z - PROV.dn.pz), Math.hypot(P.pos.x - PROV.sdo.px, P.pos.z - PROV.sdo.pz));
  const bigNear = TOWNS.find(t => t.p.big && Math.hypot(P.pos.x - t.p.px, P.pos.z - t.p.pz) < t.R * 1.3);
  const want = (dSD < 4500 ? 30 : bigNear ? 18 : 10) * (isTouch ? .5 : 1);
  for (const c of TRAFFIC) {
    c.s += c.dir * c.spd * dt; const L = c.line.cum[c.line.cum.length - 1];
    if (c.line.loop) c.s = ((c.s % L) + L) % L;
    else if (c.s < 0 || c.s > L) { c.dir *= -1; c.s = clamp(c.s, 0, L); }
    const p = linePos(c.line, c.s), side = c.line.loop ? -1 : c.dir > 0 ? 1 : -1, off = (c.line.loop ? 2.2 * c.dir : c.line.w * .22) * side;
    c.obj.position.set(p.x + Math.cos(p.yaw) * off, p.y + .2, p.z - Math.sin(p.yaw) * off);
    c.obj.rotation.set(0, c.dir > 0 ? p.yaw : p.yaw + Math.PI, 0);
    animateVehicle(c.obj, dt, c.spd, clockT);
    // choque con el jugador
    const pv = P.veh;
    if (pv && pv.K.ground && Math.hypot(c.obj.position.x - pv.x, c.obj.position.z - pv.z) < 3.4 && (!c.hitT || clockT - c.hitT > 2)) { c.hitT = clockT; pv.speed *= -.3; sound.hurt(); sound.honk(1, 0); toast('💥 ¡Choque! Maneja con cuidado', '#ffb36b'); }
    if (!pv && Math.hypot(c.obj.position.x - P.pos.x, c.obj.position.z - P.pos.z) < 2.6 && (!c.hitT || clockT - c.hitT > 2)) { c.hitT = clockT; sound.honk(1, 0); P.pos.x += (P.pos.x - c.obj.position.x) * .8; P.pos.z += (P.pos.z - c.obj.position.z) * .8; toast('📯 ¡Cuidado con los carros!', '#ffb36b'); }
  }
  if ((updateTraffic.t = (updateTraffic.t || 0) - dt) > 0) return; updateTraffic.t = 1;
  for (let i = TRAFFIC.length - 1; i >= 0; i--) { const c = TRAFFIC[i]; if (c.obj.position.distanceTo(P.pos) > 2600) { scene.remove(c.obj); TRAFFIC.splice(i, 1); } }
  for (let tries = 0; tries < 3 && TRAFFIC.length < want; tries++) {
    let line = null, s = 0;
    const loopsNear = CITY_LOOPS.filter(l => Math.hypot(l.town.p.px - P.pos.x, l.town.p.pz - P.pos.z) < 2200);
    if (loopsNear.length && Math.random() < .55) { line = loopsNear[Math.floor(Math.random() * loopsNear.length)]; s = Math.random() * line.cum[line.cum.length - 1]; }
    else { const r = nearRoad(P.pos.x + (Math.random() - .5) * 2400, P.pos.z + (Math.random() - .5) * 2400, 1500); if (r && r.kind === 'road') { line = LINES.roads[r.s.line]; s = line.cum[r.s.i] + (Math.random() - .5) * 200; } }
    if (!line) continue;
    const q = linePos(line, s); if (Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < 120) continue;
    const kinds = ['carro', 'camioneta', 'jeepeta', 'moto', 'moto', 'guagua', 'carro', 'jeepeta'], k = kinds[Math.floor(Math.random() * kinds.length)];
    const obj = makeVehicle(k, TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]);
    if (k === 'moto' || k === 'guagua') bakeInPlace(obj, obj.userData.wheels);
    obj.traverse(o => { if (o.isMesh) o.castShadow = false; });
    scene.add(obj);
    TRAFFIC.push({ obj, line, s, dir: Math.random() < .5 ? 1 : -1, spd: line.loop ? 7 + Math.random() * 5 : KINDS[k].max * (.45 + Math.random() * .3) });
  }
}
function updateTrains(dt) {
  for (const v of VEH) {
    if (v.kind !== 'tren' || v === P.veh) continue;
    if (v.auto === 'wait' || v.auto === 'resume') { v.waitT -= dt; v.speed = 0; if (v.waitT <= 0) v.auto = 'run'; }
    else if (v.auto === 'run') {
      // próxima estación en el sentido de marcha
      const stops = v.line.stops.map(s => s.s), next = v.dir > 0 ? stops.find(s => s > v.s + 5) : stops.slice().reverse().find(s => s < v.s - 5);
      const tgt = next ?? (v.dir > 0 ? v.line.len - 25 : 25), d = Math.abs(tgt - v.s);
      const want = d < 300 ? Math.max(3, d / 300 * v.K.max * .8) : v.K.max * .8;
      v.speed = lerp(v.speed, want, dt * .3); v.s += v.speed * dt * v.dir;
      if (d < 4) { v.auto = 'wait'; v.waitT = 14; v.speed = 0; if (next === undefined) v.dir *= -1; const dd = Math.hypot(v.x - P.pos.x, v.z - P.pos.z); if (dd < 800) sound.whistle(); }
    }
    const near = Math.hypot(v.x - P.pos.x, v.z - P.pos.z) < 3500;
    if (near && !v.obj) vehMesh(v); if (v.obj) { v.obj.visible = near; if (near) animateVehicle(v.obj, dt, v.speed, clockT); }
    placeTrain(v);
  }
}
const SKYPLANES = [];
function updateSkyPlanes(dt) {
  if (!SKYPLANES.length && world) for (let i = 0; i < 3; i++) { const o = makeVehicle('avion', [0xf4f6f8, 0xe8eef4, 0xffffff][i]); o.scale.setScalar(1); scene.add(o); SKYPLANES.push({ o, a: world.airports[i], b: world.airports[(i + 3) % world.airports.length], t: Math.random() }); }
  for (const p of SKYPLANES) {
    const L = Math.hypot(p.b.a.x - p.a.a.x, p.b.a.z - p.a.a.z); p.t += dt * 130 / L;
    if (p.t >= 1) { p.t = 0; p.a = p.b; p.b = world.airports[Math.floor(Math.random() * world.airports.length)]; if (p.b === p.a) p.b = world.airports[(world.airports.indexOf(p.a) + 1) % world.airports.length]; }
    const x = lerp(p.a.a.x, p.b.a.x, p.t), z = lerp(p.a.a.z, p.b.a.z, p.t), alt = 300 + Math.sin(p.t * Math.PI) * 900;
    p.o.position.set(x, alt, z); p.o.rotation.set(0, Math.atan2(p.b.a.x - p.a.a.x, p.b.a.z - p.a.a.z), 0);
    p.o.visible = Math.hypot(x - P.pos.x, z - P.pos.z) < 20000; animateVehicle(p.o, dt, 100, clockT);
  }
}
// vehículos estacionados: crear el modelo solo cuando el jugador está cerca
let vehT = 0;
function updateParked(dt) {
  if ((vehT -= dt) > 0) return; vehT = .5;
  for (const v of VEH) {
    if (v.kind === 'tren' || v === P.veh) continue;
    const d = Math.hypot(v.x - P.pos.x, v.z - P.pos.z);
    if (d < 1800 && !v.obj) { vehMesh(v); v.y = v.kind === 'lancha' ? 0 : groundAt(v.x, v.z).y; syncVeh(v); }
    else if (d > 2600 && v.obj) { scene.remove(v.obj); v.obj.traverse(o => o.geometry && o.geometry.dispose()); v.obj = null; }
  }
}

/* =========================================================
   CÁMARA
   ========================================================= */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt) {
  const v = P.veh, K = v ? v.K : null;
  let tx, ty, tz, yaw, dist = (K ? K.cam : 6) * (cam.zoom || 1);
  if (v) { const pp = v.kind === 'tren' ? v.obj.userData.cars[0].position : v.obj.position; tx = pp.x; ty = pp.y + (K.air ? 3 : 1.6); tz = pp.z; yaw = (v.kind === 'tren' ? v.obj.userData.cars[0].rotation.y : v.yaw); }
  else { tx = P.pos.x; ty = P.pos.y + 1.6; tz = P.pos.z; yaw = P.heading; }
  cam.idle += dt;
  if (v && cam.idle > 1.5) cam.yaw = lerp(cam.yaw, 0, dt * 1.5);
  const a = (v ? yaw : 0) + cam.yaw + Math.PI, pitch = cam.pitch + (K && K.air && !v.onGround ? .08 : 0);
  const want = new THREE.Vector3(tx + Math.sin(a) * dist * Math.cos(pitch), ty + Math.sin(pitch) * dist + 1, tz + Math.cos(a) * dist * Math.cos(pitch));
  const gy = Math.max(groundAt(want.x, want.z).y, 0) + 1.2; if (want.y < gy) want.y = gy;
  camPos.lerp(want, Math.min(1, dt * (v ? 6 : 10))); if (camPos.distanceTo(want) > 400) camPos.copy(want);
  camLook.set(tx, ty, tz);
  camera.position.copy(camPos); camera.lookAt(camLook);
}

/* =========================================================
   HUD, MAPAS Y TARJETAS
   ========================================================= */
function toast(txt, color = '#fff', mini = false) { const t = $('toast'); t.style.color = color; t.textContent = txt; t.classList.toggle('mini', mini); t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }
function updMissionHUD() {
  const c = $('mCard');
  if (!M) { c.classList.add('idle'); $('mWho').textContent = 'Sin misión'; $('mTxt').innerHTML = 'Pulsa <b>📋 Misiones</b> para elegir un viaje'; $('mTime').textContent = '—'; $('mBar').style.width = '0%'; return; }
  c.classList.remove('idle');
  $('mWho').textContent = (M.def.emoji || '🙏') + ' ' + M.def.name.split(' (')[0];
  $('mTxt').innerHTML = M.phase === 'pick' ? `Recógelo en <b>${M.pick.prov.name}</b>` : `Llévalo a <b>${M.dest.name}</b>`;
}
let provNow = null, provT = 0;
function updateHUD(dt) {
  $('hMoney').textContent = save.gifts.length + ' tesoros';
  if (M) {
    $('mTime').textContent = M.phase === 'pick' ? 'Sin prisa' : (M.late ? '⏰ Tarde' : fmtT(M.time));
    $('mBar').style.width = M.phase === 'ride' ? (clamp(M.time / M.total, 0, 1) * 100).toFixed(1) + '%' : '100%';
    $('mCard').classList.toggle('low', M.phase === 'ride' && !M.late && M.time < 120);
  }
  const v = P.veh;
  if (v) {
    $('gSpeed').textContent = Math.round(Math.abs(v.speed) * 3.6);
    $('gVeh').textContent = v.K.emoji + ' ' + v.K.name.replace(/^(el|la) /, '');
    const hasTank = !!TANK[v.kind];
    $('gFuelBox').classList.toggle('hidden', !hasTank);
    if (hasTank) { $('gFuel').style.width = (v.fuel * 100).toFixed(0) + '%'; $('gFuel').classList.toggle('low', v.fuel < .15); $('gFuelPct').textContent = Math.round(v.fuel * 100) + '%'; }
    $('gAlt').classList.toggle('hidden', !v.K.air); if (v.K.air) $('gAlt').textContent = '⬆ ' + Math.max(0, Math.round((v.y - Math.max(0, groundAt(v.x, v.z).y)) * 2)) + ' m';
  }
  // flecha y distancia al objetivo
  const tgt = M ? (M.phase === 'pick' ? M.pick : M.dest) : null;
  $('hint').classList.toggle('hidden', !tgt);
  if (tgt) {
    const px = v ? v.x : P.pos.x, pz = v ? v.z : P.pos.z, d = Math.hypot(tgt.x - px, tgt.z - pz);
    const ang = Math.atan2(tgt.x - px, tgt.z - pz) - (Math.atan2(camLook.x - camPos.x, camLook.z - camPos.z));
    $('hArrow').style.transform = `rotate(${-ang * 180 / Math.PI}deg)`; $('hDist').textContent = fmtKm(d);
  }
  // provincia actual (la capital más cercana)
  if ((provT -= dt) <= 0) {
    provT = 1; const px = P.veh ? P.veh.x : P.pos.x, pz = P.veh ? P.veh.z : P.pos.z;
    let p = null, bd = 1e12; for (const q of PROVINCES) { const d = Math.hypot(q.x - px, q.z - pz); if (d < bd) { bd = d; p = q; } }
    if (typeAt(px, pz) === 0 && H0(px, pz) < -2) p = null;
    if (p !== provNow) { provNow = p; $('hProv').textContent = p ? '📍 ' + p.name : '🌊 Mar Caribe / Océano Atlántico'; if (p && state === 'play') { $('banner').innerHTML = `<small>Bienvenido a la provincia</small>${p.name}<em>Capital: ${p.cap}</em>`; $('banner').classList.remove('show'); void $('banner').offsetWidth; $('banner').classList.add('show'); } }
  }
}
const mini = $('minimap'), mctx = mini.getContext('2d');
let miniT = 0;
function marks() {
  const out = [];
  if (M) { if (M.phase === 'pick') out.push({ x: M.pick.x, z: M.pick.z, color: '#ffd34d', icon: '🙏' }); else out.push({ x: M.dest.x, z: M.dest.z, color: '#3ccf6e', icon: '🏁' }); }
  return out;
}
function drawMini(dt) {
  if ((miniT -= dt) > 0) return; miniT = .15;
  const v = P.veh, x = v ? v.x : P.pos.x, z = v ? v.z : P.pos.z, yaw = v ? (v.kind === 'tren' ? v.obj.userData.cars[0].rotation.y : v.yaw) : P.heading;
  const zoom = v && v.K.air ? 60 : v ? 22 : 8;
  drawMap(mctx, mini.width, mini.height, x, z, zoom, { player: { x, z, yaw }, marks: marks() });
}
let mapView = null;
function openMap() { if (state !== 'play') return; state = 'map'; $('bigmap').classList.remove('hidden'); const v = P.veh; mapView = { x: v ? v.x : P.pos.x, z: v ? v.z : P.pos.z, upp: 230 }; drawBig(); }
function closeMap() { state = 'play'; $('bigmap').classList.add('hidden'); }
function drawBig() {
  const c = $('bigmapCanvas'), r = c.getBoundingClientRect(); c.width = r.width * Math.min(2, devicePixelRatio); c.height = r.height * Math.min(2, devicePixelRatio);
  const ctx = c.getContext('2d'), k = c.width / r.width; ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = P.veh, x = v ? v.x : P.pos.x, z = v ? v.z : P.pos.z, yaw = v ? v.yaw : P.heading;
  ctx.scale(k, k); drawMap(ctx, r.width, r.height, mapView.x, mapView.z, mapView.upp, { big: true, player: { x, z, yaw }, marks: marks(), ports: world.ports });
}
(() => { const c = $('bigmapCanvas'); let drag = null;
  c.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', e => { if (!drag || !mapView) return; mapView.x -= (e.clientX - drag.x) * mapView.upp; mapView.z -= (e.clientY - drag.y) * mapView.upp; drag = { x: e.clientX, y: e.clientY }; drawBig(); });
  c.addEventListener('pointerup', () => drag = null);
  c.addEventListener('wheel', e => { e.preventDefault(); mapView.upp = clamp(mapView.upp * (e.deltaY > 0 ? 1.2 : .83), 8, 400); drawBig(); }, { passive: false });
  $('mapIn').onclick = () => { mapView.upp = clamp(mapView.upp * .7, 8, 400); drawBig(); }; $('mapOut').onclick = () => { mapView.upp = clamp(mapView.upp * 1.4, 8, 400); drawBig(); };
  $('mapMe').onclick = () => { const v = P.veh; mapView.x = v ? v.x : P.pos.x; mapView.z = v ? v.z : P.pos.z; drawBig(); };
})();
// tarjetas
let talkOk = null;
function openTalk({ kind, name, msg, ref, gift, btn, onOk }) {
  state = 'talk'; $('tKind').textContent = kind; $('tName').textContent = name; $('tMsg').textContent = msg; $('tRef').textContent = ref || ''; $('tGift').textContent = gift || ''; $('tGift').classList.toggle('hidden', !gift);
  $('btnTake').textContent = btn || 'Continuar'; talkOk = onOk; $('talk').classList.remove('hidden');
}
function closeTalk() { $('talk').classList.add('hidden'); if (state === 'talk') state = 'play'; }
$('btnTake').onclick = () => { sound.click(); const f = talkOk; talkOk = null; if (f) f(); else closeTalk(); };
let verseDone = null, verseTimer = 0;
function openVerse(after) {
  const seen = new Set(save.verses); let pool = VERSES.map((v, i) => i).filter(i => !seen.has(i)); if (!pool.length) { save.verses = []; pool = VERSES.map((v, i) => i); }
  const i = pool[Math.floor(Math.random() * pool.length)], V = VERSES[i]; save.verses.push(i); persist();
  $('vText').textContent = V[0]; $('vRef').textContent = V[1] + ' (LBLA)'; $('vNum').textContent = save.verses.length + ' / ' + VERSES.length;
  state = 'verse'; verseDone = after || null; $('verse').classList.remove('hidden', 'ready');
  const secs = clamp(V[0].split(' ').length / 3.2, 3, 12); verseTimer = secs; verseTimer0 = secs;
  $('btnVerseOk').disabled = true; $('btnVerseOk').textContent = '📖 Lee el versículo…';
}
let verseTimer0 = 1;
$('btnVerseOk').onclick = () => { if ($('btnVerseOk').disabled) return; sound.click(); $('verse').classList.add('hidden'); state = 'play'; const f = verseDone; verseDone = null; if (f) f(); };

/* ---------- Bombas y peajes ---------- */
let fueling = null;
function updateServices(dt) {
  const v = P.veh;
  // bomba
  let pump = null;
  if (v && TANK[v.kind] && Math.abs(v.speed) < 1.5) {
    if (v.K.ground) pump = PUMPS.find(p => Math.hypot(p.x - v.x, p.z - v.z) < 16);
    else if (v.K.air && v.onGround) pump = world.airports.find(a => Math.hypot(a.a.x - v.x, a.a.z - v.z) < 1100) && { air: true };
    else if (v.K.water) pump = world.ports.find(p => Math.hypot(p.x - v.x, p.z - v.z) < 220) && { port: true };
  }
  if (fueling) {
    if (!pump || v !== fueling.v) { fueling = null; }
    else {
      const add = Math.min(1 - v.fuel, dt * .2);
      if (add <= 0) { toast('⛽ ¡Tanque lleno! Buen viaje', '#7ef0a4'); sound.bell(); fueling = null; persist(); }
      else { v.fuel += add; v.lowWarn = false; if (Math.random() < dt * 8) sound.fuelTick(); $('btnGallon').classList.add('hidden'); }
      prompt(`⛽ Echando combustible… ${Math.round(v.fuel * 100)}%`);
      return;
    }
  }
  if (pump && v.fuel < .98) { prompt(`⛽ <b>T</b> echar combustible`); if (takePressed) { takePressed = false; fueling = { v }; sound.click(); } return; }
  // peajes
  const px = v ? v.x : P.pos.x, pz = v ? v.z : P.pos.z;
  for (const t of TOLL_LIST) {
    const d = Math.hypot(t.x - px, t.z - pz);
    // hay que detenerse en la caseta para que suba la barrera
    if (v && v.K.ground && d < 22 && !(t.open > 0)) {
      const along = (px - t.x) * Math.sin(t.yaw) + (pz - t.z) * Math.cos(t.yaw);
      if (Math.abs(v.speed) < 2.5) { t.open = 9; sound.bell(); toast(`🚧 ${t.name} · ¡Buen viaje!`, '#f5c518'); }
      else if (Math.abs(along) < 7) { v.speed *= -.25; if (clockT - t.last > 2) { t.last = clockT; sound.hurt(); toast('🚧 ¡Detente en el peaje para que suba la barrera!', '#ffb36b'); } }
      else if (clockT - t.last > 4) { t.last = clockT; prompt('🚧 Peaje: frena y detente en la caseta'); }
    }
    if (t.open > 0) { t.open -= dt; t.bars.forEach(b => b.rotation.z = lerp(b.rotation.z, 1.4, dt * 6)); } else if (d < 400) t.bars.forEach(b => b.rotation.z = lerp(b.rotation.z, 0, dt * 3));
  }
  return null;
}
let promptShown = false;
function prompt(html) { $('prompt').innerHTML = html; $('prompt').classList.add('show'); promptShown = true; }

/* ---------- Lugares especiales: tarjeta de información ---------- */
let infoPlace = null;
function updatePlaces() {
  const px = P.veh ? P.veh.x : P.pos.x, pz = P.veh ? P.veh.z : P.pos.z;
  let near = null; for (const p of PLACES) if (Math.hypot(p.x - px, p.z - pz) < 320) near = p;
  if (near !== infoPlace) { infoPlace = near; if (near) { $('iName').textContent = near.name; $('iText').textContent = near.text; $('iRef').textContent = 'Provincia ' + (PROV[near.prov] ? PROV[near.prov].name : ''); $('info').classList.add('show'); sound.bell(); setTimeout(() => $('info').classList.remove('show'), 9000); } }
}

/* =========================================================
   BUCLE PRINCIPAL
   ========================================================= */
let lastNarr = -99, clockT = 0, lastNow = performance.now(), saveT = 0, menuT = 0;
function step(dt) {
  promptShown = false;
  if (P.veh) drive(dt); else walk(dt);
  const v = P.veh;
  if (v) {
    if (v.kind !== 'tren') { vehMesh(v); syncVeh(v); }
    animateVehicle(v.obj, dt, v.speed, clockT);
    P.pos.set(v.x, v.y, v.z);
    // conductor visible (o adentro)
    const seat = v.obj.userData.seats[0], hostObj = v.kind === 'tren' ? v.obj.userData.cars[0] : v.obj;
    if (v.K.hide) human.root.visible = false;
    else { human.root.visible = true; const w = hostObj.localToWorld(new THREE.Vector3(...seat)); human.root.position.copy(w); human.root.quaternion.copy(hostObj.quaternion); animateHuman(human, dt, { speed: 0, onGround: true, vy: 0, land: 0, t: clockT, sit: 1 }); }
    if (passenger) {
      const s2 = v.obj.userData.seats[1], w2 = hostObj.localToWorld(new THREE.Vector3(...s2));
      if (PAX.pos.distanceTo(w2) > 60) { PAX.pos.lerp(w2, dt * 1.5); passenger.root.position.copy(PAX.pos); passenger.root.visible = true; animateHuman(passenger, dt, { speed: 8, onGround: true, vy: 0, land: 0, t: clockT }); }
      else { PAX.pos.copy(w2); passenger.root.visible = !v.K.hide; passenger.root.position.copy(w2); passenger.root.quaternion.copy(hostObj.quaternion); animateHuman(passenger, dt, { speed: 0, onGround: true, vy: 0, land: 0, t: clockT, sit: 1 }); }
    }
    // luz del vehículo de noche
    const night = save.time === 'noche'; headlight.intensity = night ? 900 : 0;
    if (night) { headlight.position.copy(hostObj.position).add(new THREE.Vector3(Math.sin(v.yaw) * 2, 2, Math.cos(v.yaw) * 2)); headlight.target.position.copy(hostObj.position).add(new THREE.Vector3(Math.sin(v.yaw) * 40, -2, Math.cos(v.yaw) * 40)); }
  } else {
    headlight.intensity = 0;
    if (passenger) { // el pasajero camina detrás
      const back = new THREE.Vector3(P.pos.x - Math.sin(P.heading) * 1.8 + Math.cos(P.heading) * .7, 0, P.pos.z - Math.cos(P.heading) * 1.8 - Math.sin(P.heading) * .7);
      const d = Math.hypot(back.x - PAX.pos.x, back.z - PAX.pos.z), spd = d > .4 ? Math.min(d * 3, d > 8 ? 9 : 6) : 0;
      if (d > 80) PAX.pos.copy(back);
      else if (spd) { const a = Math.atan2(back.x - PAX.pos.x, back.z - PAX.pos.z); PAX.heading = a; PAX.pos.x += Math.sin(a) * spd * dt; PAX.pos.z += Math.cos(a) * spd * dt; }
      PAX.pos.y = groundAt(PAX.pos.x, PAX.pos.z).y; passenger.root.visible = true;
      passenger.root.position.copy(PAX.pos); passenger.root.quaternion.identity(); passenger.root.rotation.y = PAX.heading; animateHuman(passenger, dt, { speed: spd, onGround: true, vy: 0, land: 0, t: clockT });
    }
  }
  // tiempo de la misión
  if (M && M.phase === 'ride') { if (!M.late) { M.time -= dt; if (M.time <= 0) { M.time = 0; M.late = true; sound.lose(); toast(`⏰ ¡Se acabó el tiempo! Lleva igual a ${M.def.name.split(' (')[0]}`, '#ff6b6b'); } } rideTalk(dt); }
  // recoger y llegar
  if (M) {
    const px = v ? v.x : P.pos.x, pz = v ? v.z : P.pos.z, slow = !v || (Math.abs(v.speed) < 3 && (!v.K.air || v.onGround));
    if (M.phase === 'pick') {
      const d = Math.hypot(M.pick.x - px, M.pick.z - pz);
      if (waiting) { waiting.children[2].material.opacity = .14 + Math.sin(clockT * 3) * .08; waiting.children[1].visible = d < 400; }
      if (d < (v ? 14 + (v.kind === 'avion' ? 20 : 0) : 6) && slow && !promptShown) { prompt(`🙏 <b>T</b> recoger a ${M.def.name.split(' (')[0]}`); if (takePressed) { takePressed = false; pickUp(); } }
    } else if (M.phase === 'ride' && passenger) {
      const d = Math.hypot(M.dest.x - px, M.dest.z - pz), paxNear = PAX.pos.distanceTo(P.pos) < 40;
      if (d < M.dest.r && slow && paxNear) arrive();
    }
  }
  updateServices(dt);
  if (!promptShown) {
    const nv = !P.veh ? nearestVehicle() : null;
    if (P.veh) { if (takePressed) { takePressed = false; exitVeh(); } }
    else if (nv) { prompt(`${nv.K.emoji} <b>T</b> subir a ${nv.kind === 'tren' ? nv.line.name : nv.K.name}`); if (takePressed) { takePressed = false; enter(nv); } }
    else $('prompt').classList.remove('show');
  }
  takePressed = false;
  if (!promptShown && P.veh) $('prompt').classList.remove('show');
  updateGente(dt, P.pos, clockT, sound, () => clockT - lastNarr > 10, groundAt);
  updateCoins(dt, clockT); updateTrains(dt); updateTraffic(dt); updateSkyPlanes(dt); updateParked(dt); updatePlaces();
  // pequeñas animaciones de lugares
  for (const p of PLACES) { if (p.cab) { const k = (Math.sin(clockT * .08) + 1) / 2; p.cab.m.position.lerpVectors(p.cab.from, p.cab.to, k); } if (p.flag) p.flag.rotation.y = Math.sin(clockT * 2) * .25; }
  if ((saveT -= dt) <= 0) { saveT = 8; const pv = P.veh; save.pos = { x: P.pos.x, z: P.pos.z }; if (M) { save.mission = { who: M.m.who, dest: M.m.dest, pick: M.pick.prov.id, time: M.time, phase: M.phase, late: M.late }; } if (pv) save.fuel[pv.id] = +pv.fuel.toFixed(3); persist(); }
}
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(.05, (now - lastNow) / 1000); lastNow = now; clockT += dt;
  if (!world) return;
  if (state === 'play') { step(dt); updateCamera(dt); updateHUD(dt); drawMini(dt); }
  else if (state === 'verse') { verseTimer -= dt; $('vProg').style.width = (clamp(1 - verseTimer / verseTimer0, 0, 1) * 100) + '%'; if (verseTimer <= 0 && $('btnVerseOk').disabled) { $('btnVerseOk').disabled = false; $('btnVerseOk').textContent = '✅ ¡Amén! Continuar'; $('verse').classList.add('ready'); } }
  else if (state === 'menu' || (state === 'loading2' && !entering)) menuFly(dt);
  if (state !== 'play' && state !== 'map' && state !== 'talk' && state !== 'verse') sound.engine && P.veh && sound.engineOff();
  // el sol y la sombra siguen al jugador; el agua y el cielo también
  const c = camera.position, focus = state === 'play' || state === 'talk' || state === 'verse' || state === 'map' ? P.pos : camLook;
  sun.position.copy(focus).addScaledVector(sunDir, 400); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
  sky.position.copy(c); stars.position.copy(c); moon.position.copy(c).addScaledVector(moonDir, 40000);
  if (water) water.userData.follow(c.x, c.z, dt);
  lamp.position.set(P.pos.x, P.pos.y + 3, P.pos.z); lamp.intensity = save.time === 'noche' && state === 'play' && !P.veh ? 40 : 0;
  const onP = state === 'play' || state === 'talk' || state === 'verse' || state === 'map' || state === 'pause' || entering;
  if (chunks) chunks.update(onP ? P.pos.x : camLook.x, onP ? P.pos.z : camLook.z, farMesh, state === 'loading2' ? 40 : 7);
  if ((detT -= dt) <= 0) { detT = .5; for (const o of DETAIL) o.obj.visible = Math.abs(o.x - c.x) < o.d && Math.abs(o.z - c.z) < o.d; for (const t of TOWNS) { const d = Math.hypot(t.p.px - c.x, t.p.pz - c.z); t.label.visible = d > 500 && d < 22000; } }
  renderer.render(scene, camera);
}
// vuelo de la portada sobre la isla
let flyA = 0, detT = 0, entering = false;
function menuFly(dt) {
  flyA += dt * .02;
  const p = PROV.dn, R = 2600, x = p.x + Math.cos(flyA) * R, z = p.z + Math.sin(flyA) * R * .7;
  camPos.set(x, Math.max(groundAt(x, z).y, 0) + 420, z); camLook.set(p.x + Math.cos(flyA + .6) * 600, 60, p.z + Math.sin(flyA + .6) * 400);
  camera.position.copy(camPos); camera.lookAt(camLook);
  updateTrains(dt); updateSkyPlanes(dt);
}

/* =========================================================
   MENÚS
   ========================================================= */
const SCREENS = ['splash', 'help', 'creator', 'provsel', 'missions', 'collection', 'pause', 'result'];
function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); const playing = id === null; $('hud').classList.toggle('hidden', !playing); $('touch').classList.toggle('hidden', !playing || !isTouch); $('topbar').classList.toggle('hidden', playing); }
function play() {
  document.body.classList.add('ingame'); show(null); state = 'play'; ensureMusic(); sound.setMusicMode('play'); updMissionHUD();
  human.root.visible = true; cam.idle = 0;
}
function placePlayerStart() {
  const p = save.pos && isFinite(save.pos.x) ? save.pos : { x: PROV.dn.px + 30, z: PROV.dn.pz + 30 };
  P.pos.set(p.x, groundAt(p.x, p.z).y, p.z); if (P.pos.y < -.5) { P.pos.set(PROV.dn.x + 40, 0, PROV.dn.z + 30); P.pos.y = groundAt(P.pos.x, P.pos.z).y; }
  camPos.set(P.pos.x, P.pos.y + 6, P.pos.z + 8);
}
async function enterGame(then) {
  if (!save.player.name) { openCreator(then); return; }
  state = 'loading2'; entering = true; $('enterLoad').classList.remove('hidden');
  placePlayerStart(); rebuildPlayer();
  // preparar el terreno alrededor del jugador
  for (let i = 0; i < 400 && chunks.update(P.pos.x, P.pos.z, farMesh, 60) > 0; i++) await idle();
  $('enterLoad').classList.add('hidden'); entering = false;
  if (!M && save.mission) resumeMission();
  play(); if (then) then();
}
// Portada
$('btnPlay').onclick = () => { sound.click(); sound.unlock(); if (save.mission && !M) { enterGame(); return; } if (!save.player.name) { openCreator(openProvinces); return; } state = 'menu'; openProvinces(); };
$('btnMissionsMenu').onclick = () => { sound.click(); if (!save.player.name) { openCreator(openProvinces); return; } state = 'menu'; openProvinces(); };
$('btnFree').onclick = () => { sound.click(); enterGame(() => { if (M) clearMission(); toast('🚗 Paseo libre: recorre el país a tu gusto', '#7ef0a4'); }); };
$('btnCharacter').onclick = () => { sound.click(); openCreator(); };
$('btnCollection').onclick = () => { sound.click(); renderCollection(); show('collection'); state = 'menu'; };
$('btnHelp').onclick = () => { sound.click(); show('help'); };
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sound.click(); show(b.dataset.go); state = 'menu'; });
// Misiones
// Solicitudes para una provincia elegida: todos los personajes que pueden salir desde allí
function offersFor(p) {
  const out = [];
  for (const m of MISSIONS) {
    const def = CHAR[m.who]; if (!def) continue;
    const d = destOf(m.dest); if (m.dest === p.id || (d.place && d.place.prov === p.id)) continue;
    const dist = Math.hypot(p.px - d.x, p.pz - d.z); if (dist < 6000) continue;
    out.push({ m, def, pick: p, dest: d, dist, time: Math.round(dist / 24 + 150) });
  }
  return out.sort((a, b) => (save.done[a.def.id] !== undefined) - (save.done[b.def.id] !== undefined) || a.dist - b.dist);
}
let missionProv = null;
function openProvinces() {
  if (state === 'play') state = 'pause';
  const box = $('pList'); box.innerHTML = '';
  const regions = [...new Set(PROVINCES.map(p => p.region))];
  for (const r of regions) {
    const h = document.createElement('h3'); h.className = 'preg'; h.textContent = 'Región ' + r; box.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'pgrid'; box.appendChild(grid);
    for (const p of PROVINCES.filter(q => q.region === r).sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
      const n = offersFor(p).length, b = document.createElement('button'); b.className = 'pcard';
      b.innerHTML = `<b>${p.name}</b><small>${p.cap}</small><span>🙏 ${n} personajes</span>`;
      b.onclick = () => { sound.click(); openMissions(p); };
      grid.appendChild(b);
    }
  }
  $('pNear').classList.toggle('hidden', !(world && save.player.name && P.pos.lengthSq() > 0 && document.body.classList.contains('ingame')));
  $('pCancel').classList.toggle('hidden', !M);
  show('provsel');
}
function openMissions(prov) {
  missionProv = prov || null;
  const list = prov ? offersFor(prov) : missionOffers(), box = $('mList'); box.innerHTML = '';
  if (state === 'play') state = 'pause';
  $('mTitle').textContent = prov ? `📍 ${prov.name} · ¿A quién deseas llevar?` : '📋 Solicitudes de viaje cerca de ti';
  $('mSub').textContent = prov ? `Los personajes te esperan en la plaza de ${prov.cap}. El tiempo empieza cuando el personaje sube contigo.` : 'Elige a quién llevar. El tiempo empieza cuando el personaje sube contigo.';
  for (const o of list) {
    const mins = Math.round(o.time / 60), lvl = o.dist < 25000 ? ['Corto', 'c'] : o.dist < 60000 ? ['Medio', 'm'] : ['Largo', 'l'];
    const b = document.createElement('button'); b.className = 'mcard ' + lvl[1];
    b.innerHTML = `<div class="mc-top"><span class="mc-emoji">${o.def.emoji || '🙏'}</span><div><b>${o.def.name}</b><small>${o.def.kind}</small></div><span class="mc-lvl">${lvl[0]}</span></div>
      <div class="mc-route"><span>📍 ${o.pick.name}</span><i></i><span>🏁 ${o.dest.name}</span></div>
      <p>${o.def.name.split(' (')[0]} ${o.m.why}</p>
      <div class="mc-treasure">💎 Tesoro: ${o.def.emoji || '🎁'} ${o.def.gift}</div>
      <div class="mc-foot"><span>⏱ ${mins} min</span><span>📏 ${fmtKm(o.dist)}</span><span>⭐ ${'★'.repeat(save.done[o.def.id] || 0) || 'Nuevo'}</span></div>`;
    b.onclick = () => { sound.click(); if (prov) startAt(o); else { startMission(o); play(); } };
    box.appendChild(b);
  }
  $('mReroll').textContent = prov ? '⬅ Otra provincia' : '🗺 Elegir provincia';
  $('mCancel').classList.toggle('hidden', !M);
  show('missions');
}
// viajar a la provincia elegida y empezar la misión junto al personaje
async function startAt(o) {
  if (!save.player.name) { openCreator(() => startAt(o)); return; }
  if (P.veh) { const v = P.veh; v.speed = 0; if (v.obj) v.obj.userData.engineOn = false; P.veh = null; sound.engineOff(); driveUI(false); if (v.kind === 'tren') v.auto = 'resume'; }
  clearMission(true); startMission(o);
  P.pos.set(M.pick.x - 4, 0, M.pick.z - 6); P.pos.y = groundAt(P.pos.x, P.pos.z).y; P.heading = Math.atan2(M.pick.x - P.pos.x, M.pick.z - P.pos.z); P.vy = 0;
  camPos.set(P.pos.x, P.pos.y + 6, P.pos.z - 8); cam.yaw = P.heading; save.pos = { x: P.pos.x, z: P.pos.z }; persist();
  state = 'loading2'; entering = true; show(null); $('hud').classList.add('hidden'); $('enterLoad').classList.remove('hidden'); rebuildPlayer();
  for (let i = 0; i < 400 && chunks.update(P.pos.x, P.pos.z, farMesh, 60) > 0; i++) await idle();
  $('enterLoad').classList.add('hidden'); entering = false; play();
  toast(`🙏 ${o.def.name.split(' (')[0]} te espera aquí: acércate y pulsa T`, '#ffd34d');
}
$('mReroll').onclick = () => { sound.click(); if (missionProv) openProvinces(); else openProvinces(); };
$('mBack').onclick = () => { sound.click(); if (missionProv) openProvinces(); else if (document.body.classList.contains('ingame')) play(); else { show('splash'); state = 'menu'; } };
$('mCancel').onclick = () => { sound.click(); clearMission(); toast('Misión cancelada', '#ffd34d'); openProvinces(); };
$('pCancel').onclick = () => { sound.click(); clearMission(); toast('Misión cancelada', '#ffd34d'); openProvinces(); };
$('pNear').onclick = () => { sound.click(); openMissions(); };
$('pBack').onclick = () => { sound.click(); if (document.body.classList.contains('ingame')) play(); else { show('splash'); state = 'menu'; } };
$('btnMissions').onclick = () => { sound.click(); openProvinces(); };
// Pausa
function pauseGame() { if (state !== 'play') return; state = 'pause'; show('pause'); sound.engineOff(); }
function resumeGame() { play(); }
$('btnPause').onclick = () => { sound.click(); pauseGame(); };
$('btnResume').onclick = () => { sound.click(); resumeGame(); };
$('btnPauseMissions').onclick = () => { sound.click(); openProvinces(); };
$('btnPauseHome').onclick = () => { sound.click(); goHome(); };
$('btnPauseExit').onclick = exitGame;
$('btnResNext').onclick = () => { sound.click(); openProvinces(); };
$('btnResFree').onclick = () => { sound.click(); play(); };
$('btnMap').onclick = () => { sound.click(); openMap(); }; mini.addEventListener('click', () => openMap());
$('bigmapClose').onclick = () => { sound.click(); closeMap(); };
$('btnCam').onclick = () => cycleCam();
$('btnGallon').onclick = () => askGallon();
$('iClose').onclick = () => $('info').classList.remove('show');
// Colección
let colTab = 'chars';
function renderCollection() {
  const box = $('vlist'); box.innerHTML = '';
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('sel', b.dataset.tab === colTab));
  if (colTab === 'chars') {
    const list = MISSIONS.map(m => CHAR[m.who]).filter(Boolean);
    $('colCount').textContent = `💎 ${save.gifts.length} de ${list.length} tesoros bíblicos · ${Object.keys(save.done).length} personajes llevados · ${save.deliveries} entregas · ⭐ ${save.stars}`;
    for (const d of list) { const s = save.done[d.id]; const e = document.createElement('div'); e.className = 'vitem gift' + (s === undefined ? ' lock' : ''); e.innerHTML = `<span class="ge">${s === undefined ? '🔒' : d.emoji || '🙏'}</span><div><b>${d.name}</b><small>${d.kind}${s !== undefined ? ' · ' + '★'.repeat(s) + '☆'.repeat(3 - s) : ''}</small>${s !== undefined && save.gifts.includes(d.id) ? `<p>💎 ${d.gift}</p>` : ''}</div>`; box.appendChild(e); }
  } else {
    const seen = [...new Set(save.verses)]; $('colCount').textContent = `${seen.length} de ${VERSES.length} versículos leídos`;
    for (const i of seen) { const V = VERSES[i]; if (!V) continue; const e = document.createElement('div'); e.className = 'vitem'; e.innerHTML = `«${V[0]}» <b>${V[1]}</b>`; box.appendChild(e); }
  }
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { colTab = b.dataset.tab; renderCollection(); });
// Personaje
let draft = null, afterCreate = null;
function openCreator(then) { afterCreate = then || null; draft = Object.assign({}, save.player); state = 'menu'; show('creator'); $('pName').value = draft.name || ''; refreshCreator(); }
const cleanName = v => (v || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').slice(0, 10);
function swatches(id, arr, key) { const el = $(id); el.innerHTML = ''; arr.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch' + (draft[key] === i ? ' sel' : ''); b.style.background = '#' + new THREE.Color(c).getHexString(); b.onclick = () => { draft[key] = i; applyDraft(); }; el.appendChild(b); }); }
function refreshCreator() {
  document.querySelectorAll('[data-gender]').forEach(b => b.classList.toggle('sel', b.dataset.gender === draft.gender));
  swatches('skins', SKINS, 'skin'); swatches('tops', TOPS, 'top'); swatches('bottoms', BOTTOMS, 'bottom');
  const ol = $('outfits'); ol.innerHTML = '';
  OUTFITS.forEach(o => { const locked = o.req && save.deliveries < o.req, b = document.createElement('button'); b.className = 'opt small' + (draft.outfit === o.id ? ' sel' : '') + (locked ? ' locked' : ''); b.innerHTML = (locked ? '🔒 ' : '') + o.name + (locked ? `<small>${o.lockText}</small>` : ''); b.onclick = () => { if (locked) { toast('🔒 ' + o.lockText, '#ffd34d'); return; } draft.outfit = o.id; if (o.id === 'aaron') draft.gender = 'm'; applyDraft(); }; ol.appendChild(b); });
  const modern = draft.outfit === 'moderno';
  $('legRow').classList.toggle('hidden', !(modern && draft.gender === 'f')); $('lblLeg').classList.toggle('hidden', !(modern && draft.gender === 'f'));
  $('topRow').classList.toggle('hidden', !modern); $('lblTopStyle').classList.toggle('hidden', !modern);
  document.querySelectorAll('[data-leg]').forEach(b => b.classList.toggle('sel', b.dataset.leg === (draft.legwear || 'falda')));
  document.querySelectorAll('[data-topstyle]').forEach(b => b.classList.toggle('sel', b.dataset.topstyle === (draft.topStyle || 'camisa')));
  const ok = (draft.name || '').length >= 2; $('btnCreate').disabled = !ok;
  $('pHint').textContent = ok ? `Así se verá en tu espalda: ${draft.name.toUpperCase()}` : 'Una sola palabra, solo letras, de 2 a 10 letras.'; $('pHint').classList.toggle('ok', ok);
  drawPreview();
}
function applyDraft() { save.player = Object.assign({}, draft); rebuildPlayer(); refreshCreator(); }
document.querySelectorAll('[data-gender]').forEach(b => b.onclick = () => { draft.gender = b.dataset.gender; if (draft.gender === 'f' && draft.outfit === 'aaron') draft.outfit = 'tunica'; if (draft.gender === 'f' && !draft.legwear) draft.legwear = 'falda'; applyDraft(); });
document.querySelectorAll('[data-leg]').forEach(b => b.onclick = () => { draft.legwear = b.dataset.leg; applyDraft(); });
document.querySelectorAll('[data-topstyle]').forEach(b => b.onclick = () => { draft.topStyle = b.dataset.topstyle; applyDraft(); });
$('pName').addEventListener('input', e => { const c = cleanName(e.target.value); if (c !== e.target.value) e.target.value = c; draft.name = c; clearTimeout(applyDraft.h); applyDraft.h = setTimeout(applyDraft, 300); $('btnCreate').disabled = c.length < 2; });
$('btnCreate').onclick = () => { draft.name = cleanName($('pName').value); if (draft.name.length < 2) return; applyDraft(); persist(); sound.click(); const f = afterCreate; afterCreate = null; if (f === openProvinces) { state = 'menu'; openProvinces(); } else if (f) enterGame(f); else { show('splash'); state = 'menu'; } };
$('btnCreatorBack').onclick = () => { sound.click(); show('splash'); state = 'menu'; };
// vista previa del personaje (render aparte)
const prevR = new THREE.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true }); prevR.outputColorSpace = THREE.SRGBColorSpace; prevR.toneMapping = THREE.ACESFilmicToneMapping; prevR.toneMappingExposure = .9;
const prevS = new THREE.Scene(), prevC = new THREE.PerspectiveCamera(30, 1, .1, 50); prevC.position.set(0, 1.1, 4.6); prevC.lookAt(0, .95, 0);
prevS.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4)); const pl2 = new THREE.DirectionalLight(0xffffff, 2.2); pl2.position.set(2, 3, 3); prevS.add(pl2);
let prevH = null;
function drawPreview() { if (prevH) prevS.remove(prevH.root); prevH = createHuman(playerOpts(draft)); prevS.add(prevH.root); const c = $('preview'), r = c.getBoundingClientRect(); prevR.setSize(r.width || 220, r.height || 300, false); prevC.aspect = (r.width || 220) / (r.height || 300); prevC.updateProjectionMatrix(); }
(function prevLoop() { requestAnimationFrame(prevLoop); if ($('creator').classList.contains('hidden') || !prevH) return; prevH.root.rotation.y += .01; animateHuman(prevH, .016, { speed: 0, onGround: true, vy: 0, land: 0, t: performance.now() / 1000 }); prevR.render(prevS, prevC); })();
// Hora del día
function renderTimeButtons() { document.querySelectorAll('.time-opts').forEach(box => { box.innerHTML = ''; for (const [k, v] of Object.entries(TIMES)) { const b = document.createElement('button'); b.className = 'opt small' + ((save.time || 'dia') === k ? ' sel' : ''); b.textContent = v.name; b.onclick = () => { sound.click(); applyTime(k); }; box.appendChild(b); } }); }
// Sonido y pantalla completa
function updSound() { $('btnMusic').textContent = sound.musicOn ? '🎵' : '🔇'; $('btnSfx').textContent = sound.sfxOn ? '🔊' : '🔈'; $('tbMusic').innerHTML = `🎵 <span class="chip-txt">Música: ${sound.musicOn ? 'Sí' : 'No'}</span>`; $('tbSfx').innerHTML = `🔊 <span class="chip-txt">Efectos: ${sound.sfxOn ? 'Sí' : 'No'}</span>`; }
const toggleMusic = () => { sound.setMusic(!sound.musicOn); try { localStorage.setItem(SAVE_KEY + '_music', sound.musicOn ? '1' : '0'); } catch (e) {} updSound(); };
const toggleSfx = () => { sound.setSfx(!sound.sfxOn); try { localStorage.setItem(SAVE_KEY + '_sfx', sound.sfxOn ? '1' : '0'); } catch (e) {} updSound(); };
$('btnMusic').onclick = toggleMusic; $('tbMusic').onclick = toggleMusic; $('btnSfx').onclick = toggleSfx; $('tbSfx').onclick = toggleSfx; updSound();
const fsReq = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
function toggleFull() { if (!fsReq) { toast('En iPhone: Compartir ⬆️ → «Agregar a inicio»', '#ffd34d'); return; } if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { try { const r = fsReq.call(document.documentElement, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
$('tbFull').onclick = toggleFull; $('btnFull').onclick = toggleFull;
const SITE = 'https://davidgarcia-star.github.io/luisdavidgarcia/';
function goHome() { persist(); sound.engineOff(); document.body.classList.remove('ingame'); state = 'menu'; show('splash'); sound.setMusicMode('menu'); }
function exitGame() { persist(); window.close(); setTimeout(() => { if (!window.closed) location.href = SITE; }, 250); }
$('btnHome').onclick = goHome; $('btnExit').onclick = exitGame;
addEventListener('beforeunload', () => { save.pos = { x: P.pos.x, z: P.pos.z }; persist(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); if (state === 'play') pauseGame(); } });

/* ---------- Arranque ---------- */
(async () => {
  renderTimeButtons();
  lastNow = performance.now(); loop();
  try { await buildWorld(); } catch (e) { console.error(e); $('loadTxt').textContent = 'Error al construir el mundo: ' + e.message; return; }
  applyTime(save.time || 'dia');
  camLook.set(PROV.dn.x, 0, PROV.dn.z);
  state = 'loading2';
  for (let i = 0; i < 200 && chunks.update(PROV.dn.x, PROV.dn.z, farMesh, 60) > 0; i++) { loadBar(.9 + .1 * Math.min(1, i / 60)); await idle(); }
  state = 'menu'; $('loading').classList.add('done'); document.body.classList.add('ready');
  $('btnPlay').querySelector('span').textContent = save.mission ? '▶ CONTINUAR VIAJE' : save.deliveries ? '▶ CONTINUAR' : '▶ JUGAR';
})();
window.__game = { setState: s => state = s, step: dt => step(dt), arriveNow: () => arrive(), pickUpNow: () => pickUp(), P, VEH, get M() { return M; }, scene, camera, renderer, get state() { return state; }, keys, enterGame, startMission, missionOffers, play, heightAt, groundAt, save, setTake: () => takePressed = true, TOWNS, world: () => world, chunks: () => chunks, applyTime, enter, openMissions };

/* ---------- Contador de visitantes ---------- */
(function () {
  const BASE = 'https://abacus.jasoncameron.dev/', RUTA = 'miproaa-luisdavidgarcia/biblixia2', MARCA = 'biblixia2-contado', CACHE = 'biblixia2-visitas';
  const els = () => document.querySelectorAll('.js-visitas'), mostrar = n => els().forEach(e => e.textContent = Number(n).toLocaleString('es-DO'));
  try { const c = localStorage.getItem(CACHE); if (c !== null) mostrar(c); } catch (e) {}
  const go = () => {
    if (!window.fetch) return; let contado = false; try { contado = !!localStorage.getItem(MARCA); } catch (e) {}
    const pedir = tipo => fetch(BASE + tipo + '/' + RUTA + '?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => Math.floor(Number(d.value ?? d.count)));
    const ok = n => { if (!isFinite(n)) return; try { localStorage.setItem(MARCA, '1'); localStorage.setItem(CACHE, String(n)); } catch (e) {} mostrar(n); };
    const intento = k => pedir(contado ? 'get' : 'hit').then(ok).catch(() => { if (k < 3) setTimeout(() => intento(k + 1), (3 + 4 * k) * 1000 + Math.random() * 4000); });
    intento(0);
  };
  if (document.readyState === 'complete') setTimeout(go, 500 + Math.random() * 1500); else addEventListener('load', () => setTimeout(go, 500 + Math.random() * 1500), { once: true });
})();
