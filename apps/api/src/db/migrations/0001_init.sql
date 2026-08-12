-- 0001_init.sql — Esquema inicial de Katö
-- Ver docs/DATA_MODEL.md para la explicación de cada tabla.

-- Extensiones primero: pgcrypto (gen_random_uuid), pg_trgm (búsqueda de texto
-- difusa sobre nombres de producto) y citext (emails case-insensitive).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE nutrition_source AS ENUM ('scraped', 'manual', 'estimated');
CREATE TYPE plan_status AS ENUM ('uploaded', 'processing', 'parsed', 'failed');
CREATE TYPE price_preference AS ENUM ('price', 'quality', 'balance');

-- ============================= Catálogo =============================

CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  website_url   TEXT NOT NULL,
  logo_url      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL
);

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  brand         TEXT,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit          TEXT NOT NULL,           -- ej. 'kg', 'l', 'unidad'
  unit_size     NUMERIC(10, 3) NOT NULL, -- ej. 1.000 (1kg)
  barcode       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
-- búsqueda por nombre (autocomplete / matching de texto libre del plan nutricional)
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE nutrition_facts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serving_size  TEXT NOT NULL,           -- ej. '100g'
  calories      NUMERIC(8, 2),
  protein_g     NUMERIC(8, 2),
  carbs_g       NUMERIC(8, 2),
  fat_g         NUMERIC(8, 2),
  fiber_g       NUMERIC(8, 2),
  sugar_g       NUMERIC(8, 2),
  sodium_mg     NUMERIC(8, 2),
  source        nutrition_source NOT NULL DEFAULT 'scraped',
  source_url    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, serving_size)
);

CREATE TABLE store_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_sku       TEXT NOT NULL,
  product_url     TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, store_sku),
  UNIQUE (store_id, product_id)
);

CREATE INDEX idx_store_products_product ON store_products(product_id);

CREATE TABLE price_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id  UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  currency          TEXT NOT NULL DEFAULT 'CRC',
  in_stock          BOOLEAN NOT NULL DEFAULT true,
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- consulta más frecuente: "dame el/los snapshot(s) más reciente(s) por store_product"
CREATE INDEX idx_price_snapshots_lookup ON price_snapshots(store_product_id, scraped_at DESC);

-- "precio actual" = último snapshot por store_product. Vista, no columna mutable
-- (ver docs/DATA_MODEL.md) para que price_snapshots siga siendo la única fuente de verdad.
CREATE VIEW current_prices AS
SELECT DISTINCT ON (store_product_id)
  store_product_id,
  price,
  currency,
  in_stock,
  scraped_at
FROM price_snapshots
ORDER BY store_product_id, scraped_at DESC;

-- ============================= Usuarios =============================

CREATE TABLE users (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     CITEXT NOT NULL UNIQUE,
  password_hash             TEXT NOT NULL,
  display_name              TEXT,
  price_quality_preference  price_preference NOT NULL DEFAULT 'balance',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== Planes nutricionales & IA =====================

CREATE TABLE nutrition_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,   -- referencia al archivo (bucket), el PDF NO vive en la DB
  status        plan_status NOT NULL DEFAULT 'uploaded',
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  parsed_at     TIMESTAMPTZ
);

CREATE INDEX idx_nutrition_plans_user ON nutrition_plans(user_id);

CREATE TABLE plan_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id   UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  food_name           TEXT NOT NULL,          -- tal cual lo extrajo el modelo del PDF
  quantity            NUMERIC(10, 2),
  unit                TEXT,
  frequency           TEXT,                   -- ej. 'diario', '3x semana'
  price_range_min     NUMERIC(12, 2),          -- estimación del modelo, NO autoritativa
  price_range_max     NUMERIC(12, 2),
  matched_product_id  UUID REFERENCES products(id) ON DELETE SET NULL, -- lo resuelve nuestro código, no la IA
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_items_plan ON plan_items(nutrition_plan_id);
CREATE INDEX idx_plan_items_matched_product ON plan_items(matched_product_id);

-- ========================= Listas de compras =========================

CREATE TABLE shopping_lists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id   UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_used     price_preference NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shopping_list_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id    UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  plan_item_id        UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  store_product_id    UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  unit_price           NUMERIC(12, 2) NOT NULL, -- snapshot del precio al momento de generar la lista
  store_name          TEXT NOT NULL             -- desnormalizado a propósito para no depender de un JOIN al mostrar el histórico
);

CREATE INDEX idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);
