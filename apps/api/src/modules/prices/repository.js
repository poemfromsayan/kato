import { query } from '../../db/pool.js';

/**
 * Precio actual (último snapshot) de un producto en cada tienda que lo vende.
 * Usa la vista current_prices en vez de calcular "el más reciente" a mano
 * en cada query — ver docs/DATA_MODEL.md.
 */
export async function getCurrentPricesForProduct(productId) {
  const { rows } = await query(
    `SELECT
       s.id    AS store_id,
       s.name  AS store_name,
       s.logo_url,
       sp.id   AS store_product_id,
       sp.product_url,
       cp.price,
       cp.currency,
       cp.in_stock,
       cp.scraped_at
     FROM store_products sp
     JOIN stores s ON s.id = sp.store_id
     JOIN current_prices cp ON cp.store_product_id = sp.id
     WHERE sp.product_id = $1
       AND sp.is_active = true
       AND s.is_active = true
     ORDER BY cp.price ASC`,
    [productId]
  );
  return rows;
}
