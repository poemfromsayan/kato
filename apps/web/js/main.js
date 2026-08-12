/**
 * main.js — Punto de entrada de la SPA.
 *
 * Monta el layout persistente (topbar + contenedor de pantalla + bottom
 * nav) una sola vez, y le entrega al router solo el contenedor central
 * para que renderice cada pantalla ahí — así topbar/bottom-nav nunca se
 * desmontan al navegar (ver lib/router.js).
 */

import { div, h2, p } from './html.js';
import { BottomNav, Topbar } from './components/index.js';
import { clearSession, isAuthenticated } from './lib/auth.js';
import { initRouter, navigate } from './lib/router.js';
import { initTheme, toggleTheme } from './lib/theme.js';
import { renderComparadorScreen } from './screens/comparador.js';
import { renderDashboardScreen } from './screens/dashboard.js';
import { renderLoginScreen } from './screens/login.js';
import { renderPerfilScreen } from './screens/perfil.js';
import { renderSubirPlanScreen } from './screens/subirPlan.js';

initTheme();

const appRoot = document.getElementById('app');
const shell = div({ className: 'app-shell' }, appRoot);
const topbarSlot = div({}, shell);
const mainSlot = div({ className: 'app-main' }, shell);
const bottomNavSlot = div({}, shell);

function renderNotFound(container) {
  const wrap = div({ style: { textAlign: 'center', padding: 'var(--space-16) var(--space-4)' } }, container);
  h2({}, wrap, 'Página no encontrada');
  p({}, wrap, 'La ruta que buscás no existe.');
}

const routes = [
  { path: '/login', render: renderLoginScreen, protected: false },
  { path: '/', render: renderDashboardScreen, protected: true },
  { path: '/comparador', render: renderComparadorScreen, protected: true },
  { path: '/subir-plan', render: renderSubirPlanScreen, protected: true },
  { path: '/perfil', render: renderPerfilScreen, protected: true },
  { path: '*', render: renderNotFound, protected: false },
];

function renderChrome(route, pathname) {
  topbarSlot.innerHTML = '';
  bottomNavSlot.innerHTML = '';

  // La pantalla de login es a página completa, sin chrome de la app.
  if (pathname.startsWith('/login')) return;

  Topbar({
    authenticated: isAuthenticated(),
    onToggleTheme: toggleTheme,
    onLogout: () => {
      clearSession();
      navigate('/login');
    },
    parent: topbarSlot,
  });

  BottomNav({ currentPath: pathname, parent: bottomNavSlot });
}

initRouter({ routes, container: mainSlot, onNavigate: renderChrome });

// Si cualquier llamada a la API devuelve 401 (token vencido/ inválido),
// apiClient.js ya limpió la sesión — acá solo redirigimos.
window.addEventListener('katofit:unauthorized', () => navigate('/login'));
