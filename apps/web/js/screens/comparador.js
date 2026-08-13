/**
 * screens/comparador.js — Buscar un producto y comparar su precio entre
 * supermercados.
 */

import { button, div, h1, p, span } from '../html.js';
import { Alert, Field, ProductCard, Spinner, TextInput } from '../components/index.js';
import { api, ApiError } from '../lib/apiClient.js';

const SEARCH_DEBOUNCE_MS = 350;

export function renderComparadorScreen(container) {
  const screen = div({}, container);

  h1({ className: 'screen-title' }, screen, 'Comparar precios');
  p({ className: 'screen-subtitle' }, screen, 'Buscá un producto para ver en qué supermercado sale más barato.');

  const searchInput = TextInput({ placeholder: 'Ej. arroz, pollo, leche…', icon: '🔍' });
  Field({ control: searchInput, parent: screen });

  const resultsSlot = div({}, screen);
  const detailSlot = div({}, screen);

  let debounceTimer = null;
  let requestToken = 0;

  async function search(text) {
    const myToken = ++requestToken;
    resultsSlot.innerHTML = '';

    if (!text) return;

    Spinner({ parent: resultsSlot });

    try {
      const { products } = await api.get(`/products?q=${encodeURIComponent(text)}`);
      if (myToken !== requestToken) return; // llegó una búsqueda más nueva mientras esperábamos

      resultsSlot.innerHTML = '';

      if (products.length === 0) {
        p({ style: { color: 'var(--text-subtle)', fontSize: 'var(--fs-caption)' } }, resultsSlot, 'Sin resultados.');
        return;
      }

      products.forEach((product) => {
        const row = button(
          {
            type: 'button',
            className: 'card',
            style: { width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none' },
            onClick: () => selectProduct(product),
          },
          resultsSlot
        );
        div({ style: { fontWeight: 'var(--fw-bold)' } }, row, product.name);
        span(
          { style: { fontSize: 'var(--fs-micro)', color: 'var(--text-subtle)' } },
          row,
          `${product.brand ? product.brand + ' · ' : ''}${product.unit_size} ${product.unit}`
        );
      });
    } catch (err) {
      if (myToken !== requestToken) return;
      resultsSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudo buscar productos';
      Alert({ variant: 'error', title: 'Error', text: message, parent: resultsSlot });
    }
  }

  async function selectProduct(product) {
    resultsSlot.innerHTML = '';
    detailSlot.innerHTML = '';
    Spinner({ parent: detailSlot });

    try {
      const [{ prices, cheapestStoreId }, { nutritionFacts }] = await Promise.all([
        api.get(`/prices/products/${product.id}`),
        api.get(`/products/${product.id}`),
      ]);
      detailSlot.innerHTML = '';
      ProductCard({ product, prices, cheapestStoreId, nutritionFacts, parent: detailSlot });
    } catch (err) {
      detailSlot.innerHTML = '';
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar los precios';
      Alert({ variant: 'error', title: 'Error', text: message, parent: detailSlot });
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const text = searchInput.value.trim();
    debounceTimer = setTimeout(() => search(text), SEARCH_DEBOUNCE_MS);
  });
}
