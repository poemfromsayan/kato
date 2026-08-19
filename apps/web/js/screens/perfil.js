/**
 * screens/perfil.js — Perfil del usuario: nombre y preferencia
 * precio vs. calidad, que es lo que usa el comparador para elegir/resaltar
 * la "mejor" tienda por producto (ver docs/DATA_MODEL.md).
 */

import { div, form, h1, p } from '../html.js';
import { Alert, Button, Field, Select, TextInput } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';
import { getUser, updateSessionUser } from '../lib/auth.js';

const PREFERENCE_OPTIONS = [
  { value: 'price', label: '💰 Priorizar precio más bajo' },
  { value: 'quality', label: '⭐ Priorizar mejor calidad' },
  { value: 'balance', label: '⚖️ Balance entre precio y calidad' },
];

const PREFERENCE_HELP = {
  price: 'El comparador va a resaltar siempre la tienda más barata, sin importar otros factores.',
  quality: 'El comparador va a priorizar productos con mejor información nutricional y reputación de tienda por encima del precio.',
  balance: 'El comparador busca el mejor punto medio entre precio y calidad para cada producto.',
};

export function renderPerfilScreen(container) {
  const user = getUser();
  const screen = div({ className: 'screen--narrow' }, container);

  h1({ className: 'screen-title' }, screen, 'Perfil y preferencias');
  p({ className: 'screen-subtitle' }, screen, 'Esto define cómo Katö elige la "mejor" tienda por vos.');

  const alertSlot = div({}, screen);
  const formEl = form({}, screen);

  const nameInput = TextInput({
    placeholder: 'Tu nombre',
    value: user?.display_name || '',
    autocomplete: 'name',
  });
  Field({ labelText: 'Nombre', control: nameInput, parent: formEl });

  const emailField = div({ className: 'field' }, formEl);
  p({ className: 'field__label' }, emailField, 'Correo');
  p({ style: { color: 'var(--text-subtle)', margin: 0 } }, emailField, user?.email || '—');

  const preferenceSelect = Select({
    options: PREFERENCE_OPTIONS,
    value: user?.price_quality_preference || 'balance',
  });
  Field({ labelText: 'Prioridad al comparar precios', control: preferenceSelect, parent: formEl });

  const helpText = p(
    { style: { fontSize: 'var(--fs-caption)', color: 'var(--text-subtle)', marginTop: 'calc(-1 * var(--space-3))' } },
    formEl,
    PREFERENCE_HELP[preferenceSelect.value]
  );

  preferenceSelect.addEventListener('change', () => {
    helpText.textContent = PREFERENCE_HELP[preferenceSelect.value];
  });

  const submitBtn = Button({ label: 'Guardar cambios', variant: 'primary', size: 'lg', block: true, type: 'submit', parent: formEl });

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertSlot.innerHTML = '';

    const displayName = nameInput.value.trim();
    if (!displayName) {
      Alert({ variant: 'error', title: 'Falta el nombre', text: 'El nombre no puede quedar vacío.', parent: alertSlot });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando…';

    try {
      const { user: updatedUser } = await api.patch('/auth/me', {
        displayName,
        priceQualityPreference: preferenceSelect.value,
      });
      updateSessionUser(updatedUser);
      Alert({ variant: 'success', title: 'Guardado', text: 'Tus preferencias se actualizaron.', parent: alertSlot });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo guardar el cambio';
      Alert({ variant: 'error', title: 'Error', text: message, parent: alertSlot });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar cambios';
    }
  });
}
