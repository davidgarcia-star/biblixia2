import { LINES } from './terrain.js';

/* =========================================================
   RUTA (GPS): camino por las carreteras desde el jugador
   hasta el personaje o el destino. Se dibuja en los mapas.
   ========================================================= */
let G = null; // { xs, zs, adj }

function buildGraph() {
  const xs = [], zs = [], adj = [];
  const add = (x, z) => { xs.push(x); zs.push(z); adj.push([]); return xs.length - 1; };
  const link = (a, b) => { const d = Math.hypot(xs[a] - xs[b], zs[a] - zs[b]); adj[a].push(b, d); adj[b].push(a, d); };
  for (const r of LINES.roads) {
    let prev = -1;
    for (const [x, z] of r.pts) { const i = add(x, z); if (prev >= 0) link(prev, i); prev = i; }
  }
  // cruces: unir puntos de carreteras distintas que están muy cerca
  const CELL = 150, grid = new Map(), key = (a, b) => a * 73856093 ^ b * 19349663;
  for (let i = 0; i < xs.length; i++) { const k = key(Math.floor(xs[i] / CELL), Math.floor(zs[i] / CELL)); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
  for (let i = 0; i < xs.length; i++) {
    const cx = Math.floor(xs[i] / CELL), cz = Math.floor(zs[i] / CELL);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = grid.get(key(cx + a, cz + b)); if (!l) continue;
      for (const j of l) if (j > i + 1 && Math.hypot(xs[i] - xs[j], zs[i] - zs[j]) < 90 && !adj[i].includes(j)) link(i, j);
    }
  }
  G = { xs, zs, adj };
}

function nearest(x, z) {
  let bi = -1, bd = 1e18;
  for (let i = 0; i < G.xs.length; i++) { const d = (G.xs[i] - x) ** 2 + (G.zs[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  return [bi, Math.sqrt(bd)];
}

// Dijkstra con montículo binario
function shortest(s, t) {
  const n = G.xs.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
  const heap = [[0, s]]; dist[s] = 0;
  const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, u] = pop(); if (d > dist[u]) continue; if (u === t) break;
    const a = G.adj[u];
    for (let k = 0; k < a.length; k += 2) { const v = a[k], nd = d + a[k + 1]; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push([nd, v]); } }
  }
  if (dist[t] === Infinity) return null;
  const out = []; for (let u = t; u >= 0; u = prev[u]) out.push([G.xs[u], G.zs[u]]);
  return out.reverse();
}

// Devuelve una lista de puntos [x, z] desde (x0, z0) hasta (x1, z1) siguiendo las carreteras
export function findRoute(x0, z0, x1, z1) {
  if (!G) buildGraph();
  if (!G.xs.length) return [[x0, z0], [x1, z1]];
  const [s] = nearest(x0, z0), [t] = nearest(x1, z1);
  const path = s === t ? [] : shortest(s, t);
  if (!path) return [[x0, z0], [x1, z1]];
  // simplificar: quitar puntos casi alineados para dibujar más rápido
  const pts = [[x0, z0], ...path, [x1, z1]], out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / (Math.hypot(c[0] - a[0], c[1] - a[1]) || 1);
    if (cross > 6 || Math.hypot(b[0] - a[0], b[1] - a[1]) > 1500) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Índice del punto de la ruta más cercano a (x, z) y su distancia
export function closestOnRoute(route, x, z, from = 0) {
  let bi = from, bd = 1e18;
  for (let i = from; i < route.length; i++) { const d = (route[i][0] - x) ** 2 + (route[i][1] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  return [bi, Math.sqrt(bd)];
}
