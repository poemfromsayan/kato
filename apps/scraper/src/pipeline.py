"""pipeline.py — Orquesta un scraper concreto: corre scrape(), resuelve/crea
el producto genérico, y guarda el store_product + price_snapshot.

Separado de main.py para poder testear la lógica de guardado con un scraper
falso, sin red ni Playwright de por medio (ver tests/test_pipeline.py).
"""

from __future__ import annotations

import time

import psycopg
from tenacity import retry, stop_after_attempt, wait_exponential

from src.db import (
    find_or_create_product,
    get_store_id,
    insert_price_snapshot,
    upsert_store_product,
)
from src.scrapers.base import StoreScraper


class UnknownStoreError(Exception):
    pass


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _save_item(conn: psycopg.Connection, store_id: str, item) -> None:
    product_id = find_or_create_product(
        conn,
        name=item.product_name,
        unit=item.unit,
        unit_size=item.unit_size,
    )
    store_product_id = upsert_store_product(
        conn,
        store_id=store_id,
        product_id=product_id,
        store_sku=item.store_sku,
        product_url=item.product_url,
    )
    insert_price_snapshot(
        conn,
        store_product_id=store_product_id,
        price=item.price,
        currency=item.currency,
        in_stock=item.in_stock,
    )


def run_scraper(
    conn: psycopg.Connection,
    scraper: StoreScraper,
    *,
    request_delay_seconds: float = 2.0,
) -> int:
    """Corre un scraper y persiste cada item. Devuelve cuántos se guardaron."""
    store_id = get_store_id(conn, scraper.store_slug)
    if store_id is None:
        raise UnknownStoreError(
            f"No existe una tienda activa con slug='{scraper.store_slug}' en la tabla stores."
        )

    saved = 0
    for item in scraper.scrape():
        _save_item(conn, store_id, item)
        conn.commit()
        saved += 1
        time.sleep(request_delay_seconds)

    return saved
