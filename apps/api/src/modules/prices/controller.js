import { getCurrentPricesForProduct } from './repository.js';

export async function getProductPrices(req, res, next) {
  try {
    const prices = await getCurrentPricesForProduct(req.params.id);
    const cheapest = prices.reduce(
      (min, p) => (min === null || Number(p.price) < Number(min.price) ? p : min),
      null
    );
    res.json({ prices, cheapestStoreId: cheapest?.store_id ?? null });
  } catch (err) {
    next(err);
  }
}
