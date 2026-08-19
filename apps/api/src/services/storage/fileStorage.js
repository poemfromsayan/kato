/**
 * services/storage/fileStorage.js — Guarda el PDF subido y devuelve una
 * referencia (`storagePath`), nunca el contenido en la base de datos
 * (ver docs/DATA_MODEL.md).
 *
 * Implementación local en disco para desarrollo. En producción, reemplazar
 * por un bucket (S3/GCS/Cloud Storage) con URLs firmadas de acceso — la
 * firma de esta función no debería cambiar al hacer ese swap.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PLANS_DIR = path.join(process.cwd(), 'uploads', 'nutrition-plans');
const SCANS_DIR = path.join(process.cwd(), 'uploads', 'product-scans');

const IMAGE_EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function savePdf(buffer, originalFilename) {
  await mkdir(PLANS_DIR, { recursive: true });

  // Nunca usamos el nombre original para construir la ruta en disco (path
  // traversal / colisiones); el nombre original se guarda aparte, solo
  // como metadato para mostrarlo en la UI.
  const safeName = `${randomUUID()}.pdf`;
  const fullPath = path.join(PLANS_DIR, safeName);

  await writeFile(fullPath, buffer);

  return { storagePath: path.join('nutrition-plans', safeName), originalFilename };
}

/**
 * Guarda una foto de un escaneo de producto (empaque o tabla nutricional).
 * Mismo criterio que savePdf: nombre generado, nunca el original.
 */
export async function saveScanImage(buffer, mimeType) {
  await mkdir(SCANS_DIR, { recursive: true });

  const extension = IMAGE_EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error(`Tipo de imagen no soportado: ${mimeType}`);
  }

  const safeName = `${randomUUID()}.${extension}`;
  const fullPath = path.join(SCANS_DIR, safeName);

  await writeFile(fullPath, buffer);

  return path.join('product-scans', safeName);
}
