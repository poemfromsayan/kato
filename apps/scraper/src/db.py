"""db.py — Acceso a Postgres para el pipeline de scraping.

Mismo esquema que apps/api/src/db/migrations — este servicio no crea tablas,
solo inserta en las que ya existen (stores, store_products, price_snapshots).

Todas las consultas usan parámetros (%s) en vez de f-strings/format para
evitar SQL injection, igual que en el backend Node.
"""

from __future__ import annotations

from dataclasses import dataclass

import psycopg


@dataclass(frozen=True)
class ScrapedItem:
    """Un producto normalizado, listo para guardar."""

    store_slug: str
    store_sku: str
    product_url: str
    product_name: str
    unit: str
    unit_size: float
    price: float
    in_stock: bool
    currency: str = "CRC"


def get_connection(database_url: str) -> psycopg.Connection:
    return psycopg.connect(database_url)


def get_store_id(conn: psycopg.Connection, store_slug: str) -> str | None:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM stores WHERE slug = %s AND is_active = true", (store_slug,))
        row = cur.fetchone()
        return row[0] if row else None


def find_or_create_product(
    conn: psycopg.Connection,
    *,
    name: str,
    unit: str,
    unit_size: float,
    similarity_threshold: float = 0.6,
) -> str:
    """Resuelve el 'producto genérico' correspondiente a un nombre de tienda.

    MVP deliberadamente simple: usa similaridad de texto (pg_trgm) sobre el
    nombre + coincidencia exacta de unidad/tamaño. Esto es un problema de
    resolución de entidades real (el mismo pollo se llama distinto en cada
    supermercado) — este heurístico es un punto de partida razonable, no la
    solución final. Si la similaridad no alcanza el umbral, se crea un
    producto nuevo en vez de arriesgar un match incorrecto.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, similarity(name, %(name)s) AS sim
            FROM products
            WHERE unit = %(unit)s
              AND unit_size = %(unit_size)s
              AND name %% %(name)s
            ORDER BY sim DESC
            LIMIT 1
            """,
            {"name": name, "unit": unit, "unit_size": unit_size},
        )
        row = cur.fetchone()
        if row and row[1] >= similarity_threshold:
            return row[0]

        cur.execute(
            """
            INSERT INTO products (name, unit, unit_size)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (name, unit, unit_size),
        )
        return cur.fetchone()[0]


def upsert_store_product(
    conn: psycopg.Connection,
    *,
    store_id: str,
    product_id: str,
    store_sku: str,
    product_url: str,
) -> str:
    """Crea o actualiza la fila puente store_products y devuelve su id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO store_products (store_id, product_id, store_sku, product_url, last_scraped_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (store_id, store_sku)
            DO UPDATE SET product_url = EXCLUDED.product_url, last_scraped_at = now()
            RETURNING id
            """,
            (store_id, product_id, store_sku, product_url),
        )
        return cur.fetchone()[0]


def insert_price_snapshot(
    conn: psycopg.Connection,
    *,
    store_product_id: str,
    price: float,
    currency: str,
    in_stock: bool,
) -> None:
    """Siempre INSERT, nunca UPDATE — price_snapshots es un histórico
    append-only a propósito (ver docs/DATA_MODEL.md)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO price_snapshots (store_product_id, price, currency, in_stock)
            VALUES (%s, %s, %s, %s)
            """,
            (store_product_id, price, currency, in_stock),
        )
