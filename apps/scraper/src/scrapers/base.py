"""base.py — Interfaz común que todo scraper de supermercado debe implementar.

Cada scraper concreto (uno por supermercado) hereda de StoreScraper y solo
tiene que resolver cómo navegar SU sitio; el resto del pipeline (guardar en
DB, reintentos, delay entre requests) es compartido.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

from src.db import ScrapedItem


class StoreScraper(ABC):
    """Un scraper concreto vive en su propio archivo (ej. automercado.py) y
    define `store_slug` + `scrape()`."""

    #: Debe coincidir con el `slug` de la fila correspondiente en `stores`.
    store_slug: str

    @abstractmethod
    def scrape(self) -> Iterator[ScrapedItem]:
        """Debe ser un generador: produce ScrapedItem de uno en uno, para que
        el pipeline pueda guardar en DB de forma incremental en vez de
        esperar a tener todo el catálogo en memoria."""
        raise NotImplementedError
