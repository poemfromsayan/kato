/**
 * lib/theme.js — Claro/oscuro. El acento quedó fijo en "lima" (ver
 * css/tokens.css), así que a diferencia del sistema de diseño, acá no hay
 * selector de acento — solo el tema.
 */

const STORAGE_KEY = 'katofit_theme';
const root = document.documentElement;

function prefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const theme = saved || (prefersDark() ? 'dark' : 'light');
  root.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEY, next);
}
