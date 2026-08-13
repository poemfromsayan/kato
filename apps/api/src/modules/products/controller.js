import { ApiError } from '../../middleware/errorHandler.js';
import { getNutritionFactsForProduct, getProductById, searchProducts } from './repository.js';

export async function getProducts(req, res, next) {
  try {
    const { q, categoryId, limit } = req.query;
    const products = await searchProducts({ text: q, categoryId, limit });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await getProductById(req.params.id);
    if (!product) throw new ApiError(404, 'Producto no encontrado');
    const nutritionFacts = await getNutritionFactsForProduct(req.params.id);
    res.json({ product, nutritionFacts });
  } catch (err) {
    next(err);
  }
}
