/**
 * theme.js — Control de tema (claro/oscuro) y acento de color.
 * Persiste la preferencia del usuario en localStorage bajo el
 * namespace "kato-ds" para no chocar con otras apps del dominio.
 */

import { button, span } from './html.js';
import { ACCENTS } from './data.js';

const STORAGE_KEY = 'kato-ds-theme';
const root = document.documentElement;

function getSavedTheme() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage no disponible (modo privado, etc.): la app sigue funcionando sin persistencia */
  }
}

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function initTheme() {
  const saved = getSavedTheme();
  const theme = saved.theme || (prefersDark() ? 'dark' : 'light');
  const accent = saved.accent || 'lima';
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent);
  return { theme, accent };
}

export function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  save({ ...getSavedTheme(), theme });
}

export function setAccent(accent) {
  root.setAttribute('data-accent', accent);
  save({ ...getSavedTheme(), accent });
}

export function ThemeToggle({ parent = null }) {
  const btn = button({ className: 'ds-theme-toggle', type: 'button' }, parent);

  const render = () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    btn.innerHTML = '';
    span({}, btn, isDark ? '☀️' : '🌙');
    span({}, btn, isDark ? 'Claro' : 'Oscuro');
  };

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    render();
  });

  render();
  return btn;
}

export function AccentPicker({ parent = null }) {
  const wrap = span({ className: 'ds-accent-picker', role: 'group', 'aria-label': 'Elegir color de acento' }, parent);

  const render = () => {
    wrap.innerHTML = '';
    const current = root.getAttribute('data-accent');
    ACCENTS.forEach((accent) => {
      const swatch = button(
        {
          className: 'ds-accent-swatch',
          type: 'button',
          'aria-label': accent.label,
          'aria-pressed': String(accent.id === current),
          style: { background: `var(--accent-500)` },
          onClick: () => {
            setAccent(accent.id);
            render();
          },
        },
        wrap
      );
      // Cada swatch debe mostrar SU propio color, no el actual: lo resolvemos
      // pintando temporalmente con el token correspondiente vía data-accent local.
      swatch.style.background = accentPreviewColor(accent.id);
    });
  };

  render();
  return wrap;
}

// Colores fijos solo para pintar los círculos del selector (no dependen del tema activo)
function accentPreviewColor(id) {
  const map = {
    lima: '#c4f82a',
    coral: '#ff5a5f',
    azul: '#3d5aff',
    violeta: '#8b5cf6',
  };
  return map[id] || '#c4f82a';
}
