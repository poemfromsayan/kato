/**
 * tests/e2e.mjs — Prueba end-to-end real contra el stack completo
 * (Postgres + apps/api + apps/web), usando Playwright.
 *
 * No es parte del build de la app — es una herramienta de verificación.
 * Requiere que ya estén corriendo, en este orden:
 *   1. Postgres con la migración aplicada (ver docs/ARCHITECTURE.md)
 *   2. apps/api  → npm run dev   (puerto 3001)
 *   3. apps/web  → npm run dev   (puerto 5173)
 *
 * Y al menos un producto con precios para que el paso del comparador
 * tenga algo que encontrar — este test busca "pollo" y espera un
 * resultado; si tu base está vacía, ajustá el término de búsqueda o
 * sembrá datos primero.
 *
 * Uso:
 *   npm install --no-save playwright && npx playwright install chromium
 *   node tests/e2e.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.WEB_URL || 'http://localhost:5173';
const SEARCH_TERM = process.env.E2E_SEARCH_TERM || 'pollo';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

const email = `e2e-${Date.now()}@example.com`;
let failures = 0;

function check(label, condition) {
  console.log(`${condition ? '✓' : '✗'} ${label}`);
  if (!condition) failures++;
}

await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
check('sin sesión, redirige a /login', new URL(page.url()).pathname === '/login');

await page.click('.auth-tabs__btn:has-text("Crear cuenta")');
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', 'unaContraseñaLarga789');
await page.click('button[type="submit"]');
await page.waitForTimeout(800);
check('registro exitoso, llega al dashboard', new URL(page.url()).pathname === '/');

await page.click('a[href="/comparador"]');
await page.waitForTimeout(200);
await page.fill('.input', SEARCH_TERM);
await page.waitForTimeout(600);
const resultsVisible = await page.locator('#app .card').count();
check(`búsqueda "${SEARCH_TERM}" devuelve al menos un resultado`, resultsVisible > 0);

await page.click('button[aria-label="Cambiar tema"]');
await page.waitForTimeout(150);
check('el toggle de tema cambia data-theme', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');

await page.click('button[aria-label="Cerrar sesión"]');
await page.waitForTimeout(300);
check('logout redirige a /login', new URL(page.url()).pathname === '/login');

await page.goto(`${BASE_URL}/comparador`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const url = new URL(page.url());
check('ruta protegida sin sesión redirige con ?next=', url.pathname === '/login' && url.searchParams.get('next') === '/comparador');

check('sin errores de consola/JS', errors.length === 0);
if (errors.length) console.log(errors);

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron.`);
  process.exit(1);
}
console.log('\nTodo OK.');
