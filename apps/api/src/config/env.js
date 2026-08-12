/**
 * config/env.js — Carga y valida las variables de entorno con zod.
 *
 * Fallar rápido y claro en el arranque (en vez de descubrir a medio request
 * que falta una env var) es más seguro y más fácil de depurar.
 */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN es obligatorio'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  // Opcional a propósito: sin esto, todo el resto de la app funciona (auth,
  // productos, precios). Solo "subir plan nutricional" la necesita — y esa
  // ruta puntual valida su presencia por su cuenta (ver services/ai/client.js)
  // en vez de bloquear el arranque de toda la API por una función que puede
  // no estar en uso todavía.
  ANTHROPIC_API_KEY: z.string().optional(),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('✖ Variables de entorno inválidas o faltantes:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nRevisa tu archivo .env contra .env.example.');
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  corsOrigins: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  jwtSecret: env.JWT_SECRET,
  anthropicApiKey: env.ANTHROPIC_API_KEY || null,
  maxUploadBytes: env.MAX_UPLOAD_BYTES,
};
