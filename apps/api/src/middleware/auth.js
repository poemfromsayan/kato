/**
 * middleware/auth.js — Verifica el JWT de sesión.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from './errorHandler.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Falta el token de autenticación'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new ApiError(401, 'Token inválido o expirado'));
  }
}
