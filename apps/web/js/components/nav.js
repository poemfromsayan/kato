import { a, div, span } from '../html.js';
import { IconButton } from './buttons.js';

export const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Inicio' },
  { path: '/comparador', icon: '🔍', label: 'Comparar' },
  { path: '/escanear', icon: '📷', label: 'Escanear' },
  { path: '/subir-plan', icon: '📄', label: 'Plan' },
  { path: '/perfil', icon: '👤', label: 'Perfil' },
];

/**
 * Usa <a href> reales (no botones con onClick) para que el listener global
 * de clics del router (lib/router.js) los intercepte automáticamente —
 * así este componente no necesita conocer al router.
 */
export function BottomNav({ currentPath, parent = null }) {
  const nav = div({ className: 'bottom-nav' }, parent);

  NAV_ITEMS.forEach((item) => {
    const isActive = item.path === currentPath;
    const link = a(
      { href: item.path, className: ['bottom-nav__item', isActive ? 'bottom-nav__item--active' : ''] },
      nav
    );
    span({}, link, item.icon);
    span({}, link, item.label);
  });

  return nav;
}

/**
 * Nav de escritorio (≥1024px, ver components.css). Mismos NAV_ITEMS que
 * BottomNav (misma lista, así que ambos quedan sincronizados sin
 * duplicar la fuente de verdad), pero además incluye el link de admin
 * porque en desktop el sidebar REEMPLAZA a la topbar entera (ahí es
 * donde vivía el ícono de admin en mobile) — ver components.css y
 * main.js#renderChrome.
 */
export function Sidebar({ currentPath, authenticated, isAdmin = false, onToggleTheme, onLogout, parent = null }) {
  const bar = div({ className: 'sidebar' }, parent);

  const logo = div({ className: 'app-logo' }, bar);
  span({ className: 'app-logo__mark' }, logo, 'K');
  logo.appendChild(document.createTextNode('Katö'));

  const nav = div({ className: 'sidebar__nav' }, bar);

  NAV_ITEMS.forEach((item) => {
    const isActive = item.path === currentPath;
    const link = a(
      { href: item.path, className: ['sidebar__item', isActive ? 'sidebar__item--active' : ''] },
      nav
    );
    span({ className: 'sidebar__item-icon' }, link, item.icon);
    span({}, link, item.label);
  });

  if (authenticated && isAdmin) {
    const isActive = currentPath === '/admin/escaneos';
    const link = a(
      { href: '/admin/escaneos', className: ['sidebar__item', isActive ? 'sidebar__item--active' : ''] },
      nav
    );
    span({ className: 'sidebar__item-icon' }, link, '🗂️');
    span({}, link, 'Revisión');
  }

  const footer = div({ className: 'sidebar__footer' }, bar);
  IconButton({ icon: '🌙', ariaLabel: 'Cambiar tema', onClick: onToggleTheme, parent: footer });
  if (authenticated) {
    IconButton({ icon: '🚪', ariaLabel: 'Cerrar sesión', onClick: onLogout, parent: footer });
  }

  return bar;
}

export function Topbar({ authenticated, isAdmin = false, onToggleTheme, onLogout, parent = null }) {
  const bar = div({ className: 'app-topbar' }, parent);

  const logo = div({ className: 'app-logo' }, bar);
  span({ className: 'app-logo__mark' }, logo, 'K');
  logo.appendChild(document.createTextNode('Katö'));

  const controls = div({ style: { display: 'flex', gap: 'var(--space-2)' } }, bar);
  if (authenticated && isAdmin) {
    // <a> real (no botón con onClick) para que el listener global del
    // router la intercepte, igual que en BottomNav.
    a(
      { href: '/admin/escaneos', className: ['btn', 'btn--icon'], 'aria-label': 'Revisión de escaneos' },
      controls,
      '🗂️'
    );
  }
  IconButton({ icon: '🌙', ariaLabel: 'Cambiar tema', onClick: onToggleTheme, parent: controls });
  if (authenticated) {
    IconButton({ icon: '🚪', ariaLabel: 'Cerrar sesión', onClick: onLogout, parent: controls });
  }

  return bar;
}
