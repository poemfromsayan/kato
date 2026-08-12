"""example_store.py — PLANTILLA, no un scraper funcional.

Este archivo muestra el patrón que va a seguir cada scraper real (uno por
supermercado), pero NO apunta a ningún sitio real todavía. Antes de crear
`automercado.py`, `maxipali.py`, etc. a partir de esta plantilla, revisar el
checklist legal/técnico del README de este servicio para ese supermercado
específico.

Cuando se cree un scraper real, normalmente:
1. Navega el listado/categoría con Playwright (sitios de e-commerce modernos
   casi siempre renderizan con JS, por eso Playwright y no solo requests+BS4).
2. Extrae el HTML de cada tarjeta de producto y lo parsea con BeautifulSoup.
3. Normaliza el precio (quitar "₡", separadores de miles, etc.) a un float.
4. Produce un ScrapedItem por producto.
"""

from __future__ import annotations

from collections.abc import Iterator

from src.db import ScrapedItem
from src.scrapers.base import StoreScraper


class ExampleStoreScraper(StoreScraper):
    store_slug = "example-store"  # placeholder — no existe como fila real en `stores`

    def __init__(self, *, catalog_url: str, request_delay_seconds: float = 2.0) -> None:
        self.catalog_url = catalog_url
        self.request_delay_seconds = request_delay_seconds

    def scrape(self) -> Iterator[ScrapedItem]:
        # --- Esqueleto de lo que haría un scraper real con Playwright ---
        #
        # from playwright.sync_api import sync_playwright
        # import time
        #
        # with sync_playwright() as p:
        #     browser = p.chromium.launch(headless=True)
        #     page = browser.new_page(user_agent="KatoBot/0.1 (+contacto@katofit.app)")
        #     page.goto(self.catalog_url)
        #     cards = page.query_selector_all(".product-card")  # selector real: TBD por sitio
        #
        #     for card in cards:
        #         name = card.query_selector(".product-name").inner_text()
        #         raw_price = card.query_selector(".product-price").inner_text()
        #         price = _parse_crc_price(raw_price)
        #         sku = card.get_attribute("data-sku")
        #         url = card.query_selector("a").get_attribute("href")
        #
        #         yield ScrapedItem(
        #             store_slug=self.store_slug,
        #             store_sku=sku,
        #             product_url=url,
        #             product_name=name,
        #             price=price,
        #             in_stock=True,
        #         )
        #         time.sleep(self.request_delay_seconds)
        #
        #     browser.close()

        raise NotImplementedError(
            "Esto es una plantilla. Implementa un scraper real solo después de "
            "verificar robots.txt/ToS del sitio (ver README.md)."
        )


def _parse_crc_price(raw: str) -> float:
    """Convierte algo como '₡1.250' o '¢1,250.00' a 1250.0.

    Placeholder — el formato real depende de cada sitio y hay que ajustarlo
    cuando se implemente el scraper concreto.
    """
    digits = "".join(ch for ch in raw if ch.isdigit())
    return float(digits) if digits else 0.0
