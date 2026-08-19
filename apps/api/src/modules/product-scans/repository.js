/**
 * modules/product-scans/repository.js — Cola de revisión de escaneos de
 * producto. Nada de lo que hay acá toca `products`/`nutrition_facts`
 * (el catálogo real) hasta que `approveScan` corre — ver
 * migrations/0002_product_scans.sql para el porqué.
 */

import { query, withTransaction } from '../../db/pool.js';

/**
 * Igual que el matching de plan_items en shopping-lists: similaridad de
 * texto (pg_trgm) contra products.name, nunca decidido por el modelo.
 */
export async function findBestProductMatch(productName) {
  if (!productName) return null;
  const { rows } = await query(
    `SELECT id, name, similarity(name, $1) AS score
     FROM products
     WHERE name % $1
     ORDER BY score DESC
     LIMIT 1`,
    [productName]
  );
  return rows[0] ?? null;
}

export async function createScan({
  userId,
  packageImagePath,
  nutritionImagePath,
  matchedProductId,
  extracted,
}) {
  const { rows } = await query(
    `INSERT INTO product_scans
       (user_id, package_image_path, nutrition_image_path, matched_product_id,
        extracted_product_name, extracted_brand, extracted_category_guess,
        extracted_unit, extracted_unit_size, extracted_serving_size,
        extracted_calories, extracted_protein_g, extracted_carbs_g, extracted_fat_g,
        extracted_fiber_g, extracted_sugar_g, extracted_sodium_mg)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id, status, matched_product_id, created_at`,
    [
      userId, packageImagePath, nutritionImagePath ?? null, matchedProductId ?? null,
      extracted.productName, extracted.brand, extracted.categoryGuess,
      extracted.unit, extracted.unitSize, extracted.nutrition.servingSize,
      extracted.nutrition.calories, extracted.nutrition.proteinG, extracted.nutrition.carbsG,
      extracted.nutrition.fatG, extracted.nutrition.fiberG, extracted.nutrition.sugarG,
      extracted.nutrition.sodiumMg,
    ]
  );
  return rows[0];
}

export async function listScans({ status }) {
  const { rows } = await query(
    `SELECT
       ps.*, p.name AS matched_product_name, u.email AS submitted_by_email
     FROM product_scans ps
     LEFT JOIN products p ON p.id = ps.matched_product_id
     JOIN users u ON u.id = ps.user_id
     WHERE ($1::scan_status IS NULL OR ps.status = $1)
     ORDER BY ps.created_at ASC`,
    [status ?? null]
  );
  return rows;
}

export async function getScanById(id) {
  const { rows } = await query(
    `SELECT ps.*, p.name AS matched_product_name
     FROM product_scans ps
     LEFT JOIN products p ON p.id = ps.matched_product_id
     WHERE ps.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Aprueba un scan con los valores que el admin confirmó/corrigió (nunca los
 * valores crudos de la extracción sin pasar por una persona) — ver
 * controller.js. Si `productId` viene definido, actualiza/agrega la ficha
 * nutricional de ESE producto existente. Si no, crea un producto nuevo.
 */
export async function approveScan(scanId, { reviewerId, productId, name, brand, categoryId, unit, unitSize, nutrition }) {
  return withTransaction(async (client) => {
    let resultingProductId = productId;

    if (!resultingProductId) {
      const { rows: productRows } = await client.query(
        `INSERT INTO products (name, brand, category_id, unit, unit_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [name, brand ?? null, categoryId ?? null, unit, unitSize]
      );
      resultingProductId = productRows[0].id;
    }

    if (nutrition.servingSize && nutrition.calories != null) {
      await client.query(
        `INSERT INTO nutrition_facts
           (product_id, serving_size, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'crowdsourced')
         ON CONFLICT (product_id, serving_size)
         DO UPDATE SET
           calories = EXCLUDED.calories, protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g,
           fat_g = EXCLUDED.fat_g, fiber_g = EXCLUDED.fiber_g, sugar_g = EXCLUDED.sugar_g,
           sodium_mg = EXCLUDED.sodium_mg, source = 'crowdsourced', updated_at = now()`,
        [
          resultingProductId, nutrition.servingSize, nutrition.calories, nutrition.proteinG,
          nutrition.carbsG, nutrition.fatG, nutrition.fiberG, nutrition.sugarG, nutrition.sodiumMg,
        ]
      );
    }

    const { rows } = await client.query(
      `UPDATE product_scans
       SET status = 'approved', reviewed_by = $1, reviewed_at = now(), resulting_product_id = $2
       WHERE id = $3
       RETURNING id, status, resulting_product_id`,
      [reviewerId, resultingProductId, scanId]
    );

    return rows[0];
  });
}

export async function rejectScan(scanId, { reviewerId, reason }) {
  const { rows } = await query(
    `UPDATE product_scans
     SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2
     WHERE id = $3
     RETURNING id, status`,
    [reviewerId, reason ?? null, scanId]
  );
  return rows[0] ?? null;
}
