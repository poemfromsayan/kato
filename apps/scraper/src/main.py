"""main.py — Punto de entrada CLI.

Uso: python -m src.main --store <slug>

Por ahora no hay scrapers reales registrados (ver scrapers/example_store.py),
así que este CLI solo valida el flujo — falla con un mensaje claro si le
pides un store que no está implementado todavía.
"""

from __future__ import annotations

import argparse
import sys

from src.config import load_config
from src.db import get_connection
from src.pipeline import UnknownStoreError, run_scraper
from src.scrapers.automercado import AutomercadoScraper

# Registro de scrapers implementados. Se va llenando a medida que se
# validan e implementan scrapers reales (ver README.md).
SCRAPERS: dict[str, type] = {
    "automercado": AutomercadoScraper,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Katö — scraper de precios/productos")
    parser.add_argument("--store", required=True, help="slug del supermercado a scrapear")
    parser.add_argument(
        "--max-pages-per-category",
        type=int,
        default=None,
        help="Límite de páginas por categoría (100 productos c/u). Útil para probar rápido sin traer el catálogo completo.",
    )
    args = parser.parse_args()

    scraper_cls = SCRAPERS.get(args.store)
    if scraper_cls is None:
        print(
            f"✖ No hay un scraper implementado para '{args.store}'. "
            f"Disponibles: {list(SCRAPERS) or '(ninguno todavía)'}",
            file=sys.stderr,
        )
        sys.exit(1)

    config = load_config()
    conn = get_connection(config.database_url)
    try:
        scraper_kwargs = {"request_delay_seconds": config.request_delay_seconds}
        if args.max_pages_per_category is not None:
            scraper_kwargs["max_pages_per_category"] = args.max_pages_per_category
        scraper = scraper_cls(**scraper_kwargs)
        # AutomercadoScraper ya espera `request_delay_seconds` entre sus
        # propias peticiones HTTP (una por página de ~100 productos) — el
        # sleep de pipeline.run_scraper fue pensado para scrapers que hacen
        # una petición POR PRODUCTO (ver example_store.py). Duplicar la
        # espera acá lo haría absurdamente lento (2s x cada uno de ~14.000
        # productos), así que se lo pasamos en 0.
        saved = run_scraper(conn, scraper, request_delay_seconds=0)
        print(f"✓ {saved} producto(s) guardado(s) para '{args.store}'.")
    except UnknownStoreError as err:
        print(f"✖ {err}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
