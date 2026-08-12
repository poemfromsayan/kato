/**
 * db/pool.js — Pool de conexiones a Postgres compartido por toda la app.
 *
 * Usar siempre `query()` con parámetros ($1, $2...) en vez de interpolar
 * strings — es la defensa principal contra SQL injection.
 */

import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // Errores en clientes inactivos del pool (ej. conexión caída) no deben tumbar el proceso.
  console.error('Error inesperado en el pool de Postgres:', err);
});

/**
 * Ejecuta una consulta parametrizada.
 * @param {string} text
 * @param {unknown[]} params
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta una serie de operaciones dentro de una transacción.
 * @param {(client: pg.PoolClient) => Promise<unknown>} fn
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
