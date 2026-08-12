import { query } from '../../db/pool.js';

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, display_name, price_quality_preference
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function createUser({ email, passwordHash, displayName }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, price_quality_preference`,
    [email, passwordHash, displayName ?? null]
  );
  return rows[0];
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, display_name, price_quality_preference
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Update parcial: solo toca las columnas que vienen definidas en `fields`,
 * así el mismo endpoint sirve tanto para "solo cambiar preferencia" como
 * "solo cambiar nombre" sin pisar el otro campo con null por accidente.
 */
export async function updateUser(id, fields) {
  const setClauses = [];
  const values = [];

  if (fields.displayName !== undefined) {
    values.push(fields.displayName);
    setClauses.push(`display_name = $${values.length}`);
  }
  if (fields.priceQualityPreference !== undefined) {
    values.push(fields.priceQualityPreference);
    setClauses.push(`price_quality_preference = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $${values.length}
     RETURNING id, email, display_name, price_quality_preference`,
    values
  );
  return rows[0] ?? null;
}
