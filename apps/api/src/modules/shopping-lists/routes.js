import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { getShoppingList, getShoppingLists, postShoppingList } from './controller.js';
import { planIdParamsSchema, shoppingListIdParamsSchema } from './schemas.js';

export const shoppingListsRouter = Router();

// Vive bajo /nutrition-plans porque conceptualmente es una acción sobre un
// plan concreto ("generá la lista de compras DE ESTE plan"), aunque el
// recurso que crea (shopping_lists) sea independiente.
shoppingListsRouter.post(
  '/nutrition-plans/:planId/shopping-list',
  requireAuth,
  validate({ params: planIdParamsSchema }),
  postShoppingList
);

shoppingListsRouter.get('/shopping-lists', requireAuth, getShoppingLists);
shoppingListsRouter.get(
  '/shopping-lists/:id',
  requireAuth,
  validate({ params: shoppingListIdParamsSchema }),
  getShoppingList
);
