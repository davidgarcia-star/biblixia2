/* =========================================================
   BIBLIXIA 2 · CHOQUES (colisiones)
   Edificios, iglesias, árboles, postes, bombas, peajes y vehículos
   son sólidos: el jugador (a pie o manejando) no los atraviesa.
   Cada sólido es una caja girada (x, z, medio ancho, medio largo, giro)
   o un círculo. Se guardan en una cuadrícula para buscarlos rápido.
   ========================================================= */
const CELL = 48, grid = new Map();
const gk = (i, j) => (i + 40000) * 80000 + (j + 40000);

// giro igual que three.js (rotation.y): eje x local → (cos, -sin), eje z local → (sin, cos)
export function makeBox(x, z, hw, hd, yaw = 0, top = 1e9) { return { x, z, hw, hd, c: Math.cos(yaw), s: Math.sin(yaw), top, r: Math.hypot(hw, hd) }; }

function insert(b) {
  const i0 = Math.floor((b.x - b.r) / CELL), i1 = Math.floor((b.x + b.r) / CELL), j0 = Math.floor((b.z - b.r) / CELL), j1 = Math.floor((b.z + b.r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = gk(i, j); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(b); }
}
function remove(b) {
  const i0 = Math.floor((b.x - b.r) / CELL), i1 = Math.floor((b.x + b.r) / CELL), j0 = Math.floor((b.z - b.r) / CELL), j1 = Math.floor((b.z + b.r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = gk(i, j), l = grid.get(k); if (!l) continue; const n = l.indexOf(b); if (n >= 0) l.splice(n, 1); if (!l.length) grid.delete(k); }
}

/** Sólido en coordenadas del mundo. top = altura (y) de su techo: si el jugador está más arriba, pasa por encima. */
export function solidBox(x, z, hw, hd, yaw = 0, top = 1e9) { const b = makeBox(x, z, hw, hd, yaw, top); insert(b); return b; }
export function solidCircle(x, z, r, top = 1e9) { return solidBox(x, z, r * .8, r * .8, 0, top); }
/** Sólido dentro de un grupo (posición gx,gz y giro gyaw): lx, lz son coordenadas locales del grupo. */
export function solidLocal(gx, gz, gyaw, lx, lz, hw, hd, top = 1e9, yaw = 0) {
  const c = Math.cos(gyaw), s = Math.sin(gyaw);
  return solidBox(gx + lx * c + lz * s, gz - lx * s + lz * c, hw, hd, gyaw + yaw, top);
}
export function removeSolids(list) { if (list) for (const b of list) remove(b); }

/** Empuje para sacar un círculo (x, z, radio r) de una caja b. Devuelve [ex, ez] o null si no se tocan. */
export function circleVsBox(x, z, r, b) {
  const dx = x - b.x, dz = z - b.z;
  if (dx * dx + dz * dz > (r + b.r) * (r + b.r)) return null;
  const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
  const qx = Math.max(-b.hw, Math.min(b.hw, lx)), qz = Math.max(-b.hd, Math.min(b.hd, lz));
  let nx, nz, pen;
  if (qx === lx && qz === lz) {
    // el centro quedó adentro: sale por el lado más cercano
    const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz);
    if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + r; }
  } else {
    const ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
    if (d >= r) return null;
    nx = ex / d; nz = ez / d; pen = r - d;
  }
  // de local al mundo
  return [(nx * b.c + nz * b.s) * pen, (-nx * b.s + nz * b.c) * pen];
}

const tmp = [];
function near(x, z, r) {
  tmp.length = 0;
  const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = grid.get(gk(i, j)); if (l) for (const b of l) if (!tmp.includes(b)) tmp.push(b); }
  return tmp;
}

/**
 * Saca un círculo de todos los sólidos (fijos y los de la lista extra, p. ej. vehículos).
 * y = altura de los pies. Devuelve { x, z, hit }.
 */
export function resolve(x, z, r, y = 0, extra = null) {
  let hit = false;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const b of near(x, z, r)) {
      if (y > b.top - .15) continue;
      const e = circleVsBox(x, z, r, b); if (e) { x += e[0]; z += e[1]; hit = moved = true; }
    }
    if (extra) for (const b of extra) { const e = circleVsBox(x, z, r, b); if (e) { x += e[0]; z += e[1]; hit = moved = true; } }
    if (!moved) break;
  }
  return { x, z, hit };
}
/** ¿Toca algo un círculo? (sin moverlo) */
export function touches(x, z, r, y = 0, extra = null) {
  for (const b of near(x, z, r)) { if (y > b.top - .15) continue; if (circleVsBox(x, z, r, b)) return true; }
  if (extra) for (const b of extra) if (circleVsBox(x, z, r, b)) return true;
  return false;
}
