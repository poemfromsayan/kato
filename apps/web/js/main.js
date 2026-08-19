/**
 * main.js — Punto de entrada de la SPA.
 *
 * Monta el layout persistente (sidebar + topbar + contenedor de pantalla +
 * bottom nav) una sola vez, y le entrega al router solo el contenedor
 * central para que renderice cada pantalla ahí — así el chrome nunca se
 * desmonta al navegar (ver lib/router.js).
 *
 * Sidebar vs. topbar+bottom-nav: los tres se renderizan siempre (mismo
 * costo que antes) y es el CSS (ver components.css, breakpoint 1024px)
 * el que decide cuál se ve — sidebar reemplaza a los otros dos en
 * pantallas grandes. sidebarSlot va PRIMERO en el DOM porque en el
 * layout de escritorio app-shell es una fila (flex-direction: row) y
 * necesita quedar a la izquierda.
 */

import { div, h2, p } from './html.js';
import { BottomNav, Sidebar, Topbar } from './components/index.js';
import { clearSession, getUser, isAuthenticated } from './lib/auth.js';
import { initRouter, navigate } from './lib/router.js';
import { initTheme, toggleTheme } from './lib/theme.js';
import { renderComparadorScreen } from './screens/comparador.js';
import { renderDashboardScreen } from './screens/dashboard.js';
import { renderEscanearScreen } from './screens/escanear.js';
import { renderLoginScreen } from './screens/login.js';
import { renderPerfilScreen } from './screens/perfil.js';
import { renderRevisionEscaneosScreen } from './screens/revisionEscaneos.js';
import { renderSubirPlanScreen } from './screens/subirPlan.js';

initTheme();

const appRoot = document.getElementById('app');
const shell = div({ className: 'app-shell' }, appRoot);
const sidebarSlot = div({}, shell);
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
  { path: '/escanear', render: renderEscanearScreen, protected: true },
  { path: '/subir-plan', render: renderSubirPlanScreen, protected: true },
  { path: '/perfil', render: renderPerfilScreen, protected: true },
  { path: '/admin/escaneos', render: renderRevisionEscaneosScreen, protected: true },
  { path: '*', render: renderNotFound, protected: false },
];

function handleLogout() {
  clearSession();
  navigate('/login');
}

function renderChrome(route, pathname) {
  sidebarSlot.innerHTML = '';
  topbarSlot.innerHTML = '';
  bottomNavSlot.innerHTML = '';

  // La pantalla de login es a página completa, sin chrome de la app.
  if (pathname.startsWith('/login')) return;

  const authenticated = isAuthenticated();
  const isAdmin = Boolean(getUser()?.is_admin);

  Sidebar({
    currentPath: pathname,
    authenticated,
    isAdmin,
    onToggleTheme: toggleTheme,
    onLogout: handleLogout,
    parent: sidebarSlot,
  });

  Topbar({
    authenticated,
    isAdmin,
    onToggleTheme: toggleTheme,
    onLogout: handleLogout,
    parent: topbarSlot,
  });

  BottomNav({ currentPath: pathname, parent: bottomNavSlot });
}

initRouter({ routes, container: mainSlot, onNavigate: renderChrome });

// Si cualquier llamada a la API devuelve 401 (token vencido/ inválido),
// apiClient.js ya limpió la sesión — acá solo redirigimos.
window.addEventListener('katofit:unauthorized', () => navigate('/login'));
