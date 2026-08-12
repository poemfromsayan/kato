/**
 * main.js — Punto de entrada. Inicializa el tema y renderiza todas las
 * secciones del sistema de diseño dentro de los contenedores definidos
 * en index.html, usando exclusivamente html.js para construir el DOM.
 */

import { div, span, strong, p } from './html.js';
import { initTheme, ThemeToggle, AccentPicker } from './theme.js';
import {
  Button, IconButton, Field, TextInput, Select, CheckRow, Switch,
  Badge, Alert, ProductCard, NutritionCard, BottomNav, Modal,
} from './components.js';
import { MOCK_PRODUCT, MOCK_MACROS, MOCK_NAV_ITEMS } from './data.js';

initTheme();

const $ = (id) => document.getElementById(id);

// ───────────────────────── Topbar ─────────────────────────

AccentPicker({ parent: $('topbar-accent') });
ThemeToggle({ parent: $('topbar-theme') });

// ───────────────────────── Color tokens ─────────────────────────

function Swatch(container, varRef, name, fillStyle) {
  const box = div({ className: 'ds-swatch' }, container);
  div({ className: 'ds-swatch__fill', style: { background: fillStyle || `var(${varRef})` } }, box);
  const labelRow = div({ className: 'ds-swatch__label' }, box);
  span({}, labelRow, name);
  span({}, labelRow, varRef);
}

const neutrals = [
  ['950', '--gray-950'], ['900', '--gray-900'], ['800', '--gray-800'], ['700', '--gray-700'],
  ['600', '--gray-600'], ['500', '--gray-500'], ['400', '--gray-400'], ['300', '--gray-300'],
  ['200', '--gray-200'], ['100', '--gray-100'], ['50', '--gray-50'],
];
neutrals.forEach(([name, ref]) => Swatch($('color-neutrals'), ref, `gray-${name}`));

const accentSteps = [
  ['100', '--accent-100'], ['400', '--accent-400'], ['500', '--accent-500'],
  ['600', '--accent-600'], ['700', '--accent-700'],
];
accentSteps.forEach(([name, ref]) => Swatch($('color-accent'), ref, `accent-${name}`));

const semantic = [
  ['success', '--success-500'], ['warning', '--warning-500'],
  ['error', '--error-500'], ['info', '--info-500'],
];
semantic.forEach(([name, ref]) => Swatch($('color-semantic'), ref, name));

// ───────────────────────── Tipografía ─────────────────────────

const typeSpecimens = [
  { tag: 'div', sample: 'Katö', size: 'var(--fs-display)', weight: 700, meta: 'Display / 48.8px / Space Grotesk 700' },
  { tag: 'div', sample: 'Comparador de precios', size: 'var(--fs-h1)', weight: 700, meta: 'H1 / 39px / 700' },
  { tag: 'div', sample: 'Plan nutricional semanal', size: 'var(--fs-h2)', weight: 700, meta: 'H2 / 31px / 700' },
  { tag: 'div', sample: 'Productos más económicos', size: 'var(--fs-h3)', weight: 700, meta: 'H3 / 25px / 700' },
  { tag: 'div', sample: 'Resumen de tu semana', size: 'var(--fs-h4)', weight: 700, meta: 'H4 / 20px / 700' },
  { tag: 'div', sample: 'Encontramos 3 opciones más baratas cerca de ti.', size: 'var(--fs-body-lg)', weight: 400, meta: 'Body LG / 18px / 400' },
  { tag: 'div', sample: 'Ingresa tu plan nutricional en PDF para comenzar.', size: 'var(--fs-body)', weight: 400, meta: 'Body / 16px / 400' },
  { tag: 'div', sample: 'Actualizado hace 5 minutos', size: 'var(--fs-caption)', weight: 500, meta: 'Caption / 14px / 500' },
];

typeSpecimens.forEach((s) => {
  const row = div({ className: 'ds-type-row' }, $('type-scale'));
  div({ style: { fontSize: s.size, fontWeight: s.weight, letterSpacing: '-0.01em' } }, row, s.sample);
  span({ className: 'ds-type-row__meta' }, row, s.meta);
});

const monoRow = div({ className: 'ds-type-row' }, $('type-scale'));
div({ className: 'ds-mono-figure', style: { fontSize: 'var(--fs-h2)', fontWeight: 700 } }, monoRow, '₡2,890');
span({ className: 'ds-type-row__meta' }, monoRow, 'Precio / Space Mono 700 — usado para todo dato numérico');

// ───────────────────────── Spacing & radius ─────────────────────────

const spacingSteps = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
spacingSteps.forEach((px) => {
  const row = div({ className: 'ds-scale-row' }, $('spacing-scale'));
  span({ className: 'ds-scale-row__label' }, row, `${px}px`);
  div({ className: 'ds-scale-row__bar', style: { width: `${px * 3}px` } }, row);
});

const radiusSteps = [
  ['sm · 8px', 'var(--radius-sm)'], ['md · 12px', 'var(--radius-md)'],
  ['lg · 16px', 'var(--radius-lg)'], ['xl · 24px', 'var(--radius-xl)'],
  ['full', 'var(--radius-full)'],
];
radiusSteps.forEach(([name, val]) => {
  const box = div({ className: 'ds-radius-box', style: { borderRadius: val } }, $('radius-scale'));
  box.textContent = name;
});

// ───────────────────────── Sombras ─────────────────────────

[['sm', 'var(--shadow-sm)'], ['md', 'var(--shadow-md)'], ['lg', 'var(--shadow-lg)'], ['glow', 'var(--shadow-glow)']]
  .forEach(([name, val]) => {
    const card = div({ className: 'ds-shadow-card', style: { boxShadow: val } }, $('shadow-scale'));
    card.textContent = `shadow-${name}`;
  });

// ───────────────────────── Botones ─────────────────────────

['primary', 'secondary', 'ghost', 'danger'].forEach((variant) => {
  Button({ label: variant === 'primary' ? 'Comparar precios' : variant === 'secondary' ? 'Ver detalles' : variant === 'ghost' ? 'Cancelar' : 'Eliminar', variant, size: 'md', parent: $('buttons-variants') });
});

['sm', 'md', 'lg'].forEach((size) => Button({ label: `Botón ${size}`, variant: 'primary', size, parent: $('buttons-sizes') }));

Button({ label: 'Botón activo', variant: 'primary', parent: $('buttons-states') });
Button({ label: 'Botón deshabilitado', variant: 'primary', disabled: true, parent: $('buttons-states') });
IconButton({ icon: '⚙️', ariaLabel: 'Configuración', parent: $('buttons-states') });
IconButton({ icon: '🔔', ariaLabel: 'Notificaciones', parent: $('buttons-states') });

// ───────────────────────── Formularios ─────────────────────────

const formsGrid = $('forms-showcase');

Field({ labelText: 'Buscar producto', control: TextInput({ placeholder: 'Ej. arroz, pollo, leche…', icon: '🔍' }), parent: formsGrid });
Field({ labelText: 'Supermercado', control: Select({ options: ['Todos', 'Automercado', 'MaxiPali', 'Walmart', 'Pricesmart'] }), parent: formsGrid });

const prefWrap = div({ className: 'field' }, formsGrid);
span({ className: 'field__label' }, prefWrap, 'Preferencia de compra');
CheckRow({ text: 'Priorizar precio más bajo', type: 'radio', name: 'pref', checked: true, parent: prefWrap });
CheckRow({ text: 'Priorizar calidad nutricional', type: 'radio', name: 'pref', parent: prefWrap });
CheckRow({ text: 'Balance entre precio y calidad', type: 'radio', name: 'pref', parent: prefWrap });

const switchWrap = div({ className: 'field' }, formsGrid);
span({ className: 'field__label' }, switchWrap, 'Notificarme cuando baje el precio');
const switchRow = div({ style: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' } }, switchWrap);
Switch({ checked: true, parent: switchRow });
span({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-muted)' } }, switchRow, 'Activado');

// ───────────────────────── Badges ─────────────────────────

const badgeData = [
  ['Más barato', 'success'], ['Mejor calidad', 'accent'], ['Alto en proteína', 'accent'],
  ['Bajo en sodio', 'success'], ['Precio subió', 'warning'], ['Sin stock', 'error'], ['Genérico', 'neutral'],
];
badgeData.forEach(([text, variant]) => Badge({ text, variant, parent: $('badges-showcase') }));

// ───────────────────────── Cards ─────────────────────────

ProductCard({ ...MOCK_PRODUCT, parent: $('cards-showcase') });
NutritionCard({ macros: MOCK_MACROS, parent: $('cards-showcase') });

// ───────────────────────── Navegación ─────────────────────────

BottomNav({ items: MOCK_NAV_ITEMS, parent: $('nav-showcase') });

// ───────────────────────── Feedback: alertas + modal ─────────────────────────

Alert({ variant: 'success', title: 'Encontramos un precio mejor', text: 'Arroz 1kg bajó a ₡890 en Walmart.', parent: $('feedback-alerts') });
Alert({ variant: 'warning', title: 'Producto agotado', text: 'Leche deslactosada no disponible en Automercado.', parent: $('feedback-alerts') });
Alert({ variant: 'error', title: 'No pudimos leer tu PDF', text: 'Intenta subir el plan nutricional en otro formato.', parent: $('feedback-alerts') });
Alert({ variant: 'info', title: 'Actualización de precios', text: 'Los precios se sincronizan cada 24 horas.', parent: $('feedback-alerts') });

const modal = Modal({
  title: 'Subir plan nutricional',
  bodyBuilder: (body) => {
    const drop = div({ className: 'dropzone' }, body);
    drop.textContent = '📄 Arrastra tu PDF aquí o haz clic para seleccionar';
    const actions = div({ className: 'modal__actions' }, body);
    Button({ label: 'Cancelar', variant: 'ghost', onClick: () => modal.classList.remove('is-open'), parent: actions });
    Button({ label: 'Analizar plan', variant: 'primary', parent: actions });
  },
  parent: document.body,
});

Button({ label: 'Subir plan nutricional', variant: 'primary', onClick: () => modal.classList.add('is-open'), parent: $('feedback-modal-trigger') });

// ───────────────────────── Phone mockups (pantallas reales) ─────────────────────────

function buildDashboardScreen(screen) {
  const head = div({ className: 'phone-frame__header' }, screen);
  strong({}, head, 'Hola, Saúl 👋');
  IconButton({ icon: '🔔', ariaLabel: 'Notificaciones' , parent: head });
  NutritionCard({ title: 'Hoy', macros: MOCK_MACROS, parent: screen });
  ProductCard({ ...MOCK_PRODUCT, parent: screen });
}

function buildCompareScreen(screen) {
  const head = div({ className: 'phone-frame__header' }, screen);
  strong({}, head, 'Comparar precios');
  IconButton({ icon: '⚙️', ariaLabel: 'Filtros', parent: head });
  Field({ labelText: '', control: TextInput({ placeholder: 'Buscar producto…', icon: '🔍' }), parent: screen });
  const badgesRow = div({ style: { display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' } }, screen);
  Badge({ text: 'Más barato', variant: 'success', parent: badgesRow });
  Badge({ text: 'Mejor calidad', variant: 'accent', parent: badgesRow });
  ProductCard({ ...MOCK_PRODUCT, parent: screen });
  const p2 = { ...MOCK_PRODUCT, name: 'Arroz 1kg', icon: '🍚', sub: 'Categoría: Grano · Marca genérica', stores: [
    { name: 'Automercado', price: '₡1,050', dot: 'var(--info-500)', best: false },
    { name: 'MaxiPali', price: '₡980', dot: 'var(--warning-500)', best: false },
    { name: 'Walmart', price: '₡890', dot: 'var(--success-500)', best: true },
  ]};
  ProductCard({ ...p2, parent: screen });
}

function PhoneMockup({ builder, caption, parent }) {
  const wrap = div({}, parent);
  const frame = div({ className: 'phone-frame' }, wrap);
  div({ className: 'phone-frame__notch' }, frame);
  const screen = div({ className: 'phone-frame__screen' }, frame);
  builder(screen);
  BottomNav({ items: MOCK_NAV_ITEMS, parent: frame });
  p({ className: 'phone-mockups__caption' }, wrap, caption);
}

PhoneMockup({ builder: buildDashboardScreen, caption: 'Dashboard nutricional', parent: $('phone-mockups') });
PhoneMockup({ builder: buildCompareScreen, caption: 'Comparador de precios', parent: $('phone-mockups') });
