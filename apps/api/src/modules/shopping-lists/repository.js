/**
 * modules/shopping-lists/repository.js — Generar y consultar listas de
 * compras a partir de un plan nutricional ya parseado.
 *
 * IMPORTANTE (limitación conocida, a propósito no disimulada): la
 * "mejor tienda" para cada producto se elige HOY solo por precio más bajo.
 * El schema soporta price_quality_preference (price/quality/balance) y ese
 * valor se guarda en shopping_lists.preference_used para no perder la señal,
 * pero todavía no existe ninguna fuente de datos real de "calidad por
 * tienda" (reputación, frescura, etc.) — inventar un ranking a mano sería
 * mostrarle al usuario un dato con apariencia oficial que no lo es. Cuando
 * haya una señal real, este es el único lugar que hay que tocar.
 */

import { query, withTransaction } from '../../db/pool.js';

/**
 * Busca el producto del catálogo cuyo nombre más se parece a `foodName`
 * (texto libre que salió del parseo del plan con IA). Usa el mismo
 * mecanismo de similaridad (pg_trgm) que el buscador de productos — ver
 * modules/products/repository.js. Si no hay ningún producto por encima del
 * umbral de similaridad, no se fuerza ningún match.
 */
async function findBestProductMatch(client, foodName) {
  const { rows } = await client.query(
    `SELECT id, name, similarity(name, $1) AS score
     FROM products
     WHERE name % $1
     ORDER BY score DESC
     LIMIT 1`,
    [foodName]
  );
  return rows[0] ?? null;
}

/**
 * La tienda más barata con stock para un producto ya resuelto. Reutiliza la
 * misma vista current_prices que usa el comparador (modules/prices).
 */
async function findCheapestStoreProduct(client, productId) {
  const { rows } = await client.query(
    `SELECT sp.id AS store_product_id, s.name AS store_name, cp.price
     FROM store_products sp
     JOIN stores s ON s.id = sp.store_id
     JOIN current_prices cp ON cp.store_product_id = sp.id
     WHERE sp.product_id = $1
       AND sp.is_active = true
       AND s.is_active = true
       AND cp.in_stock = true
     ORDER BY cp.price ASC
     LIMIT 1`,
    [productId]
  );
  return rows[0] ?? null;
}

/**
 * Genera una lista de compras nueva para un plan (crea una fila en
 * shopping_lists + una por cada item resuelto en shopping_list_items).
 * Cada llamada crea una lista NUEVA a propósito — shopping_lists es un
 * historial de snapshots, no un documento que se edita in-place, así el
 * usuario puede volver a generar si los precios cambiaron sin perder la
 * lista anterior.
 *
 * @returns {Promise<
 *   | { notFound: true }
 *   | { notParsed: true }
 *   | { noMatches: true }
 *   | { list: object }
 * >}
 */
export async function generateShoppingList({ planId, userId, preferenceUsed }) {
  return withTransaction(async (client) => {
    const { rows: planRows } = await client.query(
      `SELECT id, filename, status FROM nutrition_plans WHERE id = $1 AND user_id = $2`,
      [planId, userId]
    );
    const plan = planRows[0];
    if (!plan) return { notFound: true };
    if (plan.status !== 'parsed') return { notParsed: true };

    const { rows: items } = await client.query(
      `SELECT id, food_name, quantity, unit, matched_product_id
       FROM plan_items
       WHERE nutrition_plan_id = $1
       ORDER BY created_at ASC`,
      [planId]
    );

    // Matching: "lo resuelve nuestro código, no la IA" (ver comentario en
    // plan_items.matched_product_id, migrations/0001_init.sql). Se hace acá,
    // en el momento de generar la lista, y se persiste para no repetir el
    // trabajo la próxima vez que este mismo plan se use.
    for (const item of items) {
      if (item.matched_product_id) continue;
      const match = await findBestProductMatch(client, item.food_name);
      if (match) {
        item.matched_product_id = match.id;
        await client.query(`UPDATE plan_items SET matched_product_id = $1 WHERE id = $2`, [match.id, item.id]);
      }
    }

    const resolved = [];
    const unmatchedItems = [];

    for (const item of items) {
      if (!item.matched_product_id) {
        unmatchedItems.push({ id: item.id, foodName: item.food_name });
        continue;
      }
      const cheapest = await findCheapestStoreProduct(client, item.matched_product_id);
      if (!cheapest) {
        // Está en el catálogo pero ninguna tienda tiene precio/stock vigente.
        unmatchedItems.push({ id: item.id, foodName: item.food_name });
        continue;
      }
      resolved.push({
        planItemId: item.id,
        foodName: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        storeProductId: cheapest.store_product_id,
        storeName: cheapest.store_name,
        unitPrice: Number(cheapest.price),
      });
    }

    if (resolved.length === 0) {
      return { noMatches: true, unmatchedCount: unmatchedItems.length };
    }

    const { rows: listRows } = await client.query(
      `INSERT INTO shopping_lists (nutrition_plan_id, user_id, preference_used)
       VALUES ($1, $2, $3)
       RETURNING id, generated_at, preference_used`,
      [planId, userId, preferenceUsed]
    );
    const list = listRows[0];

    for (const r of resolved) {
      await client.query(
        `INSERT INTO shopping_list_items (shopping_list_id, plan_item_id, store_product_id, unit_price, store_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [list.id, r.planItemId, r.storeProductId, r.unitPrice, r.storeName]
      );
    }

    return {
      list: {
        id: list.id,
        planId,
        planFilename: plan.filename,
        generatedAt: list.generated_at,
        preferenceUsed: list.preference_used,
        items: resolved.map((r) => ({
          foodName: r.foodName,
          quantity: r.quantity,
          unit: r.unit,
          storeName: r.storeName,
          unitPrice: r.unitPrice,
        })),
        totalEstimate: resolved.reduce((sum, r) => sum + r.unitPrice, 0),
        unmatchedItems: unmatchedItems.map((i) => i.foodName),
      },
    };
  });
}

export async function listShoppingListsForUser(userId) {
  const { rows } = await query(
    `SELECT
       sl.id, sl.generated_at, sl.preference_used,
       np.id AS plan_id, np.filename AS plan_filename,
       COUNT(sli.id)::int AS item_count,
       COALESCE(SUM(sli.unit_price), 0)::float AS total_estimate
     FROM shopping_lists sl
     JOIN nutrition_plans np ON np.id = sl.nutrition_plan_id
     LEFT JOIN shopping_list_items sli ON sli.shopping_list_id = sl.id
     WHERE sl.user_id = $1
     GROUP BY sl.id, np.id, np.filename
     ORDER BY sl.generated_at DESC`,
    [userId]
  );
  return rows;
}

export async function getShoppingListById(id, userId) {
  const { rows: listRows } = await query(
    `SELECT sl.id, sl.generated_at, sl.preference_used, np.id AS plan_id, np.filename AS plan_filename
     FROM shopping_lists sl
     JOIN nutrition_plans np ON np.id = sl.nutrition_plan_id
     WHERE sl.id = $1 AND sl.user_id = $2`,
    [id, userId]
  );
  const list = listRows[0];
  if (!list) return null;

  const { rows: items } = await query(
    `SELECT sli.unit_price, sli.store_name, pi.food_name, pi.quantity, pi.unit
     FROM shopping_list_items sli
     JOIN plan_items pi ON pi.id = sli.plan_item_id
     WHERE sli.shopping_list_id = $1
     ORDER BY sli.store_name ASC, pi.food_name ASC`,
    [id]
  );

  return {
    ...list,
    items,
    totalEstimate: items.reduce((sum, i) => sum + Number(i.unit_price), 0),
  };
}
