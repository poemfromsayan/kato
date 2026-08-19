import { query } from '../../db/pool.js';

export function listCategories() {
  return query(`SELECT id, slug, name FROM categories ORDER BY name ASC`).then((r) => r.rows);
}
