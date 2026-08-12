import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { productIdParamsSchema } from '../products/schemas.js';
import { getProductPrices } from './controller.js';

export const pricesRouter = Router();

pricesRouter.get('/products/:id', validate({ params: productIdParamsSchema }), getProductPrices);
