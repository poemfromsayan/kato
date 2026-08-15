# Katö

Este chat de Claude es la versión que manejo en mi MacBook Air portátil, el chat original donde trabajo y modifico este proyecto es mi Mac mini de escritorio, cualquier cambio que se haga desde aquí debería de ser anotado como tal para poder diferenciarlos.

App de nutrición y economía doméstica para Costa Rica. Compara precios y
datos nutricionales de productos entre supermercados (vía web scraping a
sus e-commerce oficiales), y usa IA para leer un plan nutricional en PDF y
convertirlo en una lista de compras según precio, calidad, o un balance
entre ambos.

## Estructura

| Carpeta | Qué es | Estado |
|---|---|---|
| `design-system/` | Sistema de diseño (HTML/CSS/JS de un solo archivo) — tokens y componentes ya elegidos. | ✅ Listo |
| `apps/api/` | Backend: Node.js + Express + PostgreSQL. | ✅ Auth, productos, precios, planes nutricionales (subir/listar/detalle) |
| `apps/scraper/` | Scraper de precios/productos en Python. | ✅ Automercado real implementado y verificado (200 productos reales); MaxiPalí/Walmart/Más x Menos descartados por ToS, PriceSmart pendiente (ver su README) |
| `apps/web/` | Frontend de la app (html.js, SPA con router propio). | ✅ Login/registro, dashboard, comparador, subir plan, perfil/preferencias — probado end-to-end |
| `docs/` | `ARCHITECTURE.md` y `DATA_MODEL.md` — por qué está construido así. | ✅ |

## Empezar

Ver `docs/ARCHITECTURE.md` → sección "Cómo levantar el proyecto localmente".

## Decisiones de stack (resumen)

- **Backend:** Node.js + Express + PostgreSQL, en vez de Firebase — el
  catálogo de precios por tienda y en el tiempo es un caso de uso
  relacional.
- **Scraping:** Python (Playwright + BeautifulSoup), separado del backend.
- **IA:** Claude, con un rol deliberadamente angosto — solo extrae
  estructura de un PDF, nunca decide precios reales (ver `docs/DATA_MODEL.md`).

## Próximos pasos

1. Correr el scraper de Automercado a escala completa (sin
   `--max-pages-per-category`) y decidir una cadencia (cron/scheduled
   task) para mantener los precios frescos.
2. Evaluar un segundo scraper — se investigaron 8 candidatos en total
   (Automercado, MaxiPalí, Walmart CR, Más x Menos, PriceSmart, PALÍ, Fresh
   Market, Perimercados) más la vía MEIC (herramienta interactiva y
   reportes PDF); de todos, **solo Automercado no prohíbe scraping por
   contrato** (ver `apps/scraper/README.md` para el detalle de cada uno —
   la mayoría de las cadenas grandes de Costa Rica prohíben explícitamente
   "extracción de datos"/"minería de datos"/"spiders" en su ToS). Antes de
   seguir buscando un candidato #9, vale la pena decidir con calma: (a)
   investigar súpers más pequeños/regionales/independientes que quizás no
   tengan ToS tan restrictivo, o (b) aceptar que Automercado es la única
   fuente automatizable por ahora y construir el resto del valor del
   producto (comparador, plan nutricional, UX) sobre esa única fuente real
   más los datos de prueba para las demás tiendas.
3. Pulir UX de `apps/web` (estados de error más específicos, paginación en
   el comparador).
4. Diseñar cómo se va a representar "calidad" en el modelo de datos (hoy
   `price_quality_preference` se guarda pero el comparador solo ordena por
   precio — falta la señal de calidad en sí).
5. Mejorar el emparejamiento de productos (`find_or_create_product` en
   `apps/scraper/src/db.py`) — el heurístico actual (similitud de texto)
   es un punto de partida, no la solución final; puede fusionar productos
   que en realidad son distintos.

## Notas — sesión MacBook Air

### 2026-08-15 — Continuación del punto 2 (segundo scraper)

Se retomó la investigación de candidatos del punto 2 de arriba. Dos
descartados, uno pendiente:

- **MegaSuper** — ❌ descartado. Su ToS (`megasuper.com/terminosycondiciones`)
  prohíbe explícitamente "mecanismos o herramientas automatizadas... cuya
  finalidad sea realizar la extracción, obtención o recopilación... de
  cualquier información contenida en el sitio", y nombra literalmente
  "spiders, robots, avatars o agentes inteligentes" — mismo criterio que
  cerró Walmart CR.
- **Super Online Costa Rica** — ❌ descartado. No tiene sitio propio, solo
  una página de Facebook — no hay catálogo real que scrapear.
- **Compre Bien** (Palmares, Esparza, San Carlos, Cañas, Grecia) — ⏳
  **pendiente**. Cadena regional genuinamente independiente (34 años, sin
  relación con Walmart/Grupo Olímpica), `robots.txt` permisivo y catálogo
  real por sucursal (nopCommerce). Su plataforma de compra en línea estaba
  caída al momento de revisarla (las 3 sucursales chequeadas mostraban
  "Tienda cerrada", incluso bloqueando la página de "Condiciones de uso"),
  así que no se pudo confirmar el ToS completo. Reintentar cuando esté
  activa — detalle completo en `apps/scraper/README.md`, sección "Tercera
  ronda de candidatos". Si el ToS resulta limpio, sería el segundo scraper
  real del proyecto.

Contexto de mercado (no cambia el análisis anterior): ya existen
comparadores de precios operando en Costa Rica — **AhorraYa**
(Next Path Solutions) y **Mi Comparador CR**. AhorraYa monitorea 23
cadenas incluyendo varias que este proyecto descartó por ToS (Walmart,
MaxiPalí, Más x Menos, PriceSmart, MegaSuper), y su propio blog dice que
extrae los datos directamente de los sitios oficiales sin mencionar
alianzas. Katö mantiene su criterio de respetar el ToS de cada tienda
independientemente de lo que hagan otros.