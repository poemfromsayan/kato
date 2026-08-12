/**
 * lib/router.js — Router SPA minimalista, sin dependencias.
 *
 * Qué hace: intercepta clics en enlaces internos y el botón atrás/adelante
 * del navegador, y en vez de dejar que el navegador recargue la página,
 * llama a `render()` de la ruta que corresponda dentro del mismo DOM. Usa
 * la History API (pushState) para que la URL sea real y compartible — no
 * es routing por "#hash".
 *
 * Qué NO hace (a propósito, no lo necesitamos todavía): rutas con
 * parámetros dinámicos (`/productos/:id`), rutas anidadas, transiciones
 * animadas. Se puede agregar después si hace falta.
 */

import { isAuthenticated } from './auth.js';

let routes = [];
let container = null;
let onNavigate = () => {};

function matchRoute(pathname) {
  return routes.find((r) => r.path === pathname) ?? routes.find((r) => r.path === '*') ?? null;
}

function renderCurrentPath() {
  const pathname = window.location.pathname;
  const route = matchRoute(pathname);

  if (!route) return;

  if (route.protected && !isAuthenticated()) {
    // No autenticado intentando entrar a una ruta protegida: lo mandamos a
    // login, pero recordamos a dónde quería ir para regresarlo después.
    navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true });
    return;
  }

  container.innerHTML = '';
  route.render(container);
  onNavigate(route, pathname);
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  renderCurrentPath();
}

export function initRouter({ routes: routeTable, container: containerEl, onNavigate: onNavigateCb }) {
  routes = routeTable;
  container = containerEl;
  if (onNavigateCb) onNavigate = onNavigateCb;

  // Intercepta clics en cualquier <a href="/..."> interno para hacer
  // navegación SPA en vez de recarga completa. Respeta clics con
  // modificadores (abrir en pestaña nueva, etc.) y enlaces externos.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const isModified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    const isInternal = link.href.startsWith(window.location.origin);
    const isSelfTarget = !link.target || link.target === '_self';

    if (isModified || !isInternal || !isSelfTarget) return;

    event.preventDefault();
    navigate(link.pathname + link.search);
  });

  window.addEventListener('popstate', renderCurrentPath);

  renderCurrentPath();
}
