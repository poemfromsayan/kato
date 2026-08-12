import { div, input, label, option, select, span } from '../html.js';

/**
 * Envuelve un control con su label y (opcionalmente) un mensaje de error.
 * Devuelve el wrapper, no el control — para leer/escribir el valor, guarda
 * una referencia al control antes de pasarlo aquí.
 */
export function Field({ labelText, control, errorText = null, parent = null }) {
  const wrap = div({ className: 'field' }, parent);
  if (labelText) label({ className: 'field__label' }, wrap, labelText);
  wrap.appendChild(control);
  if (errorText) span({ className: 'field__error' }, wrap, errorText);
  return wrap;
}

export function TextInput({ type = 'text', placeholder = '', icon = null, value = '', required = false, autocomplete = null, parent = null }) {
  const attrs = { className: 'input', type, placeholder, value, required };
  if (autocomplete) attrs.autocomplete = autocomplete;

  if (icon) {
    const group = div({ className: 'input-group' }, parent);
    span({ className: 'input-group__icon' }, group, icon);
    return input(attrs, group);
  }
  return input(attrs, parent);
}

export function Select({ options = [], value = null, parent = null }) {
  const sel = select({ className: 'select' }, parent);
  options.forEach((opt) => {
    const optValue = typeof opt === 'string' ? opt : opt.value;
    const optLabel = typeof opt === 'string' ? opt : opt.label;
    const el = option({ value: optValue }, sel, optLabel);
    if (value !== null && optValue === value) el.selected = true;
  });
  return sel;
}
