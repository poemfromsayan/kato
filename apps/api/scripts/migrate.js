/**
 * scripts/migrate.js — Runner de migraciones minimalista.
 *
 * Aplica en orden los .sql de src/db/migrations que no estén registrados
 * todavía en la tabla schema_migrations. Cada archivo corre dentro de su
 * propia transacción: si falla, no queda a medias.
 *
 * Uso: npm run migrate
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.isProduction ? { rejectUnauthorized: true } : false,
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.filename));

    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('Sin migraciones pendientes.');
      return;
    }

    for (const filename of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, filename), 'utf-8');
      console.log(`→ aplicando ${filename}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`  ✓ ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló la migración ${filename}: ${err.message}`);
      }
    }

    console.log(`Listo. ${pending.length} migración(es) aplicada(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
