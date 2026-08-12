/**
 * components.js — Componentes de UI de Katö construidos con html.js.
 * Cada función es una fábrica pura: recibe datos/props y devuelve un
 * nodo del DOM, sin montarlo (parent = null) salvo que se indique.
 */

import { div, span, button, input, select, option, label, p, strong } from './html.js';

// ───────────────────────── Botones ─────────────────────────

export function Button({ label: text, variant = 'primary', size = 'md', disabled = false, onClick = null, parent = null }) {
  return button(
    {
      className: ['btn', `btn--${variant}`, `btn--${size}`],
      disabled,
      onClick: disabled ? null : onClick,
      type: 'button',
    },
    parent,
    text
  );
}

export function IconButton({ icon, ariaLabel, onClick = null, parent = null }) {
  return button(
    {
      className: ['btn', 'btn--icon'],
      'aria-label': ariaLabel,
      onClick,
      type: 'button',
    },
    parent,
    icon
  );
}

// ───────────────────────── Formularios ─────────────────────────

export function Field({ labelText, control, parent = null }) {
  const wrap = div({ className: 'field' }, parent);
  if (labelText) label({ className: 'field__label' }, wrap, labelText);
  wrap.appendChild(control);
  return wrap;
}

export function TextInput({ placeholder = '', icon = null, type = 'text', parent = null }) {
  if (icon) {
    const group = div({ className: 'input-group' }, parent);
    span({ className: 'input-group__icon' }, group, icon);
    input({ className: 'input', type, placeholder }, group);
    return group;
  }
  return input({ className: 'input', type, placeholder }, parent);
}

export function Select({ options = [], parent = null }) {
  const sel = select({ className: 'select' }, parent);
  options.forEach((opt) => option({ value: opt.value ?? opt }, sel, opt.label ?? opt));
  return sel;
}

export function CheckRow({ text, type = 'checkbox', name = null, checked = false, parent = null }) {
  const row = label({ className: 'check-row' }, parent);
  input({ type, name, checked }, row);
  span({}, row, text);
  return row;
}

export function Switch({ checked = false, onChange = null, parent = null }) {
  const wrap = label({ className: 'switch' }, parent);
  input({ type: 'checkbox', checked, onChange }, wrap);
  span({ className: 'switch__track' }, wrap);
  return wrap;
}

// ───────────────────────── Badges ─────────────────────────

export function Badge({ text, variant = 'neutral', parent = null }) {
  return span({ className: ['badge', `badge--${variant}`] }, parent, text);
}

// ───────────────────────── Alertas ─────────────────────────

export function Alert({ variant = 'info', title, text, parent = null }) {
  const box = div({ className: ['alert', `alert--${variant}`] }, parent);
  const content = div({}, box);
  strong({}, content, title);
  p({ style: { margin: '2px 0 0', color: 'inherit', opacity: 0.85 } }, content, text);
  return box;
}

// ───────────────────────── Product / comparación de precios ─────────────────────────

export function ProductCard({ name, sub, icon, stores, parent = null }) {
  const card = div({ className: 'card product-card' }, parent);

  const top = div({ className: 'product-card__top' }, card);
  div({ className: 'product-card__thumb' }, top, icon);
  const meta = div({}, top);
  div({ className: 'product-card__title' }, meta, name);
  span({ className: 'product-card__sub' }, meta, sub);

  const storeList = div({ className: 'product-card__stores' }, card);
  const cheapest = Math.min(...stores.map((s) => s.best ? 0 : 1));
  stores.forEach((store) => {
    const row = div({ className: ['store-row', store.best ? 'store-row--best' : ''] }, storeList);
    const nameEl = span({ className: 'store-row__name' }, row);
    span({ className: 'store-row__dot', style: { background: store.dot } }, nameEl);
    nameEl.appendChild(document.createTextNode(store.name));
    span({ className: 'store-row__price' }, row, store.price);
  });

  return card;
}

// ───────────────────────── Nutrición: macros ─────────────────────────

export function NutritionCard({ title = 'Macros de hoy', macros, parent = null }) {
  const card = div({ className: 'card' }, parent);
  const head = div({ className: 'nutrition-card__title' }, card);
  strong({}, head, title);
  span({ className: 'badge badge--accent' }, head, '1,840 kcal');

  macros.forEach((m) => {
    const row = div({ className: 'macro-row' }, card);
    span({ className: 'macro-row__label' }, row, m.label);
    const bar = div({ className: 'macro-bar' }, row);
    div({ className: 'macro-bar__fill', style: { width: `${m.pct}%`, background: m.color } }, bar);
    span({ className: 'macro-row__value' }, row, m.value);
  });

  return card;
}

// ───────────────────────── Navegación inferior ─────────────────────────

export function BottomNav({ items, parent = null }) {
  const nav = div({ className: 'bottom-nav' }, parent);
  items.forEach((item) => {
    const btn = button(
      { className: ['bottom-nav__item', item.active ? 'bottom-nav__item--active' : ''], type: 'button' },
      nav
    );
    span({}, btn, item.icon);
    span({}, btn, item.label);
  });
  return nav;
}

// ───────────────────────── Modal ─────────────────────────

export function Modal({ title, bodyBuilder, parent = null }) {
  const backdrop = div({ className: 'modal-backdrop' }, parent);
  const modal = div({ className: 'modal' }, backdrop);

  const head = div({ className: 'modal__head' }, modal);
  strong({ style: { fontSize: 'var(--fs-h4)' } }, head, title);
  IconButton({ icon: '✕', ariaLabel: 'Cerrar', onClick: () => backdrop.classList.remove('is-open'), parent: head });

  if (bodyBuilder) bodyBuilder(modal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.classList.remove('is-open');
  });

  return backdrop;
}
