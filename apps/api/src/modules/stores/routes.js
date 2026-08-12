import { Router } from 'express';
import { getStores } from './controller.js';

export const storesRouter = Router();

storesRouter.get('/', getStores);
