import { query } from '../../db/pool.js';

/**
 * Búsqueda de productos por nombre usando pg_trgm (similaridad de texto),
 * pensada tanto para el buscador del frontend como para el matching de
 * texto libre que sale del parseo de planes nutricionales con Claude.
 */
export async function searchProducts({ text, categoryId, limit }) {
  const conditions = [];
  const params = [];

  if (text) {
    params.push(text);
    conditions.push(`p.name % $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const { rows } = await query(
    `SELECT p.id, p.name, p.brand, p.unit, p.unit_size, c.name AS category
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY ${text ? `similarity(p.name, $1) DESC` : 'p.name ASC'}
     LIMIT $${params.length}`,
    params
  );

  return rows;
}

export async function getProductById(id) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.brand, p.unit, p.unit_size, c.name AS category
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
