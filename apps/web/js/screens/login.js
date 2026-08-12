/**
 * screens/login.js — Login y registro en la misma pantalla, con tabs.
 */

import { button, div, form, h1, p } from '../html.js';
import { Alert, Button, Field, TextInput } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';
import { setSession } from '../lib/auth.js';
import { navigate } from '../lib/router.js';

const MIN_PASSWORD_LENGTH = 10;

export function renderLoginScreen(container) {
  let mode = 'login'; // 'login' | 'register'

  const screen = div({ className: 'auth-screen' }, container);

  h1({ className: 'screen-title', style: { textAlign: 'center', marginBottom: 'var(--space-2)' } }, screen, 'Katö');
  p({ style: { textAlign: 'center', marginBottom: 'var(--space-6)' } }, screen, 'Compará precios, seguí tu plan nutricional.');

  const tabs = div({ className: 'auth-tabs' }, screen);
  const loginTab = button({ type: 'button', className: 'auth-tabs__btn auth-tabs__btn--active' }, tabs, 'Iniciar sesión');
  const registerTab = button({ type: 'button', className: 'auth-tabs__btn' }, tabs, 'Crear cuenta');

  const alertSlot = div({}, screen);
  const formEl = form({}, screen);

  const nameField = div({}, formEl); // solo visible en modo registro
  const nameInput = TextInput({ placeholder: 'Tu nombre', autocomplete: 'name' });
  Field({ labelText: 'Nombre (opcional)', control: nameInput, parent: nameField });
  nameField.style.display = 'none';

  const emailInput = TextInput({ type: 'email', placeholder: 'tu@correo.com', required: true, autocomplete: 'email' });
  Field({ labelText: 'Correo', control: emailInput, parent: formEl });

  const passwordInput = TextInput({ type: 'password', placeholder: '••••••••••', required: true, autocomplete: 'current-password' });
  Field({ labelText: 'Contraseña', control: passwordInput, parent: formEl });

  const submitBtn = Button({ label: 'Iniciar sesión', variant: 'primary', size: 'lg', block: true, type: 'submit', parent: formEl });

  function setMode(next) {
    mode = next;
    alertSlot.innerHTML = '';
    nameField.style.display = mode === 'register' ? '' : 'none';
    passwordInput.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    submitBtn.textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    loginTab.className = `auth-tabs__btn ${mode === 'login' ? 'auth-tabs__btn--active' : ''}`;
    registerTab.className = `auth-tabs__btn ${mode === 'register' ? 'auth-tabs__btn--active' : ''}`;
  }

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertSlot.innerHTML = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      Alert({
        variant: 'error',
        title: 'Contraseña muy corta',
        text: `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        parent: alertSlot,
      });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'register' ? 'Creando cuenta…' : 'Entrando…';

    try {
      const payload = { email, password };
      if (mode === 'register' && nameInput.value.trim()) payload.displayName = nameInput.value.trim();

      const result = await api.post(mode === 'register' ? '/auth/register' : '/auth/login', payload);
      setSession(result);

      const params = new URLSearchParams(window.location.search);
      navigate(params.get('next') || '/', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Ocurrió un error inesperado';
      Alert({ variant: 'error', title: 'No se pudo continuar', text: message, parent: alertSlot });
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    }
  });
}
