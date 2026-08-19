/**
 * screens/escanear.js — Escanear un producto con la cámara para sumarlo (o
 * enriquecerlo) en el catálogo con ayuda de otros usuarios.
 *
 * Flujo: el usuario saca 1-2 fotos (empaque obligatorio, tabla nutricional
 * opcional) → se suben a POST /product-scans/upload → el backend usa Claude
 * vision para leer los datos y los guarda en `product_scans` con
 * status='pending'. Nada de esto toca el catálogo real todavía: un admin
 * tiene que aprobarlo (ver screens/revisionEscaneos.js) — así nunca
 * mostramos como "hecho verificado" algo que solo un usuario subió.
 */

import { button, div, h1, img, input, label, p, span } from '../html.js';
import { Alert, Button, Spinner } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';

const NUTRIENT_FIELDS = [
  ['calories', 'Calorías', 'kcal'],
  ['proteinG', 'Proteína', 'g'],
  ['carbsG', 'Carbohidratos', 'g'],
  ['fatG', 'Grasa', 'g'],
  ['fiberG', 'Fibra', 'g'],
  ['sugarG', 'Azúcar', 'g'],
  ['sodiumMg', 'Sodio', 'mg'],
];

/**
 * Una casilla de captura: caja clicleable que abre el selector de
 * archivos/cámara del dispositivo y muestra una previsualización una vez
 * elegida la foto. Sin `capture` forzado en el input — así en desktop
 * sigue funcionando como selector de archivos normal (útil para probar
 * sin cámara) y en mobile el navegador ofrece cámara o galería.
 */
function ImageCaptureSlot({ labelText, required = false, parent }) {
  const wrap = div({ style: { marginBottom: 'var(--space-4)' } }, parent);

  const labelRow = div({ style: { display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' } }, wrap);
  label({ className: 'field__label' }, labelRow, labelText);
  if (required) span({ style: { color: 'var(--error-500)' } }, labelRow, '*');
  else span({ style: { color: 'var(--text-subtle)', fontSize: 'var(--fs-caption)' } }, labelRow, '(opcional)');

  const fileInput = input(
    { type: 'file', accept: 'image/*', style: { display: 'none' } },
    wrap
  );

  const slot = div({ className: 'scan-slot' }, wrap);
  const placeholder = div({ className: 'scan-slot__placeholder' }, slot);
  span({ className: 'scan-slot__placeholder-icon' }, placeholder, '📷');
  span({}, placeholder, 'Tocá para tomar o elegir una foto');

  let file = null;
  let previewUrl = null;
  let previewImg = null;
  let removeBtn = null;
  let onChangeCb = () => {};

  function clear() {
    file = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    if (previewImg) previewImg.remove();
    if (removeBtn) removeBtn.remove();
    previewImg = null;
    removeBtn = null;
    placeholder.style.display = 'flex';
    slot.classList.remove('scan-slot--filled');
    fileInput.value = '';
    onChangeCb();
  }

  function setFile(selected) {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) return;

    file = selected;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(selected);

    placeholder.style.display = 'none';
    previewImg = img({ src: previewUrl, className: 'scan-slot__preview', alt: '' }, slot);
    removeBtn = button(
      {
        type: 'button',
        className: 'scan-slot__remove',
        'aria-label': 'Quitar foto',
        onClick: (e) => {
          e.stopPropagation();
          clear();
        },
      },
      slot,
      '✕'
    );
    slot.classList.add('scan-slot--filled');
    onChangeCb();
  }

  slot.addEventListener('click', () => {
    if (!file) fileInput.click();
  });
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

  return {
    get file() {
      return file;
    },
    clear,
    onChange(cb) {
      onChangeCb = cb;
    },
  };
}

function renderNutritionSummary(nutrition, parent) {
  const hasAny = NUTRIENT_FIELDS.some(([key]) => nutrition?.[key] != null);
  if (!hasAny) {
    span(
      { style: { color: 'var(--text-subtle)', fontSize: 'var(--fs-caption)' } },
      parent,
      'No pudimos leer datos nutricionales en la foto.'
    );
    return;
  }

  if (nutrition.servingSize) {
    span(
      { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' } },
      parent,
      `Por ${nutrition.servingSize}`
    );
  }

  const grid = div(
    { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2) var(--space-4)' } },
    parent
  );
  NUTRIENT_FIELDS.forEach(([key, labelText, unit]) => {
    const value = nutrition?.[key];
    const row = div({ style: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-caption)' } }, grid);
    span({ style: { color: 'var(--text-muted)' } }, row, labelText);
    span(
      { style: { fontFamily: 'var(--font-mono)', color: 'var(--text)' } },
      row,
      value == null ? '—' : `${value}${unit}`
    );
  });
}

export function renderEscanearScreen(container) {
  const screen = div({ className: 'screen--narrow' }, container);

  h1({ className: 'screen-title' }, screen, 'Escanear producto');
  p(
    { className: 'screen-subtitle' },
    screen,
    '¿No encontraste un producto en Katö? Tomale una foto y ayudanos a agregarlo. Un administrador revisa cada envío antes de que se sume al catálogo.'
  );

  const packageSlot = ImageCaptureSlot({ labelText: 'Foto del empaque o etiqueta', required: true, parent: screen });
  const nutritionSlot = ImageCaptureSlot({ labelText: 'Foto de la tabla nutricional', required: false, parent: screen });

  const alertSlot = div({}, screen);
  const submitBtn = Button({ label: 'Enviar para revisión', variant: 'primary', size: 'lg', block: true, disabled: true, parent: screen });
  const resultSlot = div({}, screen);

  function updateSubmitState() {
    submitBtn.disabled = !packageSlot.file;
  }
  packageSlot.onChange(updateSubmitState);
  nutritionSlot.onChange(updateSubmitState);

  function resetForm() {
    packageSlot.clear();
    nutritionSlot.clear();
    alertSlot.innerHTML = '';
    resultSlot.innerHTML = '';
    submitBtn.style.display = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviar para revisión';
  }

  submitBtn.addEventListener('click', async () => {
    if (!packageSlot.file) return;

    alertSlot.innerHTML = '';
    resultSlot.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analizando…';
    const spinnerWrap = div({ style: { display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-3)' } }, resultSlot);
    Spinner({ parent: spinnerWrap });
    span(
      { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)' } },
      spinnerWrap,
      'Esto puede tardar unos segundos — Katö está leyendo tus fotos.'
    );

    const formData = new FormData();
    formData.append('packageImage', packageSlot.file);
    if (nutritionSlot.file) formData.append('nutritionImage', nutritionSlot.file);

    try {
      const { scan } = await api.postForm('/product-scans/upload', formData);
      resultSlot.innerHTML = '';

      Alert({
        variant: 'success',
        title: 'Foto recibida',
        text: 'Guardamos tu envío en la cola de revisión. En cuanto un administrador lo confirme, se va a sumar (o completar) en el catálogo.',
        parent: resultSlot,
      });

      const card = div({ className: 'card', style: { marginTop: 'var(--space-4)' } }, resultSlot);
      div({ className: 'product-card__title' }, card, scan.extracted.productName || 'Producto sin nombre legible');
      const sub = [scan.extracted.brand, scan.extracted.categoryGuess].filter(Boolean).join(' · ');
      if (sub) span({ className: 'product-card__sub' }, card, sub);

      if (scan.matchedProductId) {
        p(
          { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', marginTop: 'var(--space-3)' } },
          card,
          `Podría ser el mismo producto que ya tenemos como "${scan.matchedProductName}". Si se aprueba, se usará esta foto para completar su información.`
        );
      } else {
        p(
          { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', marginTop: 'var(--space-3)' } },
          card,
          'No encontramos un producto parecido en el catálogo — si se aprueba, se va a crear uno nuevo.'
        );
      }

      const nutritionSection = div(
        { style: { borderTop: '1px solid var(--border)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' } },
        card
      );
      renderNutritionSummary(scan.extracted.nutrition, nutritionSection);

      Button({ label: 'Escanear otro producto', variant: 'secondary', block: true, parent: resultSlot, onClick: resetForm });

      submitBtn.style.display = 'none';
    } catch (err) {
      resultSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo procesar la foto';
      Alert({ variant: 'error', title: 'No se pudo procesar la foto', text: message, parent: alertSlot });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar para revisión';
    }
  });
}
