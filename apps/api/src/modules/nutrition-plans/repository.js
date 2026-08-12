import { query, withTransaction } from '../../db/pool.js';

export async function createPlanWithItems({ userId, filename, storagePath, items }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO nutrition_plans (user_id, filename, storage_path, status, parsed_at)
       VALUES ($1, $2, $3, 'parsed', now())
       RETURNING id, filename, status, uploaded_at, parsed_at`,
      [userId, filename, storagePath]
    );
    const plan = rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO plan_items
           (nutrition_plan_id, food_name, quantity, unit, frequency, price_range_min, price_range_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [plan.id, item.foodName, item.quantity, item.unit, item.frequency, item.priceRangeMin, item.priceRangeMax]
      );
    }

    return { ...plan, items };
  });
}

/**
 * Registra el intento fallido: nos interesa saber que el usuario subió algo
 * y por qué no se pudo procesar, en vez de simplemente perder el evento.
 */
export async function markPlanFailed({ userId, filename, storagePath }) {
  const { rows } = await query(
    `INSERT INTO nutrition_plans (user_id, filename, storage_path, status)
     VALUES ($1, $2, $3, 'failed')
     RETURNING id, filename, status, uploaded_at`,
    [userId, filename, storagePath]
  );
  return rows[0];
}

export async function listPlansForUser(userId) {
  const { rows } = await query(
    `SELECT
       np.id, np.filename, np.status, np.uploaded_at, np.parsed_at,
       COUNT(pi.id)::int AS item_count
     FROM nutrition_plans np
     LEFT JOIN plan_items pi ON pi.nutrition_plan_id = np.id
     WHERE np.user_id = $1
     GROUP BY np.id
     ORDER BY np.uploaded_at DESC`,
    [userId]
  );
  return rows;
}

export async function getPlanWithItems(planId, userId) {
  const { rows: planRows } = await query(
    `SELECT id, filename, status, uploaded_at, parsed_at
     FROM nutrition_plans
     WHERE id = $1 AND user_id = $2`,
    [planId, userId]
  );
  const plan = planRows[0];
  if (!plan) return null;

  const { rows: items } = await query(
    `SELECT id, food_name, quantity, unit, frequency, price_range_min, price_range_max, matched_product_id
     FROM plan_items
     WHERE nutrition_plan_id = $1
     ORDER BY created_at ASC`,
    [planId]
  );

  return { ...plan, items };
}
