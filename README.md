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
| `apps/scraper/` | Scraper de precios/productos en Python. | 🏗️ Estructura lista, sin scrapers reales todavía (ver su README) |
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

1. Investigar y validar (legal + técnicamente) el primer scraper real —
   ver el checklist en `apps/scraper/README.md` — para tener datos de
   precios reales en vez de los de prueba (`npm run seed` en `apps/api`,
   ver `docs/ARCHITECTURE.md`).
2. Repo en Git/GitHub como parte del portafolio.
3. Pulir UX de `apps/web` (estados de error más específicos, paginación en
   el comparador).
4. Diseñar cómo se va a representar "calidad" en el modelo de datos (hoy
   `price_quality_preference` se guarda pero el comparador solo ordena por
   precio — falta la señal de calidad en sí).
