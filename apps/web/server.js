/**
 * server.js — Servidor estático de desarrollo, sin dependencias.
 *
 * Por qué uno propio en vez de `npx serve`: no queremos meter una
 * dependencia extra solo para servir archivos, y escribirlo deja claro qué
 * hace exactamente (incluyendo el fallback de SPA, que es la parte no
 * obvia — ver abajo).
 *
 * Fallback de SPA: como el router de la app usa la History API
 * (pushState), si el usuario refresca en /comparador el navegador le pide
 * a ESTE servidor el archivo "/comparador", que no existe en disco. Si no
 * hiciéramos nada, devolveríamos 404 y la app nunca cargaría. La solución
 * estándar es: si la ruta pedida no es un archivo real y no tiene
 * extensión (osea, no es un .css/.js/.png...), devolver igual index.html
 * y dejar que el router del cliente decida qué mostrar.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function resolveFile(urlPath) {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // Nunca servir nada fuera de apps/web (path traversal).
  if (!filePath.startsWith(__dirname)) return null;

  try {
    const stats = await stat(filePath);
    if (stats.isFile()) return filePath;
  } catch {
    /* no existe, seguimos al fallback */
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = await resolveFile(url.pathname === '/' ? '/index.html' : url.pathname);

  const hasExtension = path.extname(url.pathname) !== '';
  if (!filePath && !hasExtension) {
    // Fallback de SPA (ver comentario arriba).
    filePath = path.join(__dirname, 'index.html');
  }

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error del servidor');
  }
});

server.listen(PORT, () => {
  console.log(`Katö web (dev) en http://localhost:${PORT}`);
});
