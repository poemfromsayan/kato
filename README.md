# Katö

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
2. Evaluar un segundo scraper — todos los demás súpers de la lista
   original quedaron descartados por ToS o por requerir membresía (ver
   `apps/scraper/README.md`); haría falta investigar otro candidato (ej.
   Fresh Market, Perimercados, PALÍ si tiene entidad legal distinta).
3. Pulir UX de `apps/web` (estados de error más específicos, paginación en
   el comparador).
4. Diseñar cómo se va a representar "calidad" en el modelo de datos (hoy
   `price_quality_preference` se guarda pero el comparador solo ordena por
   precio — falta la señal de calidad en sí).
5. Mejorar el emparejamiento de productos (`find_or_create_product` en
   `apps/scraper/src/db.py`) — el heurístico actual (similitud de texto)
   es un punto de partida, no la solución final; puede fusionar productos
   que en realidad son distintos.
