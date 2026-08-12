import { div, span } from '../html.js';
import { Badge } from './feedback.js';

const currencyFormatter = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

function formatPrice(value, currency) {
  if (currency && currency !== 'CRC') return `${currency} ${value}`;
  return currencyFormatter.format(value);
}

/**
 * @param {{ name: string, brand?: string, unit: string, unitSize: number }} product
 * @param {Array<{ store_id: string, store_name: string, price: number, currency: string, in_stock: boolean }>} prices
 * @param {string|null} cheapestStoreId
 */
export function ProductCard({ product, prices, cheapestStoreId, parent = null }) {
  const card = div({ className: 'card product-card' }, parent);

  const top = div({ className: 'product-card__top' }, card);
  div({ className: 'product-card__thumb' }, top, '🛒');
  const meta = div({}, top);
  div({ className: 'product-card__title' }, meta, product.name);
  span(
    { className: 'product-card__sub' },
    meta,
    `${product.brand ? product.brand + ' · ' : ''}${product.unit_size} ${product.unit}`
  );

  if (prices.length === 0) {
    const empty = div({ className: 'product-card__stores' }, card);
    span({ style: { color: 'var(--text-subtle)', fontSize: 'var(--fs-caption)' } }, empty, 'Sin precios registrados todavía.');
    return card;
  }

  const storeList = div({ className: 'product-card__stores' }, card);
  prices.forEach((p) => {
    const isBest = p.store_id === cheapestStoreId;
    const row = div({ className: ['store-row', isBest ? 'store-row--best' : ''] }, storeList);
    const nameEl = span({ className: 'store-row__name' }, row);
    span({ className: 'store-row__dot' }, nameEl);
    nameEl.appendChild(document.createTextNode(p.store_name + (p.in_stock ? '' : ' (agotado)')));
    span({ className: 'store-row__price' }, row, formatPrice(p.price, p.currency));
  });

  return card;
}

const STATUS_VARIANT = { parsed: 'success', processing: 'accent', uploaded: 'neutral', failed: 'error' };
const STATUS_LABEL = { parsed: 'Procesado', processing: 'Procesando', uploaded: 'Subido', failed: 'Falló' };

export function PlanSummaryCard({ plan, onClick = null, parent = null }) {
  const card = div({ className: 'card', style: { cursor: onClick ? 'pointer' : 'default' }, onClick }, parent);

  const top = div({ style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' } }, card);
  const meta = div({}, top);
  div({ className: 'product-card__title' }, meta, plan.filename);
  span(
    { className: 'product-card__sub' },
    meta,
    `${plan.item_count} alimento${plan.item_count === 1 ? '' : 's'} · ${new Date(plan.uploaded_at).toLocaleDateString('es-CR')}`
  );
  Badge({ text: STATUS_LABEL[plan.status] ?? plan.status, variant: STATUS_VARIANT[plan.status] ?? 'neutral', parent: top });

  return card;
}
