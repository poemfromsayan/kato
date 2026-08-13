/**
 * middleware/errorHandler.js — Manejo centralizado de errores.
 *
 * Nunca devolvemos el stack trace ni el mensaje interno crudo al cliente en
 * producción: eso puede filtrar detalles de la infraestructura (rutas de
 * archivos, versiones de librerías, fragmentos de queries SQL, etc.).
 */

import { config } from '../config/env.js';

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'No encontrado' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    // Los 5xx sí se registran completos en el log del servidor para poder depurarlos.
    console.error(err);
  }

  // Un ApiError SIEMPRE trae un mensaje que nosotros mismos escribimos a
  // propósito para mostrárselo al usuario (ej. "falta ANTHROPIC_API_KEY"),
  // sin importar el status code — no es un detalle interno que haya que
  // esconder. Lo que sí escondemos es cualquier error que NO sea un
  // ApiError (una excepción real no controlada: bug, driver de Postgres,
  // etc.), porque ese sí puede traer detalles de infraestructura en el
  // mensaje. Antes esto se decidía solo por statusCode >= 500, lo cual
  // tapaba mensajes útiles de errores 5xx que SÍ eran intencionales (ver
  // services/ai/extractPlan.js).
  const body = {
    error: err instanceof ApiError ? err.message : 'Error interno del servidor',
  };

  if (err.details) body.details = err.details;
  if (!config.isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}
