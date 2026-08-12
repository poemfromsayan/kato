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

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'nutrition-plans');

export async function savePdf(buffer, originalFilename) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Nunca usamos el nombre original para construir la ruta en disco (path
  // traversal / colisiones); el nombre original se guarda aparte, solo
  // como metadato para mostrarlo en la UI.
  const safeName = `${randomUUID()}.pdf`;
  const fullPath = path.join(UPLOAD_DIR, safeName);

  await writeFile(fullPath, buffer);

  return { storagePath: path.join('nutrition-plans', safeName), originalFilename };
}
