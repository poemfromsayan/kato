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
