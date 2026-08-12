/**
 * lib/auth.js — Estado de sesión: token JWT + datos básicos del usuario.
 *
 * Se persiste en localStorage (namespaced) para que la sesión sobreviva un
 * refresh de página — esto es una app real, no un artifact, así que
 * localStorage es la herramienta correcta acá (no hay nada equivalente a
 * "memoria de servidor" en un frontend estático sin build step).
 *
 * El JWT en sí es responsabilidad del backend (expira en 2h, ver
 * apps/api/src/modules/users/controller.js) — este módulo no lo valida,
 * solo lo guarda/lee. Si expiró, la próxima petición a la API devuelve 401
 * y apiClient.js limpia la sesión automáticamente (ver ese archivo).
 */

const STORAGE_KEY = 'katofit_session';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let session = read();

export function getToken() {
  return session?.token ?? null;
}

export function getUser() {
  return session?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(session?.token);
}

export function setSession({ user, token }) {
  session = { user, token };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Actualiza solo los datos del usuario dentro de la sesión existente (ej.
 * después de PATCH /auth/me), sin tocar el token — evita tener que volver
 * a loguear al usuario por cambiar su nombre o preferencia.
 */
export function updateSessionUser(user) {
  if (!session) return;
  session = { ...session, user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}
