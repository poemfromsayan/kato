import { listActiveStores } from './repository.js';

export async function getStores(req, res, next) {
  try {
    const stores = await listActiveStores();
    res.json({ stores });
  } catch (err) {
    next(err);
  }
}
