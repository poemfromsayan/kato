/**
 * screens/subirPlan.js — Subir el PDF del plan nutricional y mostrar la
 * lista estructurada que Claude extrae (ver apps/api/.../services/ai).
 */

import { a, div, h1, input, p, span } from '../html.js';
import { Alert, Button, Spinner } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';

export function renderSubirPlanScreen(container) {
  const screen = div({}, container);

  h1({ className: 'screen-title' }, screen, 'Subir plan nutricional');
  p({ className: 'screen-subtitle' }, screen, 'Subí el PDF de tu plan y lo convertimos en una lista de alimentos.');

  let selectedFile = null;

  const fileInput = input({ type: 'file', accept: 'application/pdf', style: { display: 'none' } }, screen);

  const dropzone = div({ className: 'dropzone', tabIndex: 0, role: 'button' }, screen);
  const dropzoneLabel = span({}, dropzone, '📄 Arrastrá tu PDF aquí o hacé clic para seleccionar');
  const filenameLabel = span({ className: 'dropzone__filename' }, dropzone);

  const alertSlot = div({}, screen);
  const submitBtn = Button({ label: 'Analizar plan', variant: 'primary', size: 'lg', block: true, disabled: true, parent: screen });
  const resultSlot = div({}, screen);

  function setFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alertSlot.innerHTML = '';
      Alert({ variant: 'error', title: 'Formato no válido', text: 'Solo se aceptan archivos PDF.', parent: alertSlot });
      return;
    }
    selectedFile = file;
    filenameLabel.textContent = file.name;
    submitBtn.disabled = false;
    alertSlot.innerHTML = '';
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dropzone--active');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone--active');
    })
  );
  dropzone.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    alertSlot.innerHTML = '';
    resultSlot.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analizando…';
    const spinnerWrap = div({ style: { display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-3)' } }, resultSlot);
    Spinner({ parent: spinnerWrap });
    span({ style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)' } }, spinnerWrap, 'Esto puede tardar unos segundos — Claude está leyendo tu plan.');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const { plan } = await api.postForm('/nutrition-plans/upload', formData);
      resultSlot.innerHTML = '';

      Alert({
        variant: 'success',
        title: 'Plan procesado',
        text: `Encontramos ${plan.items.length} alimento${plan.items.length === 1 ? '' : 's'} en tu plan.`,
        parent: resultSlot,
      });

      plan.items.forEach((item) => {
        const row = div({ className: 'plan-item-row' }, resultSlot);
        span({ className: 'plan-item-row__name' }, row, item.foodName);
        const metaParts = [
          item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}` : null,
          item.frequency,
        ].filter(Boolean);
        span({ className: 'plan-item-row__meta' }, row, metaParts.join(' · ') || '—');
      });

      const dashboardLink = a({ href: '/', style: { display: 'block', marginTop: 'var(--space-5)' } }, resultSlot);
      Button({ label: 'Ver en el dashboard', variant: 'secondary', block: true, parent: dashboardLink });

      submitBtn.style.display = 'none';
      dropzone.style.display = 'none';
    } catch (err) {
      resultSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo procesar el plan';
      Alert({ variant: 'error', title: 'No se pudo procesar el plan', text: message, parent: alertSlot });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analizar plan';
    }
  });
}
