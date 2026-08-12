import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

const email = `e2e-${Date.now()}@example.com`;

// 1. Ir a la raíz sin sesión -> debe redirigir a /login
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
console.log('1) URL tras entrar sin sesión:', new URL(page.url()).pathname, '(esperado: /login)');

// 2. Registrarse
await page.click('.auth-tabs__btn:has-text("Crear cuenta")');
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', 'unaContraseñaLarga789');
await page.click('button[type="submit"]');
await page.waitForTimeout(800);
console.log('2) URL tras registro:', new URL(page.url()).pathname, '(esperado: /)');
console.log('   saludo:', await page.locator('.screen-title').first().textContent());

// 3. Ir al comparador y buscar "pollo"
await page.click('a[href="/comparador"]');
await page.waitForTimeout(200);
await page.fill('.input', 'pollo');
await page.waitForTimeout(600); // debounce + fetch
const resultsText = await page.locator('#app').innerText();
console.log('3) Contiene "Pechuga de pollo" en resultados:', resultsText.includes('Pechuga de pollo'));

// 4. Click en el resultado y verificar que MaxiPali (el más barato) se marca
await page.click('button.card:has-text("Pechuga de pollo")');
await page.waitForTimeout(500);
const detailText = await page.locator('#app').innerText();
console.log('4) Muestra las 3 tiendas:', ['Automercado', 'MaxiPali', 'Walmart'].every((s) => detailText.includes(s)));
const bestRowColor = await page.locator('.store-row--best .store-row__price').evaluate((el) => getComputedStyle(el).color);
console.log('   precio del más barato tiene color success (no gris):', bestRowColor);

// 5. Toggle de tema
const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.click('button[aria-label="Cambiar tema"]');
await page.waitForTimeout(150);
const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
console.log('5) Tema cambió:', themeBefore, '->', themeAfter);

// 6. Ir a subir plan, ver que el dropzone está
await page.click('a[href="/subir-plan"]');
await page.waitForTimeout(200);
console.log('6) Dropzone visible:', await page.locator('.dropzone').isVisible());

// 7. Logout y verificar que rutas protegidas redirigen de nuevo a login
await page.click('button[aria-label="Cerrar sesión"]');
await page.waitForTimeout(300);
console.log('7) URL tras logout:', new URL(page.url()).pathname, '(esperado: /login)');

await page.goto('http://localhost:5173/comparador', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
console.log('   URL al pedir /comparador sin sesión:', new URL(page.url()).pathname, '(esperado: /login, con ?next=)');
console.log('   query string:', new URL(page.url()).search);

await page.screenshot({ path: '/tmp/web-login.png' });

console.log('\nERRORES DE CONSOLA/JS:', errors.length ? errors : 'NINGUNO');

await browser.close();
