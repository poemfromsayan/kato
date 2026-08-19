/**
 * screens/revisionEscaneos.js — Cola de revisión de escaneos (solo admin).
 *
 * Cada fila es un envío de product_scans en estado 'pending': lo que un
 * usuario fotografió + lo que Claude vision extrajo (ver
 * services/ai/extractProductScan.js). Nada de esto es un hecho verificado
 * todavía — por eso el admin puede corregir cualquier campo antes de
 * aprobar, y solo al aprobar se escribe en products/nutrition_facts (ver
 * modules/product-scans/repository.js#approveScan).
 *
 * Gate de acceso: is_admin viaja en el usuario de la sesión (ver
 * lib/auth.js) — es una comodidad de UI nada más, la autorización real la
 * hace requireAdmin en el backend (ver middleware/auth.js).
 */

import { div, h1, img, p, span } from '../html.js';
import { Alert, Badge, Button, EmptyState, Field, Select, Spinner, TextInput } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';
import { getUser } from '../lib/auth.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
];

const STATUS_BADGE = { pending: 'warning', approved: 'success', rejected: 'error' };
const STATUS_LABEL = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

function numOrNull(rawValue) {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(rawValue) {
  const trimmed = String(rawValue ?? '').trim();
  return trimmed || null;
}

function formatDate(value) {
  return new Date(value).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Trae una imagen autenticada (ver apiClient.js#getBlob) y la mete en un
 * <img>. Si falla (ej. el escaneo no tiene foto de tabla nutricional), oculta
 * el bloque en vez de mostrar un ícono de imagen rota.
 */
function loadScanImage({ scanId, type, imgEl, wrapEl }) {
  api
    .getBlob(`/product-scans/${scanId}/image/${type}`)
    .then((blob) => {
      imgEl.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      wrapEl.style.display = 'none';
    });
}

function ScanReviewCard({ scan, categories, onResolved, parent }) {
  const card = div({ className: 'card', style: { marginBottom: 'var(--space-4)' } }, parent);

  const top = div({ style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' } }, card);
  const meta = div({}, top);
  div({ className: 'product-card__title' }, meta, scan.extracted_product_name || 'Producto sin nombre legible');
  span(
    { className: 'product-card__sub' },
    meta,
    `${scan.submitted_by_email} · ${formatDate(scan.created_at)}`
  );
  Badge({ text: STATUS_LABEL[scan.status] ?? scan.status, variant: STATUS_BADGE[scan.status] ?? 'neutral', parent: top });

  if (scan.matched_product_name) {
    p(
      { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', marginTop: 'var(--space-2)' } },
      card,
      `Posible coincidencia: "${scan.matched_product_name}" — si se aprueba, se completa ese producto en vez de crear uno nuevo.`
    );
  }

  const imagesRow = div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' } }, card);

  const packageWrap = div({ className: 'scan-slot scan-slot--filled', style: { cursor: 'default' } }, imagesRow);
  const packageImg = img({ className: 'scan-slot__preview', alt: 'Foto del empaque' }, packageWrap);
  loadScanImage({ scanId: scan.id, type: 'package', imgEl: packageImg, wrapEl: packageWrap });

  if (scan.nutrition_image_path) {
    const nutritionWrap = div({ className: 'scan-slot scan-slot--filled', style: { cursor: 'default' } }, imagesRow);
    const nutritionImg = img({ className: 'scan-slot__preview', alt: 'Foto de la tabla nutricional' }, nutritionWrap);
    loadScanImage({ scanId: scan.id, type: 'nutrition', imgEl: nutritionImg, wrapEl: nutritionWrap });
  }

  const actionSlot = div({ style: { marginTop: 'var(--space-4)' } }, card);
  const alertSlot = div({}, card);

  if (scan.status !== 'pending') {
    if (scan.status === 'rejected' && scan.rejection_reason) {
      p({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', marginTop: 'var(--space-3)' } }, card, `Motivo: ${scan.rejection_reason}`);
    }
    return card;
  }

  let formOpen = false;
  const toggleBtn = Button({ label: 'Revisar', variant: 'primary', block: true, parent: actionSlot });
  const formSlot = div({ style: { display: 'none', marginTop: 'var(--space-4)' } }, actionSlot);

  toggleBtn.addEventListener('click', () => {
    formOpen = !formOpen;
    formSlot.style.display = formOpen ? 'block' : 'none';
    toggleBtn.textContent = formOpen ? 'Ocultar formulario' : 'Revisar';
  });

  const nameInput = TextInput({ value: scan.extracted_product_name || '' });
  Field({ labelText: 'Nombre del producto', control: nameInput, parent: formSlot });

  const brandInput = TextInput({ value: scan.extracted_brand || '' });
  Field({ labelText: 'Marca', control: brandInput, parent: formSlot });

  const categorySelect = Select({
    options: [{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    value: '',
  });
  Field({ labelText: `Categoría${scan.extracted_category_guess ? ` (sugerencia: ${scan.extracted_category_guess})` : ''}`, control: categorySelect, parent: formSlot });

  const unitInput = TextInput({ value: scan.extracted_unit || '' });
  Field({ labelText: 'Unidad (ej. kg, unidad, litro)', control: unitInput, parent: formSlot });

  const unitSizeInput = TextInput({ type: 'number', value: scan.extracted_unit_size ?? '' });
  Field({ labelText: 'Tamaño de la unidad', control: unitSizeInput, parent: formSlot });

  div({ style: { borderTop: '1px solid var(--border)', margin: 'var(--space-3) 0', paddingTop: 'var(--space-3)', fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' } }, formSlot, 'Información nutricional');

  const servingSizeInput = TextInput({ value: scan.extracted_serving_size || '' });
  Field({ labelText: 'Porción (ej. 100g, 1 taza)', control: servingSizeInput, parent: formSlot });

  const nutritionGrid = div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-3)' } }, formSlot);
  const caloriesInput = TextInput({ type: 'number', value: scan.extracted_calories ?? '' });
  Field({ labelText: 'Calorías (kcal)', control: caloriesInput, parent: nutritionGrid });
  const proteinInput = TextInput({ type: 'number', value: scan.extracted_protein_g ?? '' });
  Field({ labelText: 'Proteína (g)', control: proteinInput, parent: nutritionGrid });
  const carbsInput = TextInput({ type: 'number', value: scan.extracted_carbs_g ?? '' });
  Field({ labelText: 'Carbohidratos (g)', control: carbsInput, parent: nutritionGrid });
  const fatInput = TextInput({ type: 'number', value: scan.extracted_fat_g ?? '' });
  Field({ labelText: 'Grasa (g)', control: fatInput, parent: nutritionGrid });
  const fiberInput = TextInput({ type: 'number', value: scan.extracted_fiber_g ?? '' });
  Field({ labelText: 'Fibra (g)', control: fiberInput, parent: nutritionGrid });
  const sugarInput = TextInput({ type: 'number', value: scan.extracted_sugar_g ?? '' });
  Field({ labelText: 'Azúcar (g)', control: sugarInput, parent: nutritionGrid });
  const sodiumInput = TextInput({ type: 'number', value: scan.extracted_sodium_mg ?? '' });
  Field({ labelText: 'Sodio (mg)', control: sodiumInput, parent: nutritionGrid });

  const reasonInput = TextInput({ placeholder: 'Motivo (opcional, se muestra al usuario que lo subió)' });

  const buttonsRow = div({ style: { display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' } }, formSlot);
  const approveBtn = Button({ label: 'Aprobar y publicar', variant: 'primary', block: true, parent: buttonsRow });
  const rejectBtn = Button({ label: 'Rechazar', variant: 'danger', block: true, parent: buttonsRow });

  Field({ labelText: 'Motivo de rechazo', control: reasonInput, parent: formSlot });

  approveBtn.addEventListener('click', async () => {
    alertSlot.innerHTML = '';

    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();
    const unitSize = numOrNull(unitSizeInput.value);

    if (!name || !unit || !unitSize || unitSize <= 0) {
      Alert({ variant: 'error', title: 'Faltan datos', text: 'Nombre, unidad y tamaño de la unidad son obligatorios para aprobar.', parent: alertSlot });
      return;
    }

    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    approveBtn.textContent = 'Aprobando…';

    try {
      await api.post(`/product-scans/${scan.id}/approve`, {
        name,
        brand: strOrNull(brandInput.value),
        categoryId: categorySelect.value || null,
        unit,
        unitSize,
        nutrition: {
          servingSize: strOrNull(servingSizeInput.value),
          calories: numOrNull(caloriesInput.value),
          proteinG: numOrNull(proteinInput.value),
          carbsG: numOrNull(carbsInput.value),
          fatG: numOrNull(fatInput.value),
          fiberG: numOrNull(fiberInput.value),
          sugarG: numOrNull(sugarInput.value),
          sodiumMg: numOrNull(sodiumInput.value),
        },
      });
      onResolved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo aprobar el escaneo';
      Alert({ variant: 'error', title: 'Error', text: message, parent: alertSlot });
      approveBtn.disabled = false;
      rejectBtn.disabled = false;
      approveBtn.textContent = 'Aprobar y publicar';
    }
  });

  rejectBtn.addEventListener('click', async () => {
    alertSlot.innerHTML = '';
    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    rejectBtn.textContent = 'Rechazando…';

    try {
      await api.post(`/product-scans/${scan.id}/reject`, { reason: strOrNull(reasonInput.value) });
      onResolved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo rechazar el escaneo';
      Alert({ variant: 'error', title: 'Error', text: message, parent: alertSlot });
      approveBtn.disabled = false;
      rejectBtn.disabled = false;
      rejectBtn.textContent = 'Rechazar';
    }
  });

  return card;
}

export function renderRevisionEscaneosScreen(container) {
  const screen = div({}, container);
  h1({ className: 'screen-title' }, screen, 'Revisión de escaneos');

  const user = getUser();
  if (!user?.is_admin) {
    p({ className: 'screen-subtitle' }, screen, 'Esta sección es solo para administradores.');
    EmptyState({ icon: '🔒', title: 'Acceso restringido', text: 'Tu cuenta no tiene permisos de administrador.', parent: screen });
    return;
  }

  p({ className: 'screen-subtitle' }, screen, 'Confirmá o corregí lo que Claude leyó en cada foto antes de que entre al catálogo.');

  const filterSelect = Select({ options: STATUS_OPTIONS, value: 'pending' });
  Field({ labelText: 'Mostrar', control: filterSelect, parent: screen });

  // .results-grid: mismo criterio que en comparador.js — desde tablet
  // acomoda varias tarjetas de revisión por fila (ver components.css).
  const listSlot = div({ className: 'results-grid' }, screen);
  let categories = [];

  async function loadList() {
    listSlot.innerHTML = '';
    const spinnerWrap = div({ style: { display: 'flex', justifyContent: 'center', padding: 'var(--space-8) 0' } }, listSlot);
    Spinner({ parent: spinnerWrap });

    try {
      const { scans } = await api.get(`/product-scans?status=${filterSelect.value}`);
      listSlot.innerHTML = '';

      if (scans.length === 0) {
        EmptyState({
          icon: '✅',
          title: 'Nada por acá',
          text: `No hay escaneos en estado "${STATUS_OPTIONS.find((o) => o.value === filterSelect.value)?.label.toLowerCase()}".`,
          parent: listSlot,
        });
        return;
      }

      scans.forEach((scan) => {
        ScanReviewCard({ scan, categories, onResolved: loadList, parent: listSlot });
      });
    } catch (err) {
      listSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo cargar la lista de escaneos';
      Alert({ variant: 'error', title: 'Error', text: message, parent: listSlot });
    }
  }

  filterSelect.addEventListener('change', loadList);

  api
    .get('/categories')
    .then(({ categories: cats }) => {
      categories = cats;
    })
    .catch(() => {
      // Si falla, el selector de categoría del formulario queda vacío pero
      // igual se puede aprobar sin categoría — no bloqueamos el flujo por esto.
    })
    .finally(loadList);
}
