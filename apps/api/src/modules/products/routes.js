import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { getProduct, getProducts } from './controller.js';
import { productIdParamsSchema, searchProductsQuerySchema } from './schemas.js';

export const productsRouter = Router();

productsRouter.get('/', validate({ query: searchProductsQuerySchema }), getProducts);
productsRouter.get('/:id', validate({ params: productIdParamsSchema }), getProduct);
