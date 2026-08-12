/**
 * screens/dashboard.js — Pantalla de inicio: saludo, accesos rápidos, y los
 * planes nutricionales que el usuario ya subió.
 */

import { a, div, h1, p, span } from '../html.js';
import { Alert, Button, EmptyState, PlanSummaryCard, Spinner } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';
import { getUser } from '../lib/auth.js';

function formatPriceRange(min, max) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `₡${min}–₡${max} (estimado)`;
  return `₡${min ?? max} (estimado)`;
}

async function togglePlanDetail(planId, detailSlot) {
  if (detailSlot.dataset.open === 'true') {
    detailSlot.innerHTML = '';
    detailSlot.dataset.open = 'false';
    return;
  }

  detailSlot.innerHTML = '';
  detailSlot.dataset.open = 'true';
  Spinner({ parent: detailSlot });

  try {
    const { plan } = await api.get(`/nutrition-plans/${planId}`);
    detailSlot.innerHTML = '';

    if (plan.items.length === 0) {
      p({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)' } }, detailSlot, 'No se extrajo ningún alimento de este plan.');
      return;
    }

    plan.items.forEach((item) => {
      const row = div({ className: 'plan-item-row' }, detailSlot);
      span({ className: 'plan-item-row__name' }, row, item.food_name);
      const metaParts = [
        item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}` : null,
        item.frequency,
        formatPriceRange(item.price_range_min, item.price_range_max),
      ].filter(Boolean);
      span({ className: 'plan-item-row__meta' }, row, metaParts.join(' · ') || '—');
    });
  } catch (err) {
    detailSlot.innerHTML = '';
    const message = err instanceof ApiError ? err.message : 'No se pudo cargar el detalle del plan';
    Alert({ variant: 'error', title: 'Error', text: message, parent: detailSlot });
  }
}

export function renderDashboardScreen(container) {
  const user = getUser();
  const screen = div({}, container);

  h1({ className: 'screen-title' }, screen, `Hola, ${user?.display_name || user?.email?.split('@')[0] || ''} 👋`);
  p({ className: 'screen-subtitle' }, screen, 'Esto es lo que tenés en Katö hasta ahora.');

  const quickActions = div({ style: { display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' } }, screen);
  const compararLink = a({ href: '/comparador', style: { flex: 1 } }, quickActions);
  Button({ label: '🔍 Comparar precios', variant: 'secondary', block: true, parent: compararLink });
  const subirLink = a({ href: '/subir-plan', style: { flex: 1 } }, quickActions);
  Button({ label: '📄 Subir plan', variant: 'secondary', block: true, parent: subirLink });

  const listSlot = div({}, screen);
  Spinner({ parent: listSlot });

  api
    .get('/nutrition-plans')
    .then(({ plans }) => {
      listSlot.innerHTML = '';

      if (plans.length === 0) {
        const action = a({ href: '/subir-plan' });
        Button({ label: 'Subir mi primer plan', variant: 'primary', parent: action });
        EmptyState({
          icon: '📋',
          title: 'Todavía no subiste un plan nutricional',
          text: 'Subí el PDF de tu plan y Katö lo convierte en una lista de compras.',
          action,
          parent: listSlot,
        });
        return;
      }

      plans.forEach((plan) => {
        const detailSlot = div({ style: { padding: '0 var(--space-2)' } });
        PlanSummaryCard({
          plan,
          onClick: () => togglePlanDetail(plan.id, detailSlot),
          parent: listSlot,
        });
        listSlot.appendChild(detailSlot);
      });
    })
    .catch((err) => {
      listSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar tus planes';
      Alert({ variant: 'error', title: 'Error', text: message, parent: listSlot });
    });
}
