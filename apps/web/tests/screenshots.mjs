import { chromium } from 'playwright';

const BASE_URL = process.env.WEB_URL || 'http://localhost:5173';
const OUT_DIR = process.env.OUT_DIR || '/tmp';
const email = process.env.PREVIEW_EMAIL || `preview-${Date.now()}@example.com`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });

await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT_DIR}/1-login.png` });

await page.click('.auth-tabs__btn:has-text("Crear cuenta")');
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', 'unaContraseñaLarga789');
await page.click('button[type="submit"]');
await page.waitForTimeout(700);
console.log('registrado:', email);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT_DIR}/2-dashboard.png` });

await page.click('a[href="/comparador"]');
await page.fill('.input', 'pollo');
await page.waitForTimeout(600);
await page.click('button.card:has-text("Pechuga de pollo")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT_DIR}/3-comparador.png` });

await page.click('a[href="/subir-plan"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT_DIR}/4-subir-plan.png` });

await page.click('button[aria-label="Cambiar tema"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT_DIR}/5-subir-plan-dark.png` });

await page.click('a[href="/"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/6-dashboard-dark.png` });

await browser.close();
console.log('listo');
