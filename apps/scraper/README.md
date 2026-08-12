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

## Estructura

```
src/
  config.py        # carga .env
  db.py             # conexión a Postgres + funciones upsert
  scrapers/
    base.py         # interfaz común (clase abstracta)
    example_store.py# plantilla comentada, NO apunta a un sitio real
  pipeline.py       # orquesta: corre cada scraper activo, normaliza, guarda
  main.py           # CLI: `python -m src.main --store <slug>`
tests/
  test_pipeline.py  # prueba con un scraper falso, sin red
```

## Cómo correrlo (una vez haya al menos un scraper real)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # y completar DATABASE_URL

python -m src.main --store <slug-del-supermercado>
```
