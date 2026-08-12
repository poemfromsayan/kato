/**
 * data.js — Datos de ejemplo (mock) usados solo para ilustrar los
 * componentes del sistema de diseño. No representan datos reales
 * de ningún supermercado ni fuente oficial.
 */

export const ACCENTS = [
  { id: 'lima', label: 'Lima eléctrico' },
  { id: 'coral', label: 'Coral vívido' },
  { id: 'azul', label: 'Azul eléctrico' },
  { id: 'violeta', label: 'Violeta' },
];

export const MOCK_PRODUCT = {
  name: 'Pechuga de pollo 1kg',
  sub: 'Categoría: Proteína · Marca genérica',
  icon: '🍗',
  stores: [
    { name: 'Automercado', price: '₡3,450', dot: 'var(--info-500)', best: false },
    { name: 'MaxiPali', price: '₡2,890', dot: 'var(--success-500)', best: true },
    { name: 'Walmart', price: '₡3,120', dot: 'var(--warning-500)', best: false },
  ],
};

export const MOCK_MACROS = [
  { label: 'Proteína', value: '120g / 150g', pct: 80, color: 'var(--accent-500)' },
  { label: 'Carbohidratos', value: '180g / 220g', pct: 62, color: 'var(--info-500)' },
  { label: 'Grasas', value: '45g / 65g', pct: 40, color: 'var(--warning-500)' },
];

export const MOCK_NAV_ITEMS = [
  { icon: '🏠', label: 'Inicio', active: true },
  { icon: '🔍', label: 'Comparar', active: false },
  { icon: '📋', label: 'Plan', active: false },
  { icon: '👤', label: 'Perfil', active: false },
];

export const MOCK_STORE_COMPARE = [
  { product: 'Arroz 1kg', best: 'Walmart', price: '₡890' },
  { product: 'Leche entera 1L', best: 'MaxiPali', price: '₡720' },
  { product: 'Huevos x12', best: 'Automercado', price: '₡1,650' },
];
