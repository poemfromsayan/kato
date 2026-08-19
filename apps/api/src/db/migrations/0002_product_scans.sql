-- 0002_product_scans.sql — Escaneo de productos por cámara: los usuarios
-- ayudan a completar el catálogo fotografiando productos que no están (o
-- cuya info nutricional falta/está mal). Ver docs/DATA_MODEL.md.
--
-- Principio central (el mismo de nutrition_facts.source): un dato que sube
-- un usuario por cámara NO es un hecho verificado hasta que alguien lo
-- revisa. Por eso esto vive en una tabla aparte (product_scans), separada
-- de products/nutrition_facts — nunca se le muestra a otro usuario un scan
-- sin aprobar como si fuera catálogo real.

-- 'crowdsourced': foto de producto real, revisada y aprobada por un admin.
-- Distinto de 'manual' (que en este proyecto significa "sourceado a mano
-- contra una tabla oficial como INCAP/USDA, con source_url real") — un
-- scan aprobado es más confiable que 'estimated', pero no es lo mismo que
-- una fuente oficial, así que merece su propia categoría en vez de
-- mezclarse con cualquiera de las otras dos.
ALTER TYPE nutrition_source ADD VALUE IF NOT EXISTS 'crowdsourced';

CREATE TYPE scan_status AS ENUM ('pending', 'approved', 'rejected');

-- Sin rol de moderador todavía (no hace falta una tabla de roles para un
-- solo operador) — un simple flag alcanza para gatear los endpoints de
-- revisión. Si el proyecto crece a varios admins, esto se puede migrar a
-- una tabla de roles después sin romper nada de lo que depende de este
-- booleano.
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE product_scans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Si matchea contra un producto ya existente, esto es una propuesta de
  -- ENRIQUECER/CORREGIR su nutrition_facts. Si queda NULL, es una
  -- propuesta de producto NUEVO — lo resuelve nuestro código por
  -- similaridad de texto (igual que plan_items.matched_product_id), nunca
  -- el propio modelo.
  matched_product_id        UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Nunca se guarda el binario en Postgres (mismo criterio que
  -- nutrition_plans.storage_path) — acá solo la referencia.
  package_image_path        TEXT NOT NULL,
  nutrition_image_path      TEXT,

  -- Lo que Claude extrajo de las fotos — todavía NO es catálogo real.
  extracted_product_name    TEXT,
  extracted_brand           TEXT,
  extracted_category_guess  TEXT,   -- texto libre, el admin elige el category_id real al aprobar
  extracted_unit             TEXT,
  extracted_unit_size        NUMERIC(10, 3),
  extracted_serving_size     TEXT,
  extracted_calories         NUMERIC(8, 2),
  extracted_protein_g        NUMERIC(8, 2),
  extracted_carbs_g          NUMERIC(8, 2),
  extracted_fat_g            NUMERIC(8, 2),
  extracted_fiber_g          NUMERIC(8, 2),
  extracted_sugar_g          NUMERIC(8, 2),
  extracted_sodium_mg        NUMERIC(8, 2),

  status                    scan_status NOT NULL DEFAULT 'pending',
  reviewed_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at               TIMESTAMPTZ,
  rejection_reason          TEXT,

  -- Si se aprueba, referencia al producto resultante (nuevo o existente)
  -- para poder trazar "este dato del catálogo vino de este scan".
  resulting_product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_scans_status ON product_scans(status);
CREATE INDEX idx_product_scans_user ON product_scans(user_id);
