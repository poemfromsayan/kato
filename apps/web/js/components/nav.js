import { a, div, span } from '../html.js';
import { IconButton } from './buttons.js';

export const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Inicio' },
  { path: '/comparador', icon: '🔍', label: 'Comparar' },
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

export function Topbar({ authenticated, onToggleTheme, onLogout, parent = null }) {
  const bar = div({ className: 'app-topbar' }, parent);

  const logo = div({ className: 'app-logo' }, bar);
  span({ className: 'app-logo__mark' }, logo, 'K');
  logo.appendChild(document.createTextNode('Katö'));

  const controls = div({ style: { display: 'flex', gap: 'var(--space-2)' } }, bar);
  IconButton({ icon: '🌙', ariaLabel: 'Cambiar tema', onClick: onToggleTheme, parent: controls });
  if (authenticated) {
    IconButton({ icon: '🚪', ariaLabel: 'Cerrar sesión', onClick: onLogout, parent: controls });
  }

  return bar;
}
