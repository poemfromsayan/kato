"""test_automercado.py — Prueba el scraper de Automercado con respuestas
HTTP simuladas (sin red real, sin golpear el sitio en cada corrida de tests).
"""

from __future__ import annotations

from unittest.mock import MagicMock

from src.scrapers.automercado import AutomercadoScraper, _parse_presentation


def _fake_hit(**overrides):
    base = {
        "productNumber": "876443",
        "productID": "9afbd8db-22d3-ec11-a7b5-000d3a378a90",
        "ecomDescription": "PALMITO ENTERO AUTO SELECCIÓN frasco 209 g",
        "productPresentation": "frasco 209 g",
        "storeDetail": {
            "06": {"amount": 1290, "productAvailable": True, "storeid": "06"},
        },
    }
    base.update(overrides)
    return base


def _make_response(hits, nb_pages=1):
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {"results": [{"hits": hits, "nbPages": nb_pages}]}
    return response


def test_parse_presentation_extracts_unit_and_size():
    assert _parse_presentation("frasco 209 g") == ("g", 209.0)
    assert _parse_presentation("lata 1.5 kg") == ("kg", 1.5)
    assert _parse_presentation("botella 500 ml") == ("ml", 500.0)


def test_parse_presentation_falls_back_when_no_match():
    assert _parse_presentation("") == ("unidad", 1.0)
    assert _parse_presentation("paquete surtido") == ("unidad", 1.0)


def test_scrape_yields_item_from_single_page():
    session = MagicMock()
    session.post.return_value = _make_response([_fake_hit()], nb_pages=1)

    scraper = AutomercadoScraper(category_slugs=["abarrotes"], session=session, request_delay_seconds=0)
    items = list(scraper.scrape())

    assert len(items) == 1
    item = items[0]
    assert item.store_slug == "automercado"
    assert item.store_sku == "876443"
    assert item.product_name == "PALMITO ENTERO AUTO SELECCIÓN frasco 209 g"
    assert item.unit == "g"
    assert item.unit_size == 209.0
    assert item.price == 1290.0
    assert item.in_stock is True
    assert item.product_url == "https://automercado.cr/buscar?q=876443"


def test_scrape_skips_products_not_sold_at_chosen_store():
    session = MagicMock()
    hit = _fake_hit(storeDetail={"10": {"amount": 500, "productAvailable": True, "storeid": "10"}})
    session.post.return_value = _make_response([hit], nb_pages=1)

    scraper = AutomercadoScraper(category_slugs=["abarrotes"], session=session, request_delay_seconds=0)
    items = list(scraper.scrape())

    assert items == []


def test_scrape_paginates_within_a_category():
    session = MagicMock()
    session.post.side_effect = [
        _make_response([_fake_hit(productNumber="1")], nb_pages=2),
        _make_response([_fake_hit(productNumber="2")], nb_pages=2),
    ]

    scraper = AutomercadoScraper(category_slugs=["abarrotes"], session=session, request_delay_seconds=0)
    items = list(scraper.scrape())

    assert [item.store_sku for item in items] == ["1", "2"]
    assert session.post.call_count == 2


def test_max_pages_per_category_limits_requests():
    session = MagicMock()
    session.post.return_value = _make_response([_fake_hit()], nb_pages=99)

    scraper = AutomercadoScraper(
        category_slugs=["abarrotes"], session=session, request_delay_seconds=0, max_pages_per_category=1
    )
    items = list(scraper.scrape())

    assert len(items) == 1
    assert session.post.call_count == 1


def test_scrape_covers_multiple_categories():
    session = MagicMock()
    session.post.side_effect = [
        _make_response([_fake_hit(productNumber="a")], nb_pages=1),
        _make_response([_fake_hit(productNumber="b")], nb_pages=1),
    ]

    scraper = AutomercadoScraper(
        category_slugs=["abarrotes", "frutas-y-verduras"], session=session, request_delay_seconds=0
    )
    items = list(scraper.scrape())

    assert [item.store_sku for item in items] == ["a", "b"]
