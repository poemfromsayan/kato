import { listCategories } from './repository.js';

export async function getCategories(req, res, next) {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}
