import { a, div, span } from '../html.js';
import { Badge } from './feedback.js';

const currencyFormatter = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

function formatPrice(value, currency) {
  if (currency && currency !== 'CRC') return `${currency} ${value}`;
  return currencyFormatter.format(value);
}

const NUTRIENT_LABELS = [
  ['calories', 'Calorías', 'kcal'],
  ['protein_g', 'Proteína', 'g'],
  ['carbs_g', 'Carbohidratos', 'g'],
  ['fat_g', 'Grasa', 'g'],
  ['fiber_g', 'Fibra', 'g'],
  ['sugar_g', 'Azúcar', 'g'],
  ['sodium_mg', 'Sodio', 'mg'],
];

/**
 * Una entrada de nutrition_facts (un serving_size). El campo `source` es la
 * razón por la que esto NO se muestra como un simple número: 'estimated'
 * significa que nadie verificó ese dato contra ninguna tabla oficial (ver
 * docs/DATA_MODEL.md) — mostrarlo igual que un dato 'manual' (sourceado a
 * INCAP/USDA) sería prometer una precisión que no existe.
 */
function NutritionBlock({ facts, parent }) {
  const block = div({ style: { marginBottom: 'var(--space-3)' } }, parent);

  const header = div({ style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' } }, block);
  span({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-muted)' } }, header, `Por ${facts.serving_size}`);

  const grid = div(
    { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2) var(--space-4)' } },
    block
  );
  NUTRIENT_LABELS.forEach(([key, label, unit]) => {
    const value = facts[key];
    const row = div({ style: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-caption)' } }, grid);
    span({ style: { color: 'var(--text-muted)' } }, row, label);
    span(
      { style: { fontFamily: 'var(--font-mono)', color: 'var(--text)' } },
      row,
      value == null ? '—' : `${value}${unit}`
    );
  });

  const sourceLine = div({ style: { marginTop: 'var(--space-2)', fontSize: 'var(--fs-micro)' } }, block);
  if (facts.source === 'manual') {
    span({ style: { color: 'var(--text-subtle)' } }, sourceLine, '✓ Fuente verificada');
    if (facts.source_url) {
      span({ style: { color: 'var(--text-subtle)' } }, sourceLine, ' · ');
      a({ href: facts.source_url, target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--accent-500)' } }, sourceLine, 'ver fuente');
    }
  } else {
    span({ style: { color: 'var(--text-subtle)' } }, sourceLine, '⚠️ Valor estimado, no verificado contra una fuente oficial');
  }
}

/**
 * @param {{ name: string, brand?: string, unit: string, unitSize: number }} product
 * @param {Array<{ store_id: string, store_name: string, price: number, currency: string, in_stock: boolean }>} prices
 * @param {string|null} cheapestStoreId
 * @param {Array<object>} [nutritionFacts]
 */
export function ProductCard({ product, prices, cheapestStoreId, nutritionFacts = [], parent = null }) {
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
  } else {
    const storeList = div({ className: 'product-card__stores' }, card);
    prices.forEach((p) => {
      const isBest = p.store_id === cheapestStoreId;
      const row = div({ className: ['store-row', isBest ? 'store-row--best' : ''] }, storeList);
      const nameEl = span({ className: 'store-row__name' }, row);
      span({ className: 'store-row__dot' }, nameEl);
      nameEl.appendChild(document.createTextNode(p.store_name + (p.in_stock ? '' : ' (agotado)')));
      span({ className: 'store-row__price' }, row, formatPrice(p.price, p.currency));
    });
  }

  const nutritionSection = div(
    { style: { borderTop: '1px solid var(--border)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' } },
    card
  );
  Badge({ text: '🥗 Información nutricional', variant: 'neutral', parent: nutritionSection });
  const nutritionBody = div({ style: { marginTop: 'var(--space-3)' } }, nutritionSection);

  if (nutritionFacts.length === 0) {
    span(
      { style: { color: 'var(--text-subtle)', fontSize: 'var(--fs-caption)' } },
      nutritionBody,
      'Sin información nutricional registrada todavía.'
    );
  } else {
    nutritionFacts.forEach((facts) => NutritionBlock({ facts, parent: nutritionBody }));
  }

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
