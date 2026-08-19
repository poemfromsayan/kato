import { Router } from 'express';
import { getCategories } from './controller.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', getCategories);
