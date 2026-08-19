# Arquitectura — Katö

## Piezas y por qué cada una existe

```
apps/
  web/       Frontend con html.js, consume la API REST. (pendiente de construir)
  api/       Backend Node.js + Express + PostgreSQL — dueño único de la base de datos.
  scraper/   Servicio Python separado, escribe directo a la misma Postgres.
design-system/  Referencia visual (ver más abajo), no se importa desde apps/.
docs/        Este archivo y DATA_MODEL.md.
```

**Por qué dos lenguajes (Node y Python) en vez de uno solo.** El backend
(`apps/api`) es Node/Express porque expone una API REST convencional y el
frontend también es JS — un solo lenguaje ahí reduce fricción. El scraper es
Python aparte porque el ecosistema de scraping en Python (Playwright,
BeautifulSoup) es más maduro y porque es la puerta de entrada work del
usuario hacia Python, su siguiente paso técnico. Ambos comparten la MISMA
base de datos Postgres — no hay una API interna entre ellos, el scraper
inserta directamente en `store_products` / `price_snapshots` siguiendo el
esquema de `apps/api/src/db/migrations`.

**Por qué el scraper no vive dentro de `apps/api`.** Aislarlo evita que una
dependencia de scraping (Playwright, con su propio binario de Chromium)
infle el backend, y permite desplegarlo y escalarlo por separado — el
scraping corre por lotes/cron, la API responde peticiones HTTP en tiempo
real; son perfiles de carga distintos.

**Por qué Postgres y no Firebase/Firestore.** Ver la conversación de
decisión de stack: el caso de uso central (comparar precios entre tiendas y
en el tiempo) es relacional por naturaleza. Postgres además da acceso a
`pg_trgm` para búsqueda de texto difusa (usado tanto en el buscador de
productos como en el matching de nombres del scraper) sin depender de un
servicio de búsqueda aparte.

**Dónde entra Claude, y dónde termina su responsabilidad.** Dos puntos,
ambos con el mismo rol angosto: convertir algo no estructurado (PDF o foto)
en datos estructurados, nunca decidir nada que otro código pueda decidir
determinísticamente.
- `apps/api/src/services/ai/extractPlan.js` — PDF de un plan nutricional →
  lista de alimentos/cantidades.
- `apps/api/src/services/ai/extractProductScan.js` — foto(s) de un producto
  → nombre/marca/nutrición (ver "Escaneo colaborativo de productos" en
  `DATA_MODEL.md`). Ni siquiera decide si el producto ya existe en el
  catálogo — eso es `pg_trgm` — ni escribe directo en `products`: el
  resultado queda en `product_scans`, pendiente de que un admin lo confirme.

La decisión de "qué tienda es más barata" es SQL determinístico sobre
`price_snapshots`, nunca una llamada al modelo — ver la sección
correspondiente en `DATA_MODEL.md`.

## El sistema de diseño no es parte del código de la app

`design-system/index.html` es un artefacto de exploración visual — un solo
archivo con los tokens y componentes ya elegidos (acento verde lima,
Space Grotesk + Space Mono, ambos temas). Sirve como referencia para
construir `apps/web`, pero el frontend real de la app **no** va a importar
ese archivo directamente: sus tokens (colores, tipografía, spacing) se
migrarán a `apps/web` como la fuente de verdad de estilos de la aplicación,
y `design-system/` queda como documentación/muestra, no como dependencia en
tiempo de ejecución.

## Seguridad — decisiones ya tomadas, para no repetirlas sin querer

- Contraseñas: bcrypt (12 rondas), nunca texto plano. Login siempre devuelve
  el mismo mensaje de error genérico exista o no la cuenta (evita
  enumeración de usuarios).
- Todo input de usuario pasa por validación de zod (`middleware/validate.js`)
  antes de tocar una query — ninguna ruta confía en `req.body`/`req.query`
  crudos.
- Todas las queries SQL son parametrizadas (`$1, $2...` / `%s` en Python),
  nunca interpolación de strings.
- El PDF subido nunca se guarda en la base de datos — solo una referencia a
  almacenamiento de archivos (`services/storage/fileStorage.js`, hoy en
  disco local, pensado para moverse a un bucket en producción). Las fotos
  de un escaneo de producto siguen el mismo criterio, y además se sirven
  autenticadas (`GET /product-scans/:id/image/:type`, solo admin) en vez de
  por una ruta estática pública — ver "Escaneo colaborativo de productos"
  en `DATA_MODEL.md`.
- `is_admin` (tabla `users`) nunca viaja en el JWT — se consulta fresca
  contra la base en cada petición admin (`requireAdmin`), para que revocar
  el permiso sea inmediato y no dependa de que expire un token de 2h. No
  hay endpoint para otorgarlo: solo `scripts/makeAdmin.js`, corrido a mano.
- Variables de entorno se validan al arrancar (`config/env.js` en Node,
  `config.py` en Python) — el proceso falla rápido y con mensaje claro si
  falta algo, en vez de fallar a medias más adelante.
- Rate limiting diferenciado: login/registro y subida de PDFs (más costosos,
  más atractivos para abuso) tienen límites más estrictos que el resto de
  la API.
- `.env` está en `.gitignore` desde el inicio del proyecto — nunca ha
  existido un commit con secretos reales.

## Cómo levantar el proyecto localmente

```bash
# 1. Base de datos + API
createdb katofit
cd apps/api
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET (ANTHROPIC_API_KEY es opcional, ver abajo)
npm install
npm run migrate
npm run seed            # datos de prueba ficticios (tiendas, productos, precios) — opcional pero recomendado para ver la app con contenido
npm run make-admin -- tu@correo.com   # opcional: para poder entrar a /admin/escaneos
npm run dev              # http://localhost:3001

# 2. Frontend (en otra terminal)
cd apps/web
npm run dev              # http://localhost:5173

# 3. Scraper (opcional mientras no haya scrapers reales implementados)
cd apps/scraper
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
python -m pytest tests/
```

`npm test` (dentro de `apps/api`) corre los tests de los dos servicios de IA
(`extractPlan.js`, `extractProductScan.js`) contra un cliente de Anthropic
mockeado — no necesitan Postgres ni una API key real, solo verifican que la
extracción respeta el schema esperado.

`ANTHROPIC_API_KEY` es opcional: sin ella, toda la app funciona normal excepto
"Subir plan nutricional" y "Escanear producto" (devuelven un error 503 claro
en vez de romper el arranque).
`npm run seed` no borra datos existentes — si la tabla `stores` ya tiene filas,
no hace nada (para no pisar datos reales por accidente).
