"""automercado.py — Scraper real para Automercado (Costa Rica).

Antes de escribir este archivo se revisó el checklist legal/técnico del
README de este servicio: robots.txt de automercado.cr solo bloquea
/perfil/, /checkout/ y /content/ (no productos/categorías), y sus
Términos y Condiciones (PDF público) no contienen ninguna cláusula que
prohíba bots, spiders o extracción automatizada — a diferencia de
Walmart CR / MaxiPalí / Más x Menos, que sí la prohíben explícitamente
(por eso esos tres quedaron descartados, ver README.md).

CÓMO OBTIENE LOS DATOS ESTE SCRAPER, EN PLATA:

automercado.cr es una SPA: el HTML que devuelve el servidor viene casi
vacío, y el listado de productos lo llena JavaScript en el navegador
pidiéndole los datos a Algolia (un buscador "as-a-service" que muchos
e-commerce usan para su buscador y sus páginas de categoría). Esa
petición usa una API key de Algolia de "solo búsqueda" — Algolia las
diseña a propósito para vivir en el código del navegador, visibles para
cualquiera que abra las herramientas de desarrollador; no es una llave
privada que estemos filtrando. En otras palabras: este scraper hace
exactamente la misma petición HTTP que hace el navegador de cualquier
persona que visita el sitio y navega una categoría — no accedemos a
nada que no sea público, y no hace falta simular un navegador con
Playwright para conseguirlo (una request HTTP normal alcanza).

Los precios están organizados por sucursal física (storeDetail.<id>).
Usamos una sola sucursal como representativa de "Automercado" en el
comparador (ver DEFAULT_STORE_ID) — los precios pueden variar un poco
entre sucursales, ver "Próximos pasos" en README.md.
"""

from __future__ import annotations

import re
import time
from collections.abc import Iterator

import requests

from src.db import ScrapedItem
from src.scrapers.base import StoreScraper

ALGOLIA_URL = (
    "https://auto-mercado-prod.topsort.workers.dev/1/indexes/*/queries"
    "?x-algolia-agent=Algolia+for+JavaScript+%284.26.0%29%3B+Browser+%28lite%29"
    "&x-algolia-api-key=335287091ff4a66858e0ad021ca45b76"
    "&x-algolia-application-id=FU5XFX7KNL"
)

# Sucursal usada como precio de referencia — código interno de Automercado
# (no confundir con el id de `stores` en nuestra base). "06" es la que el
# sitio le asigna por defecto a un visitante anónimo sin sesión.
DEFAULT_STORE_ID = "06"

HITS_PER_PAGE = 100

# Identificable a propósito — nunca fingir ser un navegador real (ver
# checklist del README). Si algo sale mal del lado de Automercado, deben
# poder identificarnos y escribirnos.
USER_AGENT = (
    "KatoFitBot/0.1 (+contacto: adrianrojastanley@gmail.com; "
    "proyecto de portafolio, uso personal, no comercial)"
)

# No incluye "bebidas-alcoholicas": Katö es una app de nutrición, no
# tiene sentido comparar precios de alcohol acá.
DEFAULT_CATEGORIES = [
    "abarrotes",
    "bebes-y-ninos",
    "bebidas-no-alcoholicas",
    "carnes-y-pescado",
    "comidas-preparadas",
    "congelados-y-refrigerados",
    "cuidado-personal-y-belleza",
    "frutas-y-verduras",
    "lacteos-y-embutidos",
    "limpieza-y-articulos-desechables",
    "mascotas",
    "panaderia-reposteria-y-tortillas",
    "snack-y-golosina",
    "tienda-y-hogar",
]

# El tamaño/unidad no viene en un campo separado — viene como texto libre
# en "productPresentation", ej. "frasco 209 g", "lata 184 g", "bolsa 1 kg".
# Lo extraemos con una regex; si el texto no calza el patrón esperado (pasa
# con productos por unidad, ej. "unidad"), caemos a unidad="unidad", 1.
_SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|unidad(?:es)?)\b", re.IGNORECASE)


def _parse_presentation(text: str) -> tuple[str, float]:
    if not text:
        return "unidad", 1.0
    match = _SIZE_RE.search(text)
    if not match:
        return "unidad", 1.0
    size = float(match.group(1).replace(",", "."))
    unit = match.group(2).lower()
    if unit.startswith("un"):
        unit = "unidad"
    return unit, size


class AutomercadoScraper(StoreScraper):
    store_slug = "automercado"

    def __init__(
        self,
        *,
        category_slugs: list[str] | None = None,
        store_id: str = DEFAULT_STORE_ID,
        max_pages_per_category: int | None = None,
        request_delay_seconds: float = 2.0,
        session: requests.Session | None = None,
    ) -> None:
        self.category_slugs = category_slugs if category_slugs is not None else DEFAULT_CATEGORIES
        self.store_id = store_id
        self.max_pages_per_category = max_pages_per_category
        self.request_delay_seconds = request_delay_seconds
        self._session = session or requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    def scrape(self) -> Iterator[ScrapedItem]:
        for category_slug in self.category_slugs:
            yield from self._scrape_category(category_slug)

    def _scrape_category(self, category_slug: str) -> Iterator[ScrapedItem]:
        page = 0
        while True:
            if self.max_pages_per_category is not None and page >= self.max_pages_per_category:
                return

            hits, nb_pages = self._query_page(category_slug, page)
            for hit in hits:
                item = self._to_item(hit)
                if item is not None:
                    yield item

            page += 1
            if page >= nb_pages:
                return
            # Nunca más rápido que un humano navegando — ver checklist del README.
            time.sleep(self.request_delay_seconds)

    def _query_page(self, category_slug: str, page: int) -> tuple[list[dict], int]:
        params = (
            f'facetFilters=%5B%5B%22categoryPageId%3A%20{category_slug}%22%5D%2C'
            f'%5B%22storeDetail.{self.store_id}.storeid%3A{self.store_id}%22%5D%5D'
            f'&hitsPerPage={HITS_PER_PAGE}&page={page}'
        )
        body = {"requests": [{"indexName": "Product_CatalogueV2", "params": params}]}
        response = self._session.post(ALGOLIA_URL, json=body, timeout=15)
        response.raise_for_status()
        result = response.json()["results"][0]
        return result.get("hits", []), result.get("nbPages", 1)

    def _to_item(self, hit: dict) -> ScrapedItem | None:
        store_detail = (hit.get("storeDetail") or {}).get(self.store_id)
        if not store_detail:
            return None  # este producto no se vende en la sucursal elegida

        unit, unit_size = _parse_presentation(hit.get("productPresentation", ""))
        product_number = hit.get("productNumber") or hit.get("productID")
        name = (hit.get("ecomDescription") or "").strip()

        if not product_number or not name:
            return None  # dato incompleto — mejor saltarlo que guardar basura

        return ScrapedItem(
            store_slug=self.store_slug,
            store_sku=str(product_number),
            product_url=f"https://automercado.cr/buscar?q={product_number}",
            product_name=name,
            unit=unit,
            unit_size=unit_size,
            price=float(store_detail.get("amount", 0)),
            in_stock=bool(store_detail.get("productAvailable", False)),
        )
