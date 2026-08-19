/**
 * scripts/makeAdmin.js — Marca una cuenta existente como admin (is_admin =
 * true), para poder revisar escaneos de productos en /admin/escaneos.
 *
 * No hay flujo de registro para admins a propósito: crear un admin es una
 * decisión operativa puntual, no algo que deba quedar expuesto como
 * endpoint de la API (sería una superficie de ataque innecesaria en un
 * proyecto de un solo operador).
 *
 * Uso: node scripts/makeAdmin.js tu-correo@ejemplo.com
 */

import pg from 'pg';
import { config } from '../src/config/env.js';

const { Client } = pg;

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node scripts/makeAdmin.js tu-correo@ejemplo.com');
    process.exit(1);
  }

  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.isProduction ? { rejectUnauthorized: true } : false,
  });
  await client.connect();

  try {
    const { rows } = await client.query(
      `UPDATE users SET is_admin = true WHERE email = $1 RETURNING id, email, is_admin`,
      [email]
    );

    if (rows.length === 0) {
      console.error(`No existe ninguna cuenta con el correo "${email}".`);
      process.exit(1);
    }

    console.log(`✓ ${rows[0].email} ahora es admin (is_admin = true).`);
    console.log('Cerrá sesión y volvé a entrar en la app para que el cambio se refleje.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
