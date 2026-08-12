import { div, p, span, strong } from '../html.js';

export function Badge({ text, variant = 'neutral', parent = null }) {
  return span({ className: ['badge', `badge--${variant}`] }, parent, text);
}

export function Alert({ variant = 'info', title, text = null, parent = null }) {
  const box = div({ className: ['alert', `alert--${variant}`] }, parent);
  const content = div({}, box);
  strong({}, content, title);
  if (text) p({ style: { margin: '2px 0 0', color: 'inherit', opacity: 0.85 } }, content, text);
  return box;
}

export function Spinner({ parent = null }) {
  return div({ className: 'spinner', role: 'status', 'aria-label': 'Cargando' }, parent);
}

export function EmptyState({ icon = '🗒️', title, text = null, action = null, parent = null }) {
  const box = div({ className: 'empty-state' }, parent);
  div({ className: 'empty-state__icon' }, box, icon);
  div({ className: 'empty-state__title' }, box, title);
  if (text) p({}, box, text);
  if (action) box.appendChild(action);
  return box;
}
