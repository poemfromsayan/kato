import { Router } from 'express';
import { nutritionPlansRouter } from '../modules/nutrition-plans/routes.js';
import { pricesRouter } from '../modules/prices/routes.js';
import { productsRouter } from '../modules/products/routes.js';
import { storesRouter } from '../modules/stores/routes.js';
import { usersRouter } from '../modules/users/routes.js';

export const apiRouter = Router();

apiRouter.use('/stores', storesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/prices', pricesRouter);
apiRouter.use('/nutrition-plans', nutritionPlansRouter);
apiRouter.use('/auth', usersRouter);
