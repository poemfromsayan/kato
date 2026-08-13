# Katö · Scraper (Python)

Servicio separado del backend Node — mismo Postgres, distinto lenguaje. Su
único trabajo es visitar los e-commerce de supermercados y organismos
oficiales, y dejar precios/productos normalizados en `store_products` y
`price_snapshots` (ver `docs/DATA_MODEL.md` en la raíz del proyecto).

## Antes de activar un scraper real — checklist legal/técnico

Ninguno de los scrapers en `src/scrapers/` está conectado a un sitio real
todavía. `example_store.py` es una **plantilla comentada**, no un scraper
funcional contra Automercado, MaxiPali, Walmart CR ni ningún otro sitio.
Antes de apuntar cualquiera de estos scrapers a un sitio real, hay que
revisar por cada supermercado:

1. **`robots.txt`** del sitio (`https://dominio.com/robots.txt`) — qué rutas
   prohíbe explícitamente a los crawlers.
2. **Términos de servicio** del sitio — muchos e-commerce prohíben
   explícitamente el scraping automatizado en su ToS, independientemente de
   lo que diga `robots.txt`.
3. **¿Existe una API oficial o de afiliados?** Si el supermercado ofrece una
   API (aunque sea para afiliados/partners), es preferible a scraping crudo:
   más estable, sin riesgo legal, y normalmente con mejores datos.
4. **Rate limiting propio.** Aunque el sitio lo permita, nunca golpear el
   servidor sin pausas (`REQUEST_DELAY_SECONDS` en `.env`) — es tanto una
   cuestión de buena práctica como de no tumbar el propio scraper por
   bloqueos de IP.
5. **User-Agent identificable**, no un user-agent falsificado de navegador
   genérico, para que el sitio pueda identificar y contactarnos si hay un
   problema.

Este checklist se hace **una vez por supermercado**, antes de escribir los
selectores reales, y se documenta el resultado en este README (qué se
encontró, qué se decidió).

### Resultado de la investigación (2026-08-11)

| Súper | robots.txt | Términos y condiciones | Decisión |
|---|---|---|---|
| **Automercado** | Solo bloquea `/perfil/`, `/checkout/`, `/content/` — categorías y productos permitidos. | Revisados completos (PDF público en su sitio). No contienen ninguna cláusula que prohíba bots, spiders, ni extracción automatizada de datos — a diferencia de los otros. Sí protege marcas/contenido con copyright normal. | ✅ **Candidato viable** para empezar — con buenas prácticas (ver abajo). |
| **MaxiPalí** | Permisivo (bloquea `/account/`, `/checkout/`, etc., no productos). | Comparte plataforma y entidad legal con Walmart CR y Más x Menos (mismo documento de Walmart Centroamérica). | ❌ Prohibido explícitamente — ver Walmart CR. |
| **Más x Menos** | Igual que MaxiPalí (mismo template). | Mismo documento que Walmart CR/MaxiPalí. | ❌ Prohibido explícitamente — ver Walmart CR. |
| **Walmart CR** | Permisivo. | El ToS de Walmart Centroamérica dice textualmente: *"...quedando así obligado a no utilizar o intentar utilizar cualquier máquina, software, herramienta, agente u otro dispositivo o mecanismo (incluyendo sin limitación navegadores, spiders, robots, avatars o agentes inteligentes) para navegar o buscar en este Sitio Web..."* — prohibición explícita y literal de scraping. | ❌ **Descartado.** Violaría el contrato de uso que se acepta al usar el sitio. |
| **PriceSmart** | No se pudo confirmar contenido (robots.txt no devolvió reglas claras). | No revisado a fondo — descartado antes por un obstáculo práctico más simple. | ❌ Descartado por ahora: es un club de membresía pagada: los precios reales solo se ven con cuenta activa (~$45/año), lo que rompe el caso de uso de "comparar sin pagar" y complica cualquier automatización (login autenticado, ToS de e-commerce típicamente más estrictos). |

**Conclusión:** de los 5, solo **Automercado** no tiene una prohibición
contractual explícita de scraping. Con eso decidimos empezar ahí. "Sin
prohibición explícita" no es lo mismo que "sin riesgo cero" — por eso el
primer scraper real igual debe:

- Usar un `User-Agent` identificable con datos de contacto (no fingir ser
  un navegador).
- Respetar `REQUEST_DELAY_SECONDS` (nunca más rápido que un usuario humano
  navegando).
- Tocar únicamente páginas públicas de categoría/producto — nunca login,
  checkout, ni el perfil de un usuario.
- Ser para uso personal/portafolio, no para reventa ni uso comercial de los
  datos.

Si en algún momento Automercado public a un cambio en sus términos o
bloquea el acceso, este análisis se vuelve a hacer.

### Segunda ronda de candidatos (2026-08-12)

| Súper | robots.txt | Términos y condiciones | Decisión |
|---|---|---|---|
| **PALÍ** | No revisado — descartado antes de llegar a ese paso. | Es una marca de Walmart de México (Walmart compró el 51% de CSU/Carhco en 2006, y el 100% de las operaciones centroamericanas en 2009). Comparte entidad legal y, por tanto, el mismo ToS de Walmart Centroamérica ya descartado (prohibición explícita de "spiders, robots, avatars o agentes inteligentes"). | ❌ **Descartado** — mismo motivo que Walmart CR/MaxiPalí/Más x Menos, ver tabla arriba. |
| **Fresh Market** | Permisivo (`freshmarket.co.cr/robots.txt`: `Disallow:` vacío). | Revisados (términos del programa de lealtad + compras vía app/WhatsApp, `Inversiones AMPM SA`). No prohíben bots explícitamente, pero sí prohíben "descargar, copiar, reproducir, distribuir... o explotar" el contenido de **"la app"**. | ❌ **Descartado** — no por el ToS del sitio web en sí, sino porque el sitio (`freshmarket.co.cr`) es solo un sitio de marketing en WordPress: no tiene catálogo de productos ni precios navegables. Las compras reales pasan por su app móvil (contenido protegido explícitamente contra copia/reproducción) o por Uber Eats/PedidosYa/Didi Food — plataformas de terceros con su propio ToS, y con precios típicamente inflados respecto al de tienda física. No hay una fuente propia y limpia de datos de precio por producto. |
| **Perimercados (Peri)** | Permisivo para catálogo — `peridomicilio.com/robots.txt` solo bloquea `/app/`, `/pagos/`, `/csv_proceso/`, `/store_closed.html`, `/pruebas-pd/` (nada de categorías/productos). | Revisados completos (`peridomicilio.com/terminos`, entidad `Grupo Empresarial de Supermercados, S.R.L.`). Sección "Copyright y Marcas Comerciales": *"...cualquier forma de extracción de datos o minería de datos, o cualquier otra explotación comercial de cualquier tipo, sin el permiso previo y por escrito de Grupo Empresarial de Supermercados, S.R.L., está estrictamente prohibido."* | ❌ **Descartado** — prohibición explícita y literal de "extracción de datos o minería de datos", el equivalente exacto a lo que hace un scraper. Aunque el `robots.txt` sea permisivo, el ToS lo prohíbe por contrato — mismo criterio que se aplicó con Walmart CR. |

Con esto, los 3 candidatos de esta ronda quedan descartados. El
`robots.txt` de un sitio nunca cuenta la historia completa — Perimercados
tenía la señal técnica más limpia de los tres y aun así el ToS lo cierra.
Ver "Próximos pasos" en el README raíz para las opciones que quedan.

### MiMejorCompraCR (MEIC) — investigado y descartado (2026-08-12)

El MEIC (Ministerio de Economía, Industria y Comercio) publica una
herramienta pública, `mimejorcompracr.go.cr`, que compara precios de 30
productos de la canasta básica en 86 comercios del país. `robots.txt` es
totalmente permisivo y Costa Rica tiene un decreto de datos abiertos
(40199-MP, 2017) que favorece la reutilización de datos públicos — en
principio, un candidato de bajo riesgo legal, mucho más que un retailer
privado.

Su API interna (`mimejorcompracr.go.cr/api/...`) es un REST simple y
abierto para datos de referencia (provincias, cantones, distritos,
productos, presentaciones, período del estudio vigente) — sin
autenticación. Pero el paso que efectivamente devuelve los precios está
protegido con **reCAPTCHA** ("Consultar" no dispara ninguna petición hasta
resolverlo).

Ahí se termina la investigación: evadir o resolver un CAPTCHA de forma
automatizada no es una decisión de riesgo a sopesar, es una línea que este
proyecto no cruza bajo ninguna circunstancia — el CAPTCHA es la señal más
inequívoca posible de que el operador del sitio no quiere consultas
automatizadas ahí, más clara incluso que un ToS escrito. **Descartado**
como fuente de datos automatizable.

Queda pendiente revisar si el MEIC publica los mismos datos de otra forma
(reportes/Excel/PDF estáticos de cada monitoreo, fuera de la herramienta
interactiva) — esa vía, al no tener CAPTCHA ni requerir automatizar una
consulta protegida, sí sería legítima de investigar.

### Reportes PDF del MEIC — también descartados (2026-08-12)

Se revisaron dos informes públicos de la DIEM (Dirección de Investigaciones
Económicas y de Mercados del MEIC), descargados de su página de
transparencia:

- **DIEM-INF-005-2022** — "Estudio del Costo de la Canasta Básica
  Alimentaria, períodos 2019-2021". Contiene el costo total por *subgrupo*
  de alimentos (ej. "Lácteos", "Carne de res"), separado por zona
  Urbana/Rural y por año, más su correlación con el IPC. Es un análisis
  macro de tendencia de gasto, no un listado de precios por producto.
- **DIEM-INF-002-2024** — "Consumo de productos frescos marinos y
  acuícolas... para la CBTBIF". Acota el alcance a pescado/mariscos, y su
  tabla de precios es un promedio nacional de un estudio de campo de 2019,
  actualizado por IPC a julio 2023 — no por supermercado ni por SKU, y ya
  con más de un año de desactualización.

Ninguno de los dos tiene la granularidad que necesita el comparador: un
precio de un producto específico, en una tienda específica, medianamente
reciente. Ambos son estudios estadísticos agregados, pensados para política
tributaria (definir qué entra en la canasta básica exenta de IVA), no bases
de datos de precios. **Descartados** como fuente de datos.

Con esto se cierra por completo la vía MEIC (herramienta interactiva y
reportes estáticos). El siguiente candidato a evaluar, si se quiere sumar
más de un supermercado, tendría que ser otro retailer (ver "Próximos
pasos" en el README raíz del proyecto).

### Notas técnicas — Automercado (implementado en `scrapers/automercado.py`)

automercado.cr es una SPA: el HTML del servidor viene casi vacío, y el
listado real de productos lo llena JavaScript pidiéndoselo a **Algolia**
(un buscador "as-a-service") a través de un proxy propio de Automercado en
Cloudflare Workers. Esa petición usa una API key de Algolia de
"solo-búsqueda" — están diseñadas por Algolia para vivir en el código del
navegador, visibles para cualquiera. En otras palabras: el scraper hace la
misma petición HTTP que hace el navegador de cualquier visitante — no usa
Playwright (no hace falta renderizar JS, un POST HTTP normal alcanza) y no
accede a nada privado.

Detalles relevantes para quien retome este scraper:

- **Endpoint:** `https://auto-mercado-prod.topsort.workers.dev/1/indexes/*/queries`, índice `Product_CatalogueV2`.
- **Categorías:** se filtran con `facetFilters=categoryPageId:<slug>`, usando el mismo slug que aparece en la URL del sitio (`/categorias/<slug>`).
- **Precio por sucursal:** cada producto trae un objeto `storeDetail` con una entrada por sucursal física (`storeDetail.06`, `storeDetail.10`, etc.), no un precio único. El scraper usa una sola sucursal como representativa (`DEFAULT_STORE_ID`, la que el sitio asigna por defecto a un visitante anónimo). Los precios pueden variar levemente entre sucursales — pendiente decidir si vale la pena scrapear varias y promediar/elegir, o si una sola es suficiente para el propósito del comparador.
- **Unidad/tamaño:** no viene en un campo estructurado — se parsea con regex del texto libre `productPresentation` (ej. "frasco 209 g").
- **Bug real encontrado y corregido:** el emparejamiento difuso de productos (`find_or_create_product` en `db.py`, por similitud de nombre + unidad/tamaño) puede asignarle el mismo producto genérico a dos SKUs distintos de Automercado (dos sabores muy parecidos del mismo peso, por ejemplo). Eso choca con la restricción `UNIQUE (store_id, product_id)` de `store_products`, que no está cubierta por el `ON CONFLICT` original (pensado solo para `(store_id, store_sku)`). Se arregló en `db.py` atrapando ese choque específico y actualizando la fila existente en vez de duplicarla — ver el docstring de `upsert_store_product`. Confirmado en una corrida real: sin el fix, ~30% de los productos de una categoría fallaban por esto.
- **Verificado end-to-end** (2026-08-11): 200 productos reales de 14 categorías, guardados correctamente en Postgres, con precios y unidades coherentes.

## Estructura

```
src/
  config.py        # carga .env
  db.py             # conexión a Postgres + funciones upsert
  scrapers/
    base.py           # interfaz común (clase abstracta)
    example_store.py  # plantilla comentada, NO apunta a un sitio real
    automercado.py     # scraper real — ver "Notas técnicas" arriba
  pipeline.py       # orquesta: corre cada scraper activo, normaliza, guarda
  main.py           # CLI: `python -m src.main --store <slug> [--max-pages-per-category N]`
tests/
  test_pipeline.py  # prueba con un scraper falso, sin red
```

## Cómo correrlo

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# playwright install chromium   # no hace falta para automercado (ver Notas técnicas) — sí para scrapers futuros basados en Playwright
cp .env.example .env   # y completar DATABASE_URL (misma base que apps/api)

# corrida completa (recorre todas las categorías, todas las páginas):
python -m src.main --store automercado

# corrida chica para probar rápido sin traer el catálogo entero:
python -m src.main --store automercado --max-pages-per-category 1
```

`DATABASE_URL` debe apuntar a la misma base que ya corriste `npm run migrate`
+ `npm run seed` en `apps/api` — el scraper no crea tablas, solo escribe en
las que ya existen. La tienda `automercado` ya está sembrada por
`npm run seed`, así que no hace falta crearla a mano.
