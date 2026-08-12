import { query } from '../../db/pool.js';

export function listActiveStores() {
  return query(
    `SELECT id, slug, name, website_url, logo_url
     FROM stores
     WHERE is_active = true
     ORDER BY name ASC`
  ).then((r) => r.rows);
}
