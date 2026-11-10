# BIBLIXIA 2 – ¡Recorre República Dominicana con los personajes de la Biblia!

Juego bíblico cristiano en 3D, gratis, en el navegador (computadora y celular). No hay niveles: eres el transportista de Dios. Recoges a profetas, apóstoles y personajes de la Biblia y los llevas a su destino en las **32 provincias de República Dominicana** antes de que se acabe el tiempo. Mientras viajan, cada personaje cuenta su historia en voz alta: con voz de hombre si es hombre y con voz de mujer si es mujer.

Creado por **Luis David Esteban García** de parte de **MIPROAA** – Ministerio Profético Ardiendo Por El Avivamiento.

## El mapa
- La forma real de la isla, a escala 1:2: 1 km real equivale a 500 unidades del juego. Los viajes duran de 10 minutos a más de 1 hora.
- Las 32 provincias (31 + Distrito Nacional), con su capital en las coordenadas reales. Cada una tiene plaza, iglesia, calles, edificios, letrero, bomba de combustible y parqueo de transportes.
- Cordilleras: Central (con el **Pico Duarte**), Septentrional, Oriental, Neiba, Bahoruco y Martín García. También los mogotes de Los Haitises.
- Lago Enriquillo, Laguna de Oviedo, Presa de Tavera y los ríos Yaque del Norte, Yaque del Sur, Yuna, Ozama, Chavón y Masacre.
- Las islas Saona, Catalina, Beata y Cayo Levantado.
- Autopistas y carreteras principales: Duarte, Las Américas, 6 de Noviembre, Sánchez, del Nordeste, del Coral, Costa Norte y otras.
- 🚧 **Peajes** en las autopistas, en ubicación aproximada: hay que detenerse para que suba la barrera.
- ✈️ Aeropuertos reales: Las Américas, Cibao, Punta Cana, Gregorio Luperón, La Romana, El Catey, María Montez y La Isabela.
- ⚓ Muelles con lanchas y 🚆 dos líneas de tren con sus estaciones: Tren del Cibao y Tren del Sur y del Este.
- ★ Lugares famosos: Zona Colonial, Malecón, Faro a Colón (de noche se ve su cruz de luz), Los Tres Ojos, Jardín Botánico, Monumento de Santiago, Basílica de Higüey, Altos de Chavón, El Morro, Reloj de Monte Cristi, Teleférico de Puerto Plata, Fortaleza San Felipe, Pico Duarte, Constanza, Jarabacoa, Santo Cerro, Lago Enriquillo, Bahía de las Águilas, Hoyo de Pelempito, Isla Saona, Los Haitises, Playa Rincón, Salto El Limón, Dunas de Baní, Cuevas del Pomier y otros.

## Transportes
A pie, 🚲 bicicleta, 🏍️ motor, 🚗 carro, 🚙 jeepeta, 🛻 camioneta, 🚌 guagua, 🐎 caballo, 🫏 burro, 🚤 lancha, ✈️ avión, 🚁 helicóptero y 🚆 tren. También hay tráfico en las carreteras, aviones en el cielo y trenes que paran en las estaciones.

## Combustible
Los vehículos de motor gastan combustible y en pantalla hay un medidor. Se llena en las bombas ⛽: hay una en cada provincia y otras a lo largo de las autopistas. Los aviones y helicópteros cargan en los aeropuertos y las lanchas en los muelles. Si el tanque se vacía, se puede pedir un galón de emergencia.

## Tesoros bíblicos
No hay dinero. Cada personaje que llevas a tiempo te regala un **tesoro bíblico** de su historia: las llaves del reino, el manto de Elías, la honda de David, las tablas de la Ley… En cada entrega lees un versículo de La Biblia de las Américas (LBLA), y el tiempo se detiene mientras lees. Las 🪙 monedas de fe del camino dan un versículo y 30 segundos más.

## Más
- Hora del día: día, atardecer o noche.
- Vestimentas: moderna, túnica, pastor, levita, chofer y sumo sacerdote Aarón. Estas dos últimas se desbloquean con las entregas.
- Minimapa y mapa completo de República Dominicana (tecla `M`).
- El juego se guarda solo, incluso a mitad de un viaje.
- Contador de visitantes, Inicio y Salir, PayPal «Honrar al creador» y redes sociales.

## Controles
| Acción | Computadora | Teléfono |
|---|---|---|
| Caminar / manejar | `W A S D` o flechas | Bola dorada |
| Subir, bajar, recoger, echar combustible | `T` | T |
| Correr | `Shift` o `C` | CORRER |
| Saltar / freno | `Espacio` | SALTAR / FRENO |
| Avión y helicóptero: subir / bajar | `E` / `Q` | ▲ / ▼ |
| Pito | `H` | PITO |
| Mapa · cámara · pausa · pantalla completa | `M` · `V` · `P` · `F` | 🗺 · 🎥 · ❚❚ · ⛶ |

## Ejecutar
Necesita un servidor web. Con GitHub Pages: *Settings → Pages → rama `main`, carpeta `/`*. En la computadora: `python3 -m http.server` y abrir `http://localhost:8000`.

## Archivos
- `index.html`, `css/style.css` – interfaz
- `js/game.js` – juego principal (misiones, física, menús)
- `js/rd-data.js` – datos reales de República Dominicana: contorno, provincias, carreteras, peajes, aeropuertos, puertos, lugares y misiones
- `js/terrain.js` – terreno por partes, montañas, carreteras y vías
- `js/towns.js` – pueblos, edificios, bombas, peajes, aeropuertos, estaciones y monumentos
- `js/vehicles.js`, `js/lujo.js` – transportes
- `js/human.js`, `js/characters.js` – personas y personajes bíblicos
- `js/maps.js` – minimapa y mapa completo
- `js/audio.js`, `js/audio2.js` – música (con ritmo de merengue al jugar) y sonidos
- `js/verses.js` – versículos LBLA
- `js/vendor/` – three.js (licencia MIT)

Después de cambiar algo en `js/`, ejecuta `bun build-bun.mjs` para regenerar `js/biblixia2.min.js`.

Las citas bíblicas son de La Biblia de las Américas® (LBLA), © The Lockman Foundation. Usadas con permiso.

© Luis David Esteban García · MIPROAA. Todos los derechos reservados.
