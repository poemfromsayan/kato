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

# Registro de scrapers implementados. Vacío a propósito: se va llenando a
# medida que se validan e implementan scrapers reales (ver README.md).
SCRAPERS: dict[str, type] = {}


def main() -> None:
    parser = argparse.ArgumentParser(description="Katö — scraper de precios/productos")
    parser.add_argument("--store", required=True, help="slug del supermercado a scrapear")
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
        scraper = scraper_cls()
        saved = run_scraper(conn, scraper, request_delay_seconds=config.request_delay_seconds)
        print(f"✓ {saved} producto(s) guardado(s) para '{args.store}'.")
    except UnknownStoreError as err:
        print(f"✖ {err}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
