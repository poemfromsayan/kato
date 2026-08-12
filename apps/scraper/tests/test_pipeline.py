"""test_pipeline.py — Prueba la lógica de orquestación del pipeline con un
scraper falso y la capa de DB mockeada. Sin red, sin Postgres real: así corre
en cualquier máquina/CI sin dependencias externas.
"""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import MagicMock, call, patch

import pytest

from src.db import ScrapedItem
from src.pipeline import UnknownStoreError, run_scraper
from src.scrapers.base import StoreScraper


class FakeScraper(StoreScraper):
    store_slug = "fake-store"

    def scrape(self) -> Iterator[ScrapedItem]:
        yield ScrapedItem(
            store_slug=self.store_slug,
            store_sku="SKU-1",
            product_url="https://example.com/producto-1",
            product_name="Producto de prueba",
            unit="kg",
            unit_size=1.0,
            price=1000.0,
            in_stock=True,
        )


def test_run_scraper_persists_each_item():
    fake_conn = MagicMock()

    with (
        patch("src.pipeline.get_store_id", return_value="store-uuid") as mock_get_store,
        patch("src.pipeline.find_or_create_product", return_value="product-uuid") as mock_find_product,
        patch("src.pipeline.upsert_store_product", return_value="store-product-uuid") as mock_upsert,
        patch("src.pipeline.insert_price_snapshot") as mock_insert_price,
    ):
        saved = run_scraper(fake_conn, FakeScraper(), request_delay_seconds=0)

    assert saved == 1
    mock_get_store.assert_called_once_with(fake_conn, "fake-store")
    mock_find_product.assert_called_once_with(fake_conn, name="Producto de prueba", unit="kg", unit_size=1.0)
    mock_upsert.assert_called_once_with(
        fake_conn,
        store_id="store-uuid",
        product_id="product-uuid",
        store_sku="SKU-1",
        product_url="https://example.com/producto-1",
    )
    mock_insert_price.assert_called_once_with(
        fake_conn,
        store_product_id="store-product-uuid",
        price=1000.0,
        currency="CRC",
        in_stock=True,
    )
    fake_conn.commit.assert_called_once()


def test_run_scraper_raises_for_unknown_store():
    fake_conn = MagicMock()

    with patch("src.pipeline.get_store_id", return_value=None):
        with pytest.raises(UnknownStoreError):
            run_scraper(fake_conn, FakeScraper())
