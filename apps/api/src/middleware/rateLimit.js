/**
 * middleware/rateLimit.js — Límites de tasa por tipo de endpoint.
 *
 * Login/registro y la subida de PDFs son más caros (bcrypt, llamadas a la
 * API de Claude) y más atractivos para abuso, así que llevan límites
 * más estrictos que el resto de la API.
 */

import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de subidas alcanzado. Intenta de nuevo en una hora.' },
});
