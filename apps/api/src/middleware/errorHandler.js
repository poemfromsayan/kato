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

  const body = {
    error: statusCode >= 500 ? 'Error interno del servidor' : err.message,
  };

  if (err.details) body.details = err.details;
  if (!config.isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}
