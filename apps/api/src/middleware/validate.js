/**
 * middleware/validate.js — Valida body/query/params contra un schema de zod
 * antes de que la petición llegue al controlador.
 *
 * Regla del proyecto: ningún dato de `req` toca una query SQL sin haber
 * pasado por aquí primero.
 */

import { ApiError } from './errorHandler.js';

/**
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      next(new ApiError(400, 'Datos de la petición inválidos', err.errors ?? err.message));
    }
  };
}
