import { ApiError } from '../../middleware/errorHandler.js';
import { findUserById } from '../users/repository.js';
import { generateShoppingList, getShoppingListById, listShoppingListsForUser } from './repository.js';

export async function postShoppingList(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) throw new ApiError(404, 'Usuario no encontrado');

    const result = await generateShoppingList({
      planId: req.params.planId,
      userId: req.user.id,
      preferenceUsed: user.price_quality_preference,
    });

    if (result.notFound) throw new ApiError(404, 'Plan no encontrado');
    if (result.notParsed) {
      throw new ApiError(409, 'Este plan todavía no terminó de procesarse, todavía no se puede generar una lista de compras');
    }
    if (result.noMatches) {
      throw new ApiError(
        422,
        'Ningún alimento de este plan coincide con productos de nuestro catálogo todavía. Probá con un plan distinto o esperá a que agreguemos más productos.'
      );
    }

    res.status(201).json({ shoppingList: result.list });
  } catch (err) {
    next(err);
  }
}

export async function getShoppingLists(req, res, next) {
  try {
    const shoppingLists = await listShoppingListsForUser(req.user.id);
    res.json({ shoppingLists });
  } catch (err) {
    next(err);
  }
}

export async function getShoppingList(req, res, next) {
  try {
    const shoppingList = await getShoppingListById(req.params.id, req.user.id);
    if (!shoppingList) throw new ApiError(404, 'Lista de compras no encontrada');
    res.json({ shoppingList });
  } catch (err) {
    next(err);
  }
}
