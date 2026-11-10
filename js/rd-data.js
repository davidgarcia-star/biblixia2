/* =========================================================
   BIBLIXIA 2 · DATOS DE REPÚBLICA DOMINICANA
   Coordenadas reales (longitud, latitud). Escala del juego 1:2 → 1 km real = 500 unidades (≈ metros).
   Norte = −z, Este = +x. Alturas en unidades (metros reales ÷ 2).
   ========================================================= */
export const KM = 500;
const LON0 = -70.4, LAT0 = 18.75, KX = 105.1 * KM, KZ = 111 * KM;
export const toXZ = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
export const toLonLat = (x, z) => [x / KX + LON0, -z / KZ + LAT0];
export const BOUNDS = (() => { const [x0, z0] = toXZ(-72.95, 20.12), [x1, z1] = toXZ(-67.95, 17.38); return { x0, x1, z0, z1 }; })();

/* ---------- Contorno de República Dominicana ---------- */
// Frontera con Haití, de sur (Pedernales) a norte (Dajabón / río Masacre)
export const BORDER = [[-71.76, 18.03], [-71.74, 18.15], [-71.78, 18.30], [-71.90, 18.40], [-71.94, 18.52], [-71.95, 18.62], [-71.80, 18.75], [-71.74, 18.88], [-71.72, 19.00], [-71.70, 19.15], [-71.65, 19.30], [-71.73, 19.50], [-71.75, 19.71]];
// Costa, de Monte Cristi hacia el este y luego por el sur hasta Pedernales
const COAST = [
  [-71.70, 19.78], [-71.66, 19.89], [-71.50, 19.90], [-71.30, 19.86], [-71.10, 19.88], [-70.95, 19.90], [-70.82, 19.84], [-70.69, 19.81], [-70.52, 19.77], [-70.40, 19.76],
  [-70.20, 19.70], [-70.08, 19.65], [-69.90, 19.64], [-69.85, 19.50], [-69.84, 19.38], [-69.75, 19.30], [-69.65, 19.31], [-69.53, 19.33], [-69.35, 19.36], [-69.18, 19.37],
  [-69.13, 19.30], [-69.20, 19.23], [-69.34, 19.19], [-69.50, 19.20], [-69.61, 19.22], [-69.70, 19.15], [-69.62, 19.08], [-69.45, 19.07], [-69.38, 19.06], [-69.20, 19.02],
  [-69.04, 18.99], [-68.85, 18.93], [-68.70, 18.82], [-68.55, 18.75], [-68.42, 18.68], [-68.32, 18.61], [-68.36, 18.52], [-68.40, 18.42], [-68.55, 18.36], [-68.70, 18.34],
  [-68.84, 18.36], [-68.97, 18.41], [-69.15, 18.43], [-69.30, 18.44], [-69.45, 18.43], [-69.61, 18.44], [-69.75, 18.45], [-69.88, 18.46], [-70.02, 18.41], [-70.17, 18.26],
  [-70.33, 18.23], [-70.53, 18.19], [-70.62, 18.27], [-70.70, 18.33], [-70.85, 18.30], [-71.00, 18.30], [-71.08, 18.21], [-71.12, 18.05], [-71.17, 17.98], [-71.28, 17.88],
  [-71.35, 17.75], [-71.42, 17.62], [-71.52, 17.70], [-71.63, 17.82], [-71.70, 17.92],
];
export const RD = [[-71.75, 19.71], ...COAST, ...BORDER.slice(0, -1)];
// Haití (al oeste): se dibuja como tierra, pero no se puede cruzar la frontera
export const HAITI = [[-71.75, 19.71], [-72.30, 19.74], [-72.95, 19.93], [-72.95, 18.22], [-72.30, 18.22], ...BORDER.slice(0, -1)];
export const ISLANDS = [
  { name: 'Isla Saona', poly: [[-68.92, 18.18], [-68.78, 18.21], [-68.60, 18.20], [-68.56, 18.15], [-68.70, 18.11], [-68.86, 18.13]] },
  { name: 'Isla Catalina', poly: [[-69.03, 18.37], [-68.99, 18.38], [-68.97, 18.35], [-69.01, 18.34]] },
  { name: 'Isla Beata', poly: [[-71.55, 17.62], [-71.50, 17.62], [-71.48, 17.56], [-71.54, 17.55]] },
  { name: 'Cayo Levantado', poly: [[-69.275, 19.172], [-69.25, 19.176], [-69.245, 19.163], [-69.268, 19.161]] },
];
export const LAKES = [
  { name: 'Lago Enriquillo', poly: [[-71.84, 18.52], [-71.72, 18.56], [-71.55, 18.55], [-71.42, 18.52], [-71.50, 18.46], [-71.70, 18.47]] },
  { name: 'Laguna de Oviedo', poly: [[-71.40, 17.82], [-71.35, 17.83], [-71.34, 17.79], [-71.39, 17.78]] },
  { name: 'Presa de Tavera', poly: [[-70.74, 19.29], [-70.71, 19.30], [-70.70, 19.27], [-70.73, 19.265]] },
];
// Ríos principales (se dibujan como cintas de agua)
export const RIVERS = [
  { name: 'Río Yaque del Norte', pts: [[-70.95, 19.05], [-70.75, 19.20], [-70.70, 19.40], [-70.90, 19.52], [-71.10, 19.58], [-71.40, 19.70], [-71.63, 19.82]] },
  { name: 'Río Ozama', pts: [[-69.80, 18.75], [-69.85, 18.60], [-69.88, 18.47]] },
  { name: 'Río Yuna', pts: [[-70.40, 18.95], [-70.15, 19.10], [-69.90, 19.15], [-69.70, 19.17]] },
  { name: 'Río Yaque del Sur', pts: [[-71.00, 18.90], [-71.05, 18.60], [-71.12, 18.40], [-71.05, 18.25]] },
  { name: 'Río Chavón', pts: [[-68.85, 18.70], [-68.90, 18.50], [-68.91, 18.38]] },
  { name: 'Río Masacre (frontera)', pts: [[-71.70, 19.40], [-71.72, 19.55], [-71.75, 19.71]] },
];

/* ---------- Montañas: [lon, lat, altura] y ancho (km) ---------- */
export const RIDGES = [
  { name: 'Cordillera Central', w: 24, pts: [[-71.62, 19.18, 800], [-71.25, 19.08, 1150], [-71.00, 19.03, 1560], [-70.80, 18.92, 1250], [-70.60, 18.78, 1000], [-70.40, 18.62, 650], [-70.20, 18.55, 280]] },
  { name: 'Cordillera Septentrional', w: 8, pts: [[-71.15, 19.62, 300], [-70.80, 19.62, 620], [-70.45, 19.58, 560], [-70.10, 19.50, 260]] },
  { name: 'Sierra de Neiba', w: 10, pts: [[-71.75, 18.70, 700], [-71.40, 18.65, 1120], [-71.05, 18.62, 600]] },
  { name: 'Sierra de Bahoruco', w: 12, pts: [[-71.70, 18.20, 750], [-71.45, 18.15, 1170], [-71.20, 18.10, 600]] },
  { name: 'Cordillera Oriental', w: 8, pts: [[-69.75, 18.88, 200], [-69.35, 18.85, 360], [-68.95, 18.80, 180]] },
  { name: 'Montañas de Samaná', w: 4, pts: [[-69.60, 19.28, 150], [-69.35, 19.29, 300], [-69.20, 19.29, 120]] },
  { name: 'Sierra Martín García', w: 5, pts: [[-71.05, 18.34, 650], [-70.85, 18.37, 450]] },
  { name: 'Macizo de la Selle (Haití)', w: 16, pts: [[-72.9, 18.40, 900], [-72.3, 18.42, 1300], [-71.95, 18.35, 700]] },
  { name: 'Montañas del norte de Haití', w: 14, pts: [[-72.0, 19.0, 600], [-72.6, 19.4, 700]] },
];

/* ---------- Las 32 provincias (31 + Distrito Nacional) con su capital ---------- */
export const PROVINCES = [
  { id: 'dn', name: 'Distrito Nacional', cap: 'Santo Domingo de Guzmán', lon: -69.931, lat: 18.486, big: 3, region: 'Ozama' },
  { id: 'sdo', name: 'Santo Domingo', cap: 'Santo Domingo Este', lon: -69.857, lat: 18.495, big: 2, region: 'Ozama' },
  { id: 'azua', name: 'Azua', cap: 'Azua de Compostela', lon: -70.735, lat: 18.453, region: 'Valdesia' },
  { id: 'bahoruco', name: 'Bahoruco', cap: 'Neiba', lon: -71.419, lat: 18.481, region: 'Enriquillo' },
  { id: 'barahona', name: 'Barahona', cap: 'Santa Cruz de Barahona', lon: -71.101, lat: 18.209, big: 1, region: 'Enriquillo' },
  { id: 'dajabon', name: 'Dajabón', cap: 'Dajabón', lon: -71.708, lat: 19.549, region: 'Cibao Noroeste' },
  { id: 'duarte', name: 'Duarte', cap: 'San Francisco de Macorís', lon: -70.253, lat: 19.301, big: 1, region: 'Cibao Nordeste' },
  { id: 'eliaspina', name: 'Elías Piña', cap: 'Comendador', lon: -71.705, lat: 18.877, region: 'El Valle' },
  { id: 'elseibo', name: 'El Seibo', cap: 'Santa Cruz de El Seibo', lon: -69.039, lat: 18.766, region: 'Higüamo' },
  { id: 'espaillat', name: 'Espaillat', cap: 'Moca', lon: -70.525, lat: 19.394, region: 'Cibao Norte' },
  { id: 'hatomayor', name: 'Hato Mayor', cap: 'Hato Mayor del Rey', lon: -69.257, lat: 18.763, region: 'Higüamo' },
  { id: 'hmirabal', name: 'Hermanas Mirabal', cap: 'Salcedo', lon: -70.417, lat: 19.377, region: 'Cibao Nordeste' },
  { id: 'independencia', name: 'Independencia', cap: 'Jimaní', lon: -71.851, lat: 18.493, region: 'Enriquillo' },
  { id: 'altagracia', name: 'La Altagracia', cap: 'Salvaleón de Higüey', lon: -68.708, lat: 18.615, big: 1, region: 'Yuma' },
  { id: 'laromana', name: 'La Romana', cap: 'La Romana', lon: -68.973, lat: 18.427, big: 1, region: 'Yuma' },
  { id: 'lavega', name: 'La Vega', cap: 'Concepción de La Vega', lon: -70.530, lat: 19.222, big: 1, region: 'Cibao Sur' },
  { id: 'mts', name: 'María Trinidad Sánchez', cap: 'Nagua', lon: -69.847, lat: 19.383, region: 'Cibao Nordeste' },
  { id: 'mnouel', name: 'Monseñor Nouel', cap: 'Bonao', lon: -70.409, lat: 18.937, region: 'Cibao Sur' },
  { id: 'montecristi', name: 'Monte Cristi', cap: 'San Fernando de Monte Cristi', lon: -71.645, lat: 19.848, region: 'Cibao Noroeste' },
  { id: 'monteplata', name: 'Monte Plata', cap: 'Monte Plata', lon: -69.784, lat: 18.807, region: 'Higüamo' },
  { id: 'pedernales', name: 'Pedernales', cap: 'Pedernales', lon: -71.744, lat: 18.038, region: 'Enriquillo' },
  { id: 'peravia', name: 'Peravia', cap: 'Baní', lon: -70.332, lat: 18.280, region: 'Valdesia' },
  { id: 'puertoplata', name: 'Puerto Plata', cap: 'San Felipe de Puerto Plata', lon: -70.688, lat: 19.790, big: 1, region: 'Cibao Norte' },
  { id: 'samana', name: 'Samaná', cap: 'Santa Bárbara de Samaná', lon: -69.336, lat: 19.208, region: 'Cibao Nordeste' },
  { id: 'sancristobal', name: 'San Cristóbal', cap: 'San Cristóbal', lon: -70.106, lat: 18.417, big: 1, region: 'Valdesia' },
  { id: 'ocoa', name: 'San José de Ocoa', cap: 'San José de Ocoa', lon: -70.506, lat: 18.546, region: 'Valdesia' },
  { id: 'sanjuan', name: 'San Juan', cap: 'San Juan de la Maguana', lon: -71.229, lat: 18.806, big: 1, region: 'El Valle' },
  { id: 'sanpedro', name: 'San Pedro de Macorís', cap: 'San Pedro de Macorís', lon: -69.309, lat: 18.454, big: 1, region: 'Higüamo' },
  { id: 'sramirez', name: 'Sánchez Ramírez', cap: 'Cotuí', lon: -70.149, lat: 19.053, region: 'Cibao Sur' },
  { id: 'santiago', name: 'Santiago', cap: 'Santiago de los Caballeros', lon: -70.697, lat: 19.452, big: 2, region: 'Cibao Norte' },
  { id: 'srodriguez', name: 'Santiago Rodríguez', cap: 'San Ignacio de Sabaneta', lon: -71.341, lat: 19.477, region: 'Cibao Noroeste' },
  { id: 'valverde', name: 'Valverde', cap: 'Mao', lon: -71.078, lat: 19.552, region: 'Cibao Noroeste' },
];
export const PROV = Object.fromEntries(PROVINCES.map(p => [p.id, p]));

/* ---------- Carreteras principales (provincias y puntos intermedios) ---------- */
export const ROADS = [
  { name: 'Autopista Duarte', main: true, path: ['dn', [-70.10, 18.62], [-70.30, 18.82], 'mnouel', 'lavega', 'santiago', [-70.88, 19.56], 'valverde', [-71.35, 19.68], 'montecristi'] },
  { name: 'Carretera Santiago – Puerto Plata', main: true, path: ['santiago', [-70.70, 19.62], 'puertoplata'] },
  { name: 'Autopista de Las Américas y del Este', main: true, path: ['dn', 'sdo', [-69.67, 18.45], 'sanpedro', 'laromana', [-68.85, 18.52], 'altagracia', [-68.45, 18.60], [-68.37, 18.56]] },
  { name: 'Autopista 6 de Noviembre y Carretera Sánchez', main: true, path: ['dn', [-70.03, 18.44], 'sancristobal', 'peravia', [-70.55, 18.38], 'azua', [-70.95, 18.40], 'barahona'] },
  { name: 'Carretera Barahona – Pedernales', path: ['barahona', [-71.15, 18.00], [-71.28, 17.90], [-71.40, 17.80], [-71.58, 17.92], 'pedernales'] },
  { name: 'Carretera Azua – San Juan – Elías Piña', path: ['azua', [-70.98, 18.60], 'sanjuan', [-71.48, 18.86], 'eliaspina'] },
  { name: 'Carretera del Lago Enriquillo', path: ['barahona', [-71.20, 18.40], 'bahoruco', [-71.62, 18.44], 'independencia'] },
  { name: 'Carretera de la Línea Noroeste', path: ['montecristi', 'dajabon', 'srodriguez', 'valverde'] },
  { name: 'Carretera del Cibao Oriental', path: ['santiago', 'espaillat', 'hmirabal', 'duarte', [-70.00, 19.36], 'mts'] },
  { name: 'Carretera de Samaná', path: ['mts', [-69.75, 19.28], [-69.61, 19.22], 'samana'] },
  { name: 'Autopista del Nordeste', main: true, path: ['sdo', [-69.72, 18.78], [-69.66, 19.05], [-69.61, 19.22]] },
  { name: 'Carretera de Monte Plata y Cotuí', path: ['dn', [-69.85, 18.65], 'monteplata', [-69.98, 18.95], 'sramirez', 'duarte'] },
  { name: 'Carretera Cotuí – La Vega', path: ['sramirez', [-70.35, 19.12], 'lavega'] },
  { name: 'Carretera del Este (El Seibo)', path: ['sdo', [-69.55, 18.62], 'hatomayor', 'elseibo', [-68.86, 18.70], 'altagracia'] },
  { name: 'Carretera San Pedro – Hato Mayor', path: ['sanpedro', [-69.28, 18.62], 'hatomayor'] },
  { name: 'Carretera de Ocoa', path: ['peravia', [-70.42, 18.42], 'ocoa'] },
  { name: 'Carretera de Jarabacoa y Constanza', path: ['lavega', [-70.64, 19.12], [-70.70, 19.00], [-70.74, 18.91]] },
  { name: 'Carretera Turística de la Costa Norte', path: ['puertoplata', [-70.52, 19.75], [-70.40, 19.74], [-70.20, 19.67], [-70.08, 19.63], [-69.92, 19.60], 'mts'] },
  // --- más carreteras ---
  { name: 'Carretera Higüey – Miches – Sabana de la Mar', path: ['altagracia', [-68.80, 18.80], [-69.04, 18.985], [-69.20, 19.02], [-69.385, 19.065]] },
  { name: 'Carretera Hato Mayor – Sabana de la Mar', path: ['hatomayor', [-69.33, 18.92], [-69.385, 19.06]] },
  { name: 'Carretera La Romana – Bayahíbe', path: ['laromana', [-68.88, 18.40], [-68.84, 18.37]] },
  { name: 'Carretera Higüey – Boca de Yuma', path: ['altagracia', [-68.65, 18.48], [-68.61, 18.38]] },
  { name: 'Carretera Punta Cana – Bávaro – Uvero Alto', path: [[-68.37, 18.56], [-68.41, 18.68], [-68.55, 18.80]] },
  { name: 'Carretera Puerto Plata – Luperón – Monte Cristi', path: ['puertoplata', [-70.95, 19.85], [-71.25, 19.76], [-71.45, 19.75], 'montecristi'] },
  { name: 'Carretera Cabo Rojo – Bahía de las Águilas', path: ['pedernales', [-71.66, 17.91], [-71.62, 17.86]] },
  { name: 'Carretera Constanza – Valle Nuevo – San José de Ocoa', path: [[-70.74, 18.91], [-70.65, 18.76], 'ocoa'] },
  { name: 'Camino a La Ciénaga (Pico Duarte)', path: [[-70.64, 19.12], [-70.80, 19.08], [-70.87, 19.06]] },
  { name: 'Carretera Azua – Padre Las Casas', path: ['azua', [-70.85, 18.62], [-70.94, 18.73]] },
  { name: 'Carretera Santiago – San José de las Matas', path: ['santiago', [-70.85, 19.38], [-70.94, 19.34]] },
  { name: 'Carretera Moca – Gaspar Hernández', path: ['espaillat', [-70.42, 19.52], [-70.28, 19.63]] },
  { name: 'Carretera Bonao – Constanza', path: ['mnouel', [-70.58, 18.95], [-70.74, 18.91]] },
  { name: 'Carretera Baní – Las Calderas', path: ['peravia', [-70.45, 18.24], [-70.52, 18.22]] },
  // --- avenidas de Santo Domingo y Santiago ---
  { name: 'Malecón (Av. George Washington)', city: true, path: [[-69.960, 18.452], [-69.930, 18.458], [-69.905, 18.462], [-69.885, 18.470]] },
  { name: 'Avenida 27 de Febrero', city: true, path: [[-69.995, 18.468], [-69.955, 18.476], [-69.925, 18.481], [-69.895, 18.486]] },
  { name: 'Avenida John F. Kennedy', city: true, path: [[-69.990, 18.492], [-69.950, 18.490], [-69.915, 18.489]] },
  { name: 'Avenida Máximo Gómez', city: true, path: [[-69.905, 18.458], [-69.906, 18.485], [-69.905, 18.515]] },
  { name: 'Avenida Winston Churchill', city: true, path: [[-69.947, 18.448], [-69.945, 18.475], [-69.942, 18.500]] },
  { name: 'Avenida Abraham Lincoln', city: true, path: [[-69.935, 18.455], [-69.934, 18.478], [-69.932, 18.497]] },
  { name: 'Avenida Charles de Gaulle', city: true, path: [[-69.835, 18.470], [-69.832, 18.515], [-69.828, 18.560]] },
  { name: 'Avenida Estrella Sadhalá (Santiago)', city: true, path: [[-70.705, 19.435], [-70.698, 19.455], [-70.690, 19.480]] },
  // --- más avenidas reales del Gran Santo Domingo (trazado aproximado) ---
  { name: 'Avenida Independencia', city: true, path: [[-69.893, 18.471], [-69.906, 18.468], [-69.930, 18.463], [-69.958, 18.457], [-69.990, 18.450]] },
  { name: 'Avenida Bolívar', city: true, path: [[-69.896, 18.474], [-69.915, 18.471], [-69.940, 18.467]] },
  { name: 'Avenida Duarte', city: true, path: [[-69.893, 18.476], [-69.896, 18.490], [-69.900, 18.512]] },
  { name: 'Avenida Tiradentes', city: true, path: [[-69.925, 18.468], [-69.926, 18.483], [-69.926, 18.500]] },
  { name: 'Avenida Ortega y Gasset', city: true, path: [[-69.917, 18.469], [-69.917, 18.485], [-69.916, 18.502]] },
  { name: 'Avenida Núñez de Cáceres', city: true, path: [[-69.958, 18.458], [-69.957, 18.478], [-69.955, 18.500]] },
  { name: 'Avenida Gregorio Luperón', city: true, path: [[-69.975, 18.442], [-69.973, 18.468], [-69.970, 18.498]] },
  { name: 'Avenida Rómulo Betancourt', city: true, path: [[-69.995, 18.447], [-69.970, 18.452], [-69.948, 18.456]] },
  { name: 'Avenida Isabel Aguiar (Herrera)', city: true, path: [[-69.985, 18.462], [-69.988, 18.478], [-69.990, 18.494]] },
  { name: 'Avenida Jacobo Majluta', city: true, path: [[-69.975, 18.553], [-69.935, 18.561], [-69.895, 18.565], [-69.850, 18.560]] },
  { name: 'Avenida Hermanas Mirabal', city: true, path: [[-69.905, 18.515], [-69.910, 18.540], [-69.915, 18.565]] },
  { name: 'Avenida España (Santo Domingo Este)', city: true, path: [[-69.880, 18.472], [-69.850, 18.470], [-69.820, 18.466], [-69.790, 18.462]] },
  { name: 'Avenida Venezuela', city: true, path: [[-69.853, 18.477], [-69.853, 18.490], [-69.854, 18.502]] },
  { name: 'Avenida Sabana Larga', city: true, path: [[-69.863, 18.476], [-69.864, 18.495], [-69.866, 18.512]] },
  { name: 'Avenida San Vicente de Paúl', city: true, path: [[-69.845, 18.479], [-69.844, 18.500], [-69.843, 18.522]] },
  { name: 'Avenida Ecológica', city: true, path: [[-69.835, 18.470], [-69.805, 18.488], [-69.780, 18.505]] },
  // --- Santiago de los Caballeros ---
  { name: 'Avenida 27 de Febrero (Santiago)', city: true, path: [[-70.725, 19.462], [-70.700, 19.458], [-70.675, 19.456]] },
  { name: 'Avenida Juan Pablo Duarte (Santiago)', city: true, path: [[-70.715, 19.452], [-70.693, 19.448], [-70.668, 19.446]] },
  { name: 'Avenida Las Carreras (Santiago)', city: true, path: [[-70.703, 19.458], [-70.697, 19.450], [-70.692, 19.442]] },
  { name: 'Avenida Circunvalación (Santiago)', city: true, path: [[-70.735, 19.470], [-70.712, 19.490], [-70.680, 19.492], [-70.655, 19.475], [-70.650, 19.450]] },
  { name: 'Avenida Bartolomé Colón (Santiago)', city: true, path: [[-70.710, 19.468], [-70.690, 19.466], [-70.672, 19.468]] },
  // --- San Cristóbal ---
  { name: 'Avenida Constitución (San Cristóbal)', city: true, path: [[-70.108, 18.398], [-70.106, 18.417], [-70.103, 18.437]] },
  { name: 'Calle Padre Borbón (San Cristóbal)', city: true, path: [[-70.124, 18.414], [-70.106, 18.417], [-70.090, 18.420]] },
  { name: 'Avenida Libertad (San Cristóbal)', city: true, path: [[-70.118, 18.405], [-70.100, 18.408], [-70.085, 18.412]] },
  // --- otras ciudades ---
  { name: 'Avenida Pedro A. Rivera (La Vega)', city: true, path: [[-70.545, 19.212], [-70.530, 19.222], [-70.512, 19.236]] },
  { name: 'Avenida Independencia (San Pedro de Macorís)', city: true, path: [[-69.330, 18.452], [-69.309, 18.454], [-69.290, 18.458]] },
  { name: 'Avenida Libertad (La Romana)', city: true, path: [[-68.973, 18.410], [-68.973, 18.427], [-68.972, 18.445]] },
  { name: 'Malecón de Puerto Plata (Av. Luis Ginebra)', city: true, path: [[-70.705, 19.800], [-70.688, 19.797], [-70.665, 19.790], [-70.645, 19.784]] },
  { name: 'Avenida Laguna Llana (Higüey)', city: true, path: [[-68.725, 18.605], [-68.708, 18.615], [-68.690, 18.625]] },
  { name: 'Avenida Antonio Guzmán (San Francisco de Macorís)', city: true, path: [[-70.270, 19.295], [-70.253, 19.301], [-70.235, 19.310]] },
  { name: 'Avenida Duarte (Baní)', city: true, path: [[-70.345, 18.276], [-70.332, 18.280], [-70.318, 18.284]] },
  { name: 'Avenida Independencia (San Juan)', city: true, path: [[-71.245, 18.800], [-71.229, 18.806], [-71.212, 18.812]] },
  { name: 'Malecón de Barahona (Av. Enriquillo)', city: true, path: [[-71.098, 18.198], [-71.092, 18.210], [-71.085, 18.222]] },
];

/* ---------- Tren BIBLIXIA (dos líneas) ---------- */
export const RAILS = [
  { id: 'norte', name: 'Tren del Cibao', color: 0x1f6fd1, stops: ['dn', 'mnouel', 'lavega', 'santiago', 'puertoplata'], path: ['dn', [-70.08, 18.63], [-70.28, 18.83], 'mnouel', 'lavega', 'santiago', [-70.72, 19.63], 'puertoplata'] },
  { id: 'sur', name: 'Tren del Sur y del Este', color: 0xd1342f, stops: ['azua', 'peravia', 'sancristobal', 'dn', 'sanpedro', 'laromana', 'altagracia'], path: ['azua', [-70.55, 18.40], 'peravia', 'sancristobal', [-70.03, 18.45], 'dn', 'sdo', [-69.67, 18.47], 'sanpedro', 'laromana', [-68.86, 18.53], 'altagracia'] },
];

/* ---------- Aeropuertos reales (rumbo de la pista en grados desde el norte) ---------- */
export const AIRPORTS = [
  { id: 'sdq', name: 'Aeropuerto Internacional Las Américas', code: 'SDQ', lon: -69.669, lat: 18.430, hdg: 170, prov: 'sdo' },
  { id: 'sti', name: 'Aeropuerto Internacional del Cibao', code: 'STI', lon: -70.605, lat: 19.406, hdg: 110, prov: 'santiago' },
  { id: 'puj', name: 'Aeropuerto Internacional de Punta Cana', code: 'PUJ', lon: -68.363, lat: 18.567, hdg: 90, prov: 'altagracia' },
  { id: 'pop', name: 'Aeropuerto Internacional Gregorio Luperón', code: 'POP', lon: -70.570, lat: 19.758, hdg: 80, prov: 'puertoplata' },
  { id: 'lrm', name: 'Aeropuerto Internacional de La Romana', code: 'LRM', lon: -68.912, lat: 18.451, hdg: 110, prov: 'laromana' },
  { id: 'azs', name: 'Aeropuerto Internacional El Catey', code: 'AZS', lon: -69.742, lat: 19.267, hdg: 60, prov: 'samana' },
  { id: 'brx', name: 'Aeropuerto Internacional María Montez', code: 'BRX', lon: -71.120, lat: 18.252, hdg: 110, prov: 'barahona' },
  { id: 'jbq', name: 'Aeropuerto Internacional La Isabela', code: 'JBQ', lon: -69.986, lat: 18.573, hdg: 0, prov: 'dn' },
];

/* ---------- Puertos y muelles (lanchas) ---------- */
export const PORTS = [
  { name: 'Puerto de Santo Domingo', lon: -69.880, lat: 18.465 },
  { name: 'Boca Chica', lon: -69.605, lat: 18.445 },
  { name: 'Bayahíbe (hacia Saona)', lon: -68.840, lat: 18.365 },
  { name: 'Samaná (ballenas jorobadas)', lon: -69.336, lat: 19.195 },
  { name: 'Sabana de la Mar', lon: -69.385, lat: 19.065 },
  { name: 'Puerto Plata', lon: -70.690, lat: 19.812 },
  { name: 'Monte Cristi', lon: -71.655, lat: 19.875 },
  { name: 'Barahona', lon: -71.085, lat: 18.205 },
  { name: 'Cabo Rojo (Bahía de las Águilas)', lon: -71.665, lat: 17.900 },
  { name: 'Punta Cana', lon: -68.365, lat: 18.520 },
  { name: 'La Romana', lon: -68.965, lat: 18.412 },
];

/* ---------- Lugares famosos: tipo de monumento, provincia y texto ---------- */
export const PLACES = [
  { id: 'colonial', name: 'Zona Colonial', type: 'catedral', prov: 'dn', lon: -69.884, lat: 18.473, text: 'La primera ciudad europea de América. Aquí están la Catedral Primada de América, el Alcázar de Colón, la calle El Conde y el Parque Colón.' },
  { id: 'malecon', name: 'Malecón y Obelisco', type: 'obelisco', prov: 'dn', lon: -69.905, lat: 18.462, text: 'El Malecón de Santo Domingo bordea el mar Caribe. El Obelisco es uno de sus símbolos.' },
  { id: 'faro', name: 'Faro a Colón', type: 'faro', prov: 'sdo', lon: -69.866, lat: 18.479, text: 'Gran monumento en forma de cruz. De noche proyecta al cielo una cruz de luz que se ve desde muy lejos.' },
  { id: 'tresojos', name: 'Los Tres Ojos', type: 'cueva', prov: 'sdo', lon: -69.850, lat: 18.473, text: 'Parque con cuevas y lagos subterráneos de agua cristalina en Santo Domingo Este.' },
  { id: 'jardin', name: 'Jardín Botánico Nacional', type: 'parque', prov: 'dn', lon: -69.955, lat: 18.495, text: 'El jardín botánico más grande del Caribe, con plantas de toda la isla.' },
  { id: 'monumento', name: 'Monumento a los Héroes de la Restauración', type: 'columna', prov: 'santiago', lon: -70.692, lat: 19.451, text: 'Símbolo de Santiago de los Caballeros, en honor a los héroes de la Guerra de la Restauración.' },
  { id: 'basilica', name: 'Basílica de Higüey', type: 'basilica', prov: 'altagracia', lon: -68.712, lat: 18.612, text: 'Gran templo de Salvaleón de Higüey con un enorme arco de concreto. La visitan miles de personas.' },
  { id: 'chavon', name: 'Altos de Chavón', type: 'iglesia', prov: 'laromana', lon: -68.910, lat: 18.420, text: 'Pueblo de piedra estilo mediterráneo sobre el río Chavón, con anfiteatro e iglesia.' },
  { id: 'morro', name: 'El Morro de Monte Cristi', type: 'morro', prov: 'montecristi', lon: -71.672, lat: 19.888, text: 'Gran montaña de cima plana junto al mar en el Parque Nacional Monte Cristi.' },
  { id: 'teleferico', name: 'Teleférico y Loma Isabel de Torres', type: 'teleferico', prov: 'puertoplata', lon: -70.706, lat: 19.770, text: 'El único teleférico del Caribe sube a la loma, donde hay un Cristo Redentor y un jardín.' },
  { id: 'fortaleza', name: 'Fortaleza San Felipe', type: 'fuerte', prov: 'puertoplata', lon: -70.697, lat: 19.803, text: 'Fortaleza del siglo XVI a la entrada de la bahía de Puerto Plata.' },
  { id: 'picoduarte', name: 'Pico Duarte', type: 'pico', prov: 'santiago', lon: -71.000, lat: 19.030, text: 'La montaña más alta del Caribe: 3.098 metros. En la cima hay un busto de Juan Pablo Duarte y la bandera.' },
  { id: 'constanza', name: 'Valle de Constanza', type: 'valle', prov: 'lavega', lon: -70.745, lat: 18.910, text: 'Valle alto y fresco rodeado de montañas, famoso por sus fresas, flores y vegetales.' },
  { id: 'jarabacoa', name: 'Jarabacoa y Salto de Jimenoa', type: 'salto', prov: 'lavega', lon: -70.640, lat: 19.120, text: 'Ciudad de la eterna primavera, con ríos, montañas y saltos de agua.' },
  { id: 'santocerro', name: 'Santo Cerro', type: 'iglesia', prov: 'lavega', lon: -70.520, lat: 19.252, text: 'Loma con un santuario desde donde se ve todo el valle del Cibao (la Vega Real).' },
  { id: 'enriquillo', name: 'Lago Enriquillo', type: 'lago', prov: 'independencia', lon: -71.600, lat: 18.440, text: 'Lago salado, el punto más bajo del Caribe (unos 40 m bajo el nivel del mar). Hay cocodrilos americanos e iguanas.' },
  { id: 'aguilas', name: 'Bahía de las Águilas', type: 'playa', prov: 'pedernales', lon: -71.625, lat: 17.845, text: 'Una de las playas más bellas y vírgenes del país, en el Parque Nacional Jaragua.' },
  { id: 'pelempito', name: 'Hoyo de Pelempito', type: 'mirador', prov: 'pedernales', lon: -71.400, lat: 18.170, text: 'Gran depresión en la Sierra de Bahoruco con un mirador impresionante.' },
  { id: 'saona', name: 'Isla Saona', type: 'playa', prov: 'altagracia', lon: -68.720, lat: 18.160, text: 'La isla más grande del país, con palmeras, arena blanca y piscinas naturales con estrellas de mar.' },
  { id: 'haitises', name: 'Parque Nacional Los Haitises', type: 'mogotes', prov: 'samana', lon: -69.580, lat: 19.000, text: 'Mogotes cubiertos de selva, manglares y cuevas con dibujos taínos frente a la bahía de Samaná.' },
  { id: 'rincon', name: 'Playa Rincón y Las Galeras', type: 'playa', prov: 'samana', lon: -69.200, lat: 19.300, text: 'Playas de arena blanca y aguas tranquilas en la península de Samaná.' },
  { id: 'limon', name: 'Salto El Limón', type: 'salto', prov: 'samana', lon: -69.440, lat: 19.280, text: 'Cascada de unos 40 metros en medio del bosque. Se llega a pie o a caballo.' },
  { id: 'dunas', name: 'Dunas de Baní', type: 'dunas', prov: 'peravia', lon: -70.520, lat: 18.225, text: 'Grandes dunas de arena junto al mar en Las Calderas, Peravia.' },
  { id: 'pomier', name: 'Cuevas del Pomier', type: 'cueva', prov: 'sancristobal', lon: -70.130, lat: 18.520, text: 'Cuevas con miles de dibujos taínos. San Cristóbal es la ciudad de la primera Constitución dominicana (6 de noviembre de 1844).' },
  { id: 'boca', name: 'Playa de Boca Chica', type: 'playa', prov: 'sdo', lon: -69.605, lat: 18.452, text: 'Playa de aguas tranquilas y poco profundas, muy cerca de la capital.' },
  { id: 'puntacana', name: 'Playas de Punta Cana y Bávaro', type: 'playa', prov: 'altagracia', lon: -68.410, lat: 18.640, text: 'Kilómetros de playas de arena blanca con palmeras en el extremo este de la isla.' },
  { id: 'reloj', name: 'Reloj de Monte Cristi', type: 'reloj', prov: 'montecristi', lon: -71.640, lat: 19.845, text: 'Reloj público traído de Francia a finales del siglo XIX, en el parque central de Monte Cristi.' },
  { id: 'mercado', name: 'Mercado binacional de Dajabón', type: 'mercado', prov: 'dajabon', lon: -71.715, lat: 19.555, text: 'Uno de los mercados más grandes del Caribe, junto al río Masacre en la frontera.' },
];

/* =========================================================
   MISIONES: llevar a cada personaje bíblico a un lugar del país.
   dest = id de una provincia o de un lugar famoso.
   ========================================================= */
export const MISSIONS = [
  { who: 'pedro', dest: 'samana', why: 'quiere echar las redes en la bahía de Samaná, donde llegan las ballenas jorobadas.' },
  { who: 'andres', dest: 'puertoplata', why: 'quiere conocer a los pescadores de la costa norte y presentarles a Jesús.' },
  { who: 'moises', dest: 'picoduarte', why: 'quiere subir al Pico Duarte, la montaña más alta, como cuando subió al monte Sinaí.' },
  { who: 'noe', dest: 'enriquillo', why: 'quiere ver el gran lago salado; ¡él sabe mucho de aguas!' },
  { who: 'david', dest: 'monteplata', why: 'busca los campos verdes de Monte Plata para cuidar ovejas, como cuando era pastor.' },
  { who: 'elias', dest: 'constanza', why: 'quiere orar en las montañas frías del valle de Constanza.' },
  { who: 'eliseo', dest: 'jarabacoa', why: 'quiere visitar los ríos de Jarabacoa, como el Jordán donde se sanó Naamán.' },
  { who: 'bautista', dest: 'valverde', why: 'busca el río Yaque del Norte para bautizar a los que se arrepienten.' },
  { who: 'samuel', dest: 'santocerro', why: 'quiere orar en el Santo Cerro y mirar todo el valle del Cibao.' },
  { who: 'natan', dest: 'santiago', why: 'lleva un mensaje importante a Santiago de los Caballeros.' },
  { who: 'isaias', dest: 'dn', why: 'quiere anunciar las buenas nuevas en la capital: «¡Heme aquí, envíame a mí!».' },
  { who: 'jeremias', dest: 'azua', why: 'quiere visitar a los alfareros de Azua y enseñar sobre el barro en las manos de Dios.' },
  { who: 'ezequiel', dest: 'sanjuan', why: 'quiere profetizar en el gran valle de San Juan de la Maguana.' },
  { who: 'daniel', dest: 'laromana', why: 'quiere orar con las ventanas abiertas mirando al mar de La Romana.' },
  { who: 'debora', dest: 'hmirabal', why: 'quiere honrar a las mujeres valientes en la provincia Hermanas Mirabal.' },
  { who: 'ana', dest: 'altagracia', why: 'quiere orar y dar gracias en Higüey, junto a la gran basílica.' },
  { who: 'pablo', dest: 'pedernales', why: 'hace un viaje misionero hasta el último pueblo del suroeste: Pedernales.' },
  { who: 'juan', dest: 'saona', why: 'quiere escribir y orar en la isla Saona, como cuando estuvo en la isla de Patmos.' },
  { who: 'jonas', dest: 'montecristi', why: 'esta vez sí quiere obedecer: ¡llévalo a predicar a Monte Cristi, junto al mar!' },
  { who: 'tomas', dest: 'dajabon', why: 'quiere ver con sus propios ojos el mercado de Dajabón en la frontera.' },
  { who: 'mateo', dest: 'sanpedro', why: 'quiere escribir sobre Jesús en San Pedro de Macorís, la tierra de los peloteros.' },
  { who: 'felipe', dest: 'elseibo', why: 'quiere contar las buenas nuevas por los caminos de El Seibo, como al etíope en el camino.' },
  { who: 'bartolome', dest: 'hatomayor', why: 'quiere sentarse bajo un árbol en Hato Mayor, como cuando Jesús lo vio bajo la higuera.' },
  { who: 'jacobo', dest: 'sramirez', why: 'quiere servir a la gente de Cotuí.' },
  { who: 'jacoboalfeo', dest: 'mnouel', why: 'quiere visitar Bonao, la ciudad de las flores.' },
  { who: 'tadeo', dest: 'bahoruco', why: 'quiere animar a los hermanos de Neiba, tierra de uvas.' },
  { who: 'simon', dest: 'eliaspina', why: 'quiere predicar la paz en Comendador, junto a la frontera.' },
  { who: 'matias', dest: 'srodriguez', why: 'quiere conocer San Ignacio de Sabaneta.' },
  { who: 'amos', dest: 'ocoa', why: 'era pastor y cultivaba higos silvestres: quiere ver los campos de San José de Ocoa.' },
  { who: 'oseas', dest: 'espaillat', why: 'quiere hablar del amor fiel de Dios a las familias de Moca.' },
  { who: 'joel', dest: 'duarte', why: 'anuncia que Dios derramará su Espíritu: llévalo a San Francisco de Macorís.' },
  { who: 'abdias', dest: 'mts', why: 'quiere visitar Nagua, frente al océano Atlántico.' },
  { who: 'miqueas', dest: 'peravia', why: 'enseña a hacer justicia y amar la misericordia: llévalo a Baní.' },
  { who: 'nahum', dest: 'independencia', why: 'quiere visitar Jimaní, cerca del lago Enriquillo.' },
  { who: 'habacuc', dest: 'pelempito', why: 'quiere subir a un mirador alto para esperar la respuesta de Dios, como en su atalaya.' },
  { who: 'sofonias', dest: 'barahona', why: 'quiere cantar de gozo en Barahona, «la Perla del Sur».' },
  { who: 'hageo', dest: 'colonial', why: 'quiere ver la Catedral Primada en la Zona Colonial: él animó a reconstruir el templo.' },
  { who: 'zacarias', dest: 'sancristobal', why: 'quiere visitar San Cristóbal, la ciudad de la primera Constitución dominicana.' },
  { who: 'malaquias', dest: 'lavega', why: 'quiere enseñar sobre la fidelidad a Dios en La Vega.' },
  { who: 'aaron', dest: 'faro', why: 'quiere ver la cruz de luz del Faro a Colón.' },
  { who: 'nino-panes', dest: 'boca', why: '¡quiere compartir sus panes y peces en la playa de Boca Chica!' },
];

/* ---------- Peajes de las autopistas (ubicación aproximada) y precio en RD$ ---------- */
export const TOLLS = [
  { name: 'Peaje de la Autopista Duarte', lon: -70.12, lat: 18.64, price: 60 },
  { name: 'Peaje de Las Américas', lon: -69.72, lat: 18.45, price: 60 },
  { name: 'Peaje de la Autopista 6 de Noviembre', lon: -70.06, lat: 18.43, price: 60 },
  { name: 'Peaje Marbella (Autopista del Este)', lon: -69.45, lat: 18.45, price: 100 },
  { name: 'Peaje de la Autopista del Coral', lon: -68.86, lat: 18.52, price: 100 },
  { name: 'Peaje de la Autopista del Nordeste (Guaraguao)', lon: -69.71, lat: 18.80, price: 120 },
  { name: 'Peaje de la Autopista del Nordeste (El Catey)', lon: -69.66, lat: 19.07, price: 120 },
  { name: 'Peaje Sánchez (Baní)', lon: -70.46, lat: 18.37, price: 60 },
];
