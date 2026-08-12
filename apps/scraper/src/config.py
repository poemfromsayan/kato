"""config.py — Carga y valida variables de entorno.

Falla rápido si falta DATABASE_URL, igual que en el backend Node: mejor un
error claro al arrancar que un fallo confuso a mitad de un scrape de una
hora.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    batch_size: int
    request_delay_seconds: float


def load_config() -> Config:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("✖ Falta DATABASE_URL. Copia .env.example a .env y complétalo.", file=sys.stderr)
        sys.exit(1)

    return Config(
        database_url=database_url,
        batch_size=int(os.environ.get("BATCH_SIZE", "50")),
        request_delay_seconds=float(os.environ.get("REQUEST_DELAY_SECONDS", "2")),
    )


# Nota: `load_config()` se llama explícitamente desde main.py/pipeline.py,
# no al importar este módulo — así los tests pueden importar `src.config`
# sin necesitar un .env presente.
