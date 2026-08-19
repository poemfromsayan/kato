/**
 * lib/apiClient.js — Wrapper único sobre fetch() para hablar con la API.
 *
 * Centraliza tres cosas para que las pantallas no tengan que repetirlas:
 * adjuntar el token de sesión, serializar el body, y normalizar errores
 * (incluyendo el caso 401 → sesión expirada).
 */

import { API_BASE_URL } from '../config.js';
import { clearSession, getToken } from './auth.js';

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * @param {string} path ej. '/products?q=pollo'
 * @param {{ method?: string, body?: unknown, isFormData?: boolean }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, isFormData = false } = options;

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo la API?');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    if (response.status === 401) {
      // El token venció o es inválido: no tiene sentido seguir mostrando
      // al usuario como autenticado — se limpia acá mismo, de forma
      // centralizada, en vez de que cada pantalla lo maneje por su cuenta.
      clearSession();
      window.dispatchEvent(new CustomEvent('katofit:unauthorized'));
    }
    throw new ApiError(response.status, data?.error || 'Ocurrió un error inesperado', data?.details);
  }

  return data;
}

/**
 * Para endpoints que devuelven binarios (ej. las fotos de un escaneo, ver
 * GET /product-scans/:id/image/:type) en vez de JSON. Un <img src="..."
 * directo no funcionaría porque el navegador no adjunta el header
 * Authorization en pedidos de imagen — así que lo traemos nosotros con
 * fetch() y el caller arma un object URL con el blob resultante.
 */
async function apiFetchBlob(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo la API?');
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('katofit:unauthorized'));
    }
    let message = 'No se pudo cargar el archivo';
    try {
      const data = await response.json();
      message = data?.error || message;
    } catch {
      // La respuesta no era JSON — nos quedamos con el mensaje genérico.
    }
    throw new ApiError(response.status, message);
  }

  return response.blob();
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  postForm: (path, formData) => apiFetch(path, { method: 'POST', body: formData, isFormData: true }),
  getBlob: (path) => apiFetchBlob(path),
};
