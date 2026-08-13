/**
 * components/shoppingList.js — Renderiza una lista de compras ya generada:
 * agrupada por tienda (para que el usuario sepa a dónde ir), con subtotal
 * por tienda y total general. Acepta tanto la forma que devuelve el POST de
 * generación (camelCase) como la que devuelve el GET de detalle
 * (snake_case en los items, porque viene directo de la fila de Postgres) —
 * así el mismo componente sirve para los dos casos sin duplicar lógica.
 */

import { div, p, span } from '../html.js';

const currencyFormatter = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

function pick(item, camelKey, snakeKey) {
  return item[camelKey] ?? item[snakeKey];
}

export function ShoppingListView({ shoppingList, parent = null }) {
  const card = div({ className: 'card' }, parent);

  const header = div(
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-4)' } },
    card
  );
  div({ style: { fontWeight: 'var(--fw-bold)' } }, header, '🛒 Tu lista de compras');
  const generatedAt = shoppingList.generatedAt ?? shoppingList.generated_at;
  span(
    { style: { fontSize: 'var(--fs-micro)', color: 'var(--text-subtle)' } },
    header,
    generatedAt ? new Date(generatedAt).toLocaleDateString('es-CR') : ''
  );

  const byStore = new Map();
  for (const item of shoppingList.items) {
    const storeName = pick(item, 'storeName', 'store_name');
    if (!byStore.has(storeName)) byStore.set(storeName, []);
    byStore.get(storeName).push(item);
  }

  for (const [storeName, items] of byStore) {
    const storeBlock = div({ style: { marginBottom: 'var(--space-4)' } }, card);
    const storeHeader = div(
      {
        style: {
          display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-caption)',
          fontWeight: 'var(--fw-medium)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)',
        },
      },
      storeBlock
    );
    span({}, storeHeader, storeName);
    const subtotal = items.reduce((sum, i) => sum + Number(pick(i, 'unitPrice', 'unit_price')), 0);
    span({ style: { fontFamily: 'var(--font-mono)' } }, storeHeader, currencyFormatter.format(subtotal));

    items.forEach((item) => {
      const row = div({ className: 'plan-item-row' }, storeBlock);
      span({ className: 'plan-item-row__name' }, row, pick(item, 'foodName', 'food_name'));
      span({ className: 'plan-item-row__meta' }, row, currencyFormatter.format(Number(pick(item, 'unitPrice', 'unit_price'))));
    });
  }

  const total = div(
    {
      style: {
        display: 'flex', justifyContent: 'space-between', fontWeight: 'var(--fw-bold)',
        borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-1)',
      },
    },
    card
  );
  span({}, total, 'Total estimado');
  span({ style: { fontFamily: 'var(--font-mono)' } }, total, currencyFormatter.format(shoppingList.totalEstimate ?? 0));

  if (shoppingList.unmatchedItems?.length) {
    p(
      { style: { fontSize: 'var(--fs-micro)', color: 'var(--text-subtle)', marginTop: 'var(--space-3)', marginBottom: 0 } },
      card,
      `No encontramos en nuestro catálogo todavía: ${shoppingList.unmatchedItems.join(', ')}.`
    );
  }

  return card;
}
