/**
 * middleware/auth.js — Verifica el JWT de sesión.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { findUserById } from '../modules/users/repository.js';
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

/**
 * Requiere que el usuario autenticado tenga `is_admin = true`. El JWT no
 * lleva ese dato (no queremos que un flag de permisos quede embebido en un
 * token de 2h que no se puede revocar antes de que expire), así que se
 * consulta la base cada vez — es un endpoint de bajo tráfico (revisión de
 * escaneos), el costo extra de la consulta no importa acá. Siempre después
 * de `requireAuth` en la cadena de middlewares.
 */
export async function requireAdmin(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user?.is_admin) {
      return next(new ApiError(403, 'No tenés permisos para hacer esto'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
