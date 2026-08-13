/**
 * screens/dashboard.js — Pantalla de inicio.
 *
 * Rediseño (2026-08): antes esta pantalla repetía cosas que ya están a un
 * tap de distancia en la barra de navegación (botones a /comparador y
 * /subir-plan) y duplicaba la lista de ingredientes que ya se ve al subir
 * un plan (screens/subirPlan.js). Ahora el Inicio es el HUB de la única
 * pieza que no vive en ningún otro lado todavía: tu plan más reciente y la
 * lista de compras generada a partir de él (dónde comprar cada cosa y a
 * qué precio) — ver modules/shopping-lists en el backend.
 */

import { a, div, h1, h2, p, span } from '../html.js';
import { Alert, Badge, Button, EmptyState, ShoppingListView, Spinner } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';
import { getUser } from '../lib/auth.js';

const currencyFormatter = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

const STATUS_LABEL = { parsed: 'Procesado', processing: 'Procesando', uploaded: 'Subido', failed: 'Falló' };
const STATUS_VARIANT = { parsed: 'success', processing: 'accent', uploaded: 'neutral', failed: 'error' };

function subheading(text, parent) {
  return h2(
    {
      style: {
        fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 var(--space-3)',
      },
    },
    parent,
    text
  );
}

/**
 * `resultSlot` es un div SIN className 'card' a propósito: adentro puede ir
 * o bien un botón suelto (todavía no hay lista) o bien ShoppingListView, que
 * ya trae su propia `.card` — si resultSlot también fuera `.card` se vería
 * una caja dentro de otra caja.
 */
function renderGenerateAction({ plan, resultSlot, label = 'Generar lista de compras' }) {
  resultSlot.innerHTML = '';
  const btn = Button({ label, variant: 'primary', block: true, parent: resultSlot });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Generando…';

    try {
      const { shoppingList } = await api.post(`/nutrition-plans/${plan.id}/shopping-list`);
      renderShoppingList({ plan, shoppingList, resultSlot });
    } catch (err) {
      resultSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo generar la lista de compras';
      Alert({ variant: 'error', title: 'No se pudo generar la lista', text: message, parent: resultSlot });
      const retryBtn = Button({ label: 'Reintentar', variant: 'secondary', size: 'sm', parent: resultSlot });
      retryBtn.style.marginTop = 'var(--space-3)';
      retryBtn.addEventListener('click', () => renderGenerateAction({ plan, resultSlot, label }));
    }
  });
}

function renderShoppingList({ plan, shoppingList, resultSlot }) {
  resultSlot.innerHTML = '';
  ShoppingListView({ shoppingList, parent: resultSlot });
  const regenerateBtn = Button({ label: 'Regenerar lista', variant: 'secondary', size: 'sm', parent: resultSlot });
  regenerateBtn.addEventListener('click', () => renderGenerateAction({ plan, resultSlot, label: 'Regenerar lista' }));
}

function renderHistory(shoppingLists, excludeListId, parent) {
  const past = shoppingLists.filter((l) => l.id !== excludeListId);
  if (past.length === 0) return;

  const section = div({ style: { marginTop: 'var(--space-6)' } }, parent);
  subheading('Listas anteriores', section);

  past.forEach((l) => {
    const row = div({ className: 'plan-item-row' }, section);
    span(
      { className: 'plan-item-row__name' },
      row,
      `${l.plan_filename} · ${new Date(l.generated_at).toLocaleDateString('es-CR')}`
    );
    span(
      { className: 'plan-item-row__meta' },
      row,
      `${l.item_count} item${l.item_count === 1 ? '' : 's'} · ${currencyFormatter.format(l.total_estimate)}`
    );
  });
}

export function renderDashboardScreen(container) {
  const user = getUser();
  const screen = div({}, container);

  h1({ className: 'screen-title' }, screen, `Hola, ${user?.display_name || user?.email?.split('@')[0] || ''} 👋`);
  p({ className: 'screen-subtitle' }, screen, 'Tu plan y tu lista de compras, en un solo lugar.');

  const contentSlot = div({}, screen);
  Spinner({ parent: contentSlot });

  Promise.all([api.get('/nutrition-plans'), api.get('/shopping-lists')])
    .then(([{ plans }, { shoppingLists }]) => {
      contentSlot.innerHTML = '';

      if (plans.length === 0) {
        const action = a({ href: '/subir-plan' });
        Button({ label: 'Subir mi primer plan', variant: 'primary', parent: action });
        EmptyState({
          icon: '📋',
          title: 'Todavía no subiste un plan nutricional',
          text: 'Subí el PDF de tu plan y Katö te arma la lista de dónde comprar cada alimento más barato.',
          action,
          parent: contentSlot,
        });
        return;
      }

      // plans ya viene ordenado por uploaded_at DESC (ver repository.js)
      const [latestPlan, ...olderPlans] = plans;
      const listSummary = shoppingLists.find((l) => l.plan_id === latestPlan.id);

      const planCard = div({ className: 'card' }, contentSlot);
      const planHeader = div(
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' } },
        planCard
      );
      const planMeta = div({}, planHeader);
      div({ style: { fontWeight: 'var(--fw-bold)' } }, planMeta, latestPlan.filename);
      span(
        { style: { fontSize: 'var(--fs-micro)', color: 'var(--text-subtle)' } },
        planMeta,
        `${latestPlan.item_count} alimento${latestPlan.item_count === 1 ? '' : 's'} · subido el ${new Date(latestPlan.uploaded_at).toLocaleDateString('es-CR')}`
      );
      Badge({ text: STATUS_LABEL[latestPlan.status] ?? latestPlan.status, variant: STATUS_VARIANT[latestPlan.status] ?? 'neutral', parent: planHeader });

      if (latestPlan.status === 'failed') {
        p({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', margin: 'var(--space-3) 0 0' } }, planCard, 'No pudimos procesar este plan. Probá subiéndolo de nuevo.');
      } else if (latestPlan.status !== 'parsed') {
        p({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', margin: 'var(--space-3) 0 0' } }, planCard, 'Todavía se está procesando — volvé en un momento.');
      }

      // El resultado (botón de generar, o la lista ya generada) vive
      // SIEMPRE fuera de planCard, como su propia sección — ver el
      // comentario en renderGenerateAction sobre por qué no anidar cards.
      if (latestPlan.status === 'parsed') {
        const resultSlot = div({}, contentSlot);

        if (listSummary) {
          Spinner({ parent: resultSlot });
          api
            .get(`/shopping-lists/${listSummary.id}`)
            .then(({ shoppingList }) => renderShoppingList({ plan: latestPlan, shoppingList, resultSlot }))
            .catch(() => renderGenerateAction({ plan: latestPlan, resultSlot }));
        } else {
          renderGenerateAction({ plan: latestPlan, resultSlot });
        }
      }

      if (olderPlans.length > 0) {
        const section = div({ style: { marginTop: 'var(--space-6)' } }, contentSlot);
        subheading('Otros planes que subiste', section);
        olderPlans.forEach((plan) => {
          const row = div({ className: 'plan-item-row' }, section);
          span({ className: 'plan-item-row__name' }, row, plan.filename);
          const meta = span({ className: 'plan-item-row__meta' }, row);
          meta.textContent = `${plan.item_count} alimento${plan.item_count === 1 ? '' : 's'} · ${new Date(plan.uploaded_at).toLocaleDateString('es-CR')}`;
        });
      }

      renderHistory(shoppingLists, listSummary?.id, contentSlot);
    })
    .catch((err) => {
      contentSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo cargar tu información';
      Alert({ variant: 'error', title: 'Error', text: message, parent: contentSlot });
    });
}
