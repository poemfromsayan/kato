/**
 * scripts/seed.js — Carga datos de prueba (ficticios, no scrapeados) para
 * poder ver el comparador y el dashboard funcionando en local.
 *
 * IMPORTANTE: estos precios y tiendas son inventados a mano, solo para
 * desarrollo/demo. El día que el scraper real esté funcionando, esos datos
 * van a reemplazar a estos (misma forma de tabla, otro origen). No usar
 * este script contra una base de producción.
 *
 * Idempotente por las buenas: si ya hay tiendas cargadas, no hace nada (no
 * intenta "limpiar" la base primero) — así nunca se lleva por delante datos
 * reales de usuarios (planes subidos, etc.) por accidente.
 *
 * Uso: npm run seed
 */

import pg from 'pg';
import { config } from '../src/config/env.js';

const { Client } = pg;

// ------------------------------- Datos -------------------------------

const STORES = [
  { slug: 'automercado', name: 'Automercado', website_url: 'https://www.automercado.cr' },
  { slug: 'maxipali', name: 'MaxiPalí', website_url: 'https://www.maxipali.co.cr' },
  { slug: 'walmart-cr', name: 'Walmart', website_url: 'https://www.walmart.co.cr' },
  { slug: 'mas-x-menos', name: 'Más x Menos', website_url: 'https://www.masxmenos.cr' },
  { slug: 'pricesmart-cr', name: 'PriceSmart', website_url: 'https://www.pricesmart.com/es-cr' },
];

const CATEGORIES = [
  { slug: 'lacteos', name: 'Lácteos' },
  { slug: 'granos-cereales', name: 'Granos y cereales' },
  { slug: 'carnes-pescados', name: 'Carnes y pescados' },
  { slug: 'frutas-verduras', name: 'Frutas y verduras' },
  { slug: 'panaderia', name: 'Panadería' },
  { slug: 'bebidas', name: 'Bebidas' },
  { slug: 'despensa', name: 'Despensa' },
];

// nutrition: por 100g/100ml salvo que se indique otra serving_size
const PRODUCTS = [
  {
    // Fuente real: INCAP, entrada "ARROZ BLANCO, PULIDO, ENRIQUECIDO" (código
    // 13002) — arroz crudo tal como se vende en el paquete de 1kg.
    name: 'Arroz blanco', brand: 'Tío Pelón', category: 'granos-cereales', unit: 'kg', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 360, protein_g: 6.61, carbs_g: 79.34, fat_g: 0.58,
      fiber_g: 1.40, sugar_g: 0, sodium_mg: 1, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1250, maxipali: 1080, 'walmart-cr': 1120, 'mas-x-menos': 1150, 'pricesmart-cr': null },
  },
  {
    // Corrección importante: el valor anterior (341kcal) era el de frijol
    // negro CRUDO/SECO, no el de un producto ENLATADO — un error de ~4x que
    // hacía ver el producto como mucho más calórico de lo real. INCAP no
    // tiene una entrada de "frijol negro, cocido/enlatado, simple" (solo
    // crudo, o cocido con cerdo y tomate), así que se usa un producto
    // enlatado real de referencia (marca S&W, dato de usuario verificado por
    // UPC en MyFoodData) — no es Del Monte específicamente, pero es
    // representativo de un frijol negro enlatado comercial simple.
    name: 'Frijoles negros', brand: 'Del Monte', category: 'granos-cereales', unit: 'g', unit_size: 900,
    nutrition: {
      serving_size: '100g', calories: 85, protein_g: 5.4, carbs_g: 16.2, fat_g: 0,
      fiber_g: 7.7, sugar_g: 0.8, sodium_mg: 65, source: 'manual',
      source_url: 'https://tools.myfooddata.com/nutrition-facts/100126657/wt1',
    },
    prices: { automercado: 1450, maxipali: 1290, 'walmart-cr': 1310, 'mas-x-menos': null, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, "Tabla de Composición de Alimentos para Centroamérica",
    // 2da ed., entrada "LECHE DE VACA, INTEGRA, FLUIDA (3.25% GRASA)". sugar_g se
    // aproxima a carbs_g porque en leche fluida el carbohidrato es casi
    // exclusivamente lactosa (INCAP no reporta azúcares por separado).
    name: 'Leche entera', brand: 'Dos Pinos', category: 'lacteos', unit: 'l', unit_size: 1,
    nutrition: {
      serving_size: '100ml', calories: 60, protein_g: 3.22, carbs_g: 4.52, fat_g: 3.25,
      fiber_g: 0, sugar_g: 4.52, sodium_mg: 40, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 995, maxipali: 890, 'walmart-cr': 910, 'mas-x-menos': 930, 'pricesmart-cr': 850 },
  },
  {
    // Fuente real: USDA FoodData Central, fdcId 2646170 "Chicken, breast,
    // boneless, skinless, raw". Se usa el valor crudo (no cocido) porque el
    // producto de supermercado se vende crudo — el valor "165 kcal / 31g
    // proteína" que circula mucho en internet corresponde a pollo YA COCIDO,
    // no es comparable aquí.
    name: 'Pechuga de pollo', brand: 'Pipasa', category: 'carnes-pescados', unit: 'kg', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 106, protein_g: 22.5, carbs_g: 0, fat_g: 1.93,
      fiber_g: 0, sugar_g: 0, sodium_mg: 65.8, source: 'manual',
      source_url: 'https://fdc.nal.usda.gov/food-details/2646170/nutrients',
    },
    prices: { automercado: 3200, maxipali: 2890, 'walmart-cr': 2950, 'mas-x-menos': 3050, 'pricesmart-cr': 2750 },
  },
  {
    // Fuente real: INCAP, entrada "HUEVO DE GALLINA, ENTERO, CRUDO" (código
    // 2002) — huevo crudo, no cocido.
    name: 'Huevos (docena)', brand: 'Yema Dorada', category: 'lacteos', unit: 'unidad', unit_size: 12,
    nutrition: {
      serving_size: '100g', calories: 147, protein_g: 12.58, carbs_g: 0.77, fat_g: 9.94,
      fiber_g: 0, sugar_g: 0, sodium_mg: 140, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1890, maxipali: 1650, 'walmart-cr': 1720, 'mas-x-menos': 1780, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "PAN BLANCO, DE RODAJA O CUADRADO, SUAVE"
    // (código 14021) — pan de molde tipo sándwich, no tostado.
    name: 'Pan blanco', brand: 'Bimbo', category: 'panaderia', unit: 'g', unit_size: 600,
    nutrition: {
      serving_size: '100g', calories: 266, protein_g: 7.64, carbs_g: 50.61, fat_g: 3.29,
      fiber_g: 2.40, sugar_g: 5, sodium_mg: 681, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1590, maxipali: 1420, 'walmart-cr': 1450, 'mas-x-menos': null, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "ACEITE VEGETAL, DE SOYA" (código 16009) —
    // aceite de soya es el tipo más común de "aceite vegetal" genérico
    // vendido en Costa Rica (marca Cocinero incluida).
    name: 'Aceite vegetal', brand: 'Cocinero', category: 'despensa', unit: 'ml', unit_size: 900,
    nutrition: {
      serving_size: '100ml', calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100,
      fiber_g: 0, sugar_g: 0, sodium_mg: 0, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1990, maxipali: 1750, 'walmart-cr': 1810, 'mas-x-menos': 1850, 'pricesmart-cr': 1690 },
  },
  {
    // Fuente real: USDA FoodData Central, fdcId 169655 "Sugars, granulated"
    // — confirma que el valor que ya teníamos estimado era correcto.
    name: 'Azúcar blanca', brand: 'CATSA', category: 'despensa', unit: 'kg', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 387, protein_g: 0, carbs_g: 100, fat_g: 0,
      fiber_g: 0, sugar_g: 100, sodium_mg: 1, source: 'manual',
      source_url: 'https://fdc.nal.usda.gov/food-details/169655/nutrients',
    },
    prices: { automercado: 750, maxipali: 640, 'walmart-cr': 670, 'mas-x-menos': 690, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "TOMATE ROJO" (código 11157).
    name: 'Tomate', brand: null, category: 'frutas-verduras', unit: 'kg', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 21, protein_g: 0.80, carbs_g: 4.60, fat_g: 0.30,
      fiber_g: 1.20, sugar_g: 2.6, sodium_mg: 5, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 990, maxipali: 780, 'walmart-cr': 820, 'mas-x-menos': 850, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "BANANO/GUINEO, MADURO" (código 12010).
    name: 'Banano', brand: null, category: 'frutas-verduras', unit: 'kg', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 89, protein_g: 1.09, carbs_g: 22.84, fat_g: 0.33,
      fiber_g: 2.60, sugar_g: 12.2, sodium_mg: 1, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 590, maxipali: 480, 'walmart-cr': 510, 'mas-x-menos': 520, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "PESCADO CARNE, ATÚN ENLATADO C/AGUA,
    // SÓLIDOS" (código 8020).
    name: 'Atún en agua', brand: 'Sardimar', category: 'carnes-pescados', unit: 'g', unit_size: 170,
    nutrition: {
      serving_size: '100g', calories: 128, protein_g: 23.62, carbs_g: 0, fat_g: 2.97,
      fiber_g: 0, sugar_g: 0, sodium_mg: 377, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 990, maxipali: 870, 'walmart-cr': 900, 'mas-x-menos': 920, 'pricesmart-cr': 830 },
  },
  {
    // Fuente real: INCAP, entrada "QUESO BLANCO FRESCO, LECHE INTEGRA".
    // El sodio real (420mg) es notablemente menor al que teníamos estimado
    // (621mg) — corregido.
    name: 'Queso fresco', brand: 'Dos Pinos', category: 'lacteos', unit: 'g', unit_size: 250,
    nutrition: {
      serving_size: '100g', calories: 264, protein_g: 17.5, carbs_g: 3.3, fat_g: 20.1,
      fiber_g: 0, sugar_g: 3.3, sodium_mg: 420, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 2190, maxipali: 1950, 'walmart-cr': 2010, 'mas-x-menos': null, 'pricesmart-cr': null },
  },
  {
    // Fuente real: INCAP, entrada "YOGURT, LECHE ÍNTEGRA, NATURAL" (código
    // 1041) — yogur natural con leche entera, no descremado.
    name: 'Yogurt natural', brand: 'Dos Pinos', category: 'lacteos', unit: 'l', unit_size: 1,
    nutrition: {
      serving_size: '100g', calories: 61, protein_g: 3.47, carbs_g: 4.66, fat_g: 3.25,
      fiber_g: 0, sugar_g: 4.7, sodium_mg: 46, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1790, maxipali: 1590, 'walmart-cr': 1650, 'mas-x-menos': 1690, 'pricesmart-cr': 1520 },
  },
  {
    // Fuente real: INCAP, entrada "CAFÉ TOSTADO MOLIDO, PREPARADO C/AGUA
    // S/AZÚCAR" (código 17040). Se usa el valor de café YA PREPARADO
    // (colado/bebida), no del polvo seco — es lo que efectivamente se
    // consume por porción, igual que ya asumía el estimado anterior.
    name: 'Café molido', brand: 'Café Rey', category: 'bebidas', unit: 'g', unit_size: 400,
    nutrition: {
      serving_size: '100g', calories: 1, protein_g: 0.12, carbs_g: 0, fat_g: 0.02,
      fiber_g: 0, sugar_g: 0, sodium_mg: 2, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 2890, maxipali: 2590, 'walmart-cr': 2650, 'mas-x-menos': 2750, 'pricesmart-cr': 2450 },
  },
  {
    // Fuente real: INCAP, entrada "AVENA EN HOJUELAS S/FORTIFICAR (MOSH)"
    // (código 13008) — avena en hojuelas cruda/seca, tal como se vende.
    name: 'Avena en hojuelas', brand: 'Quaker', category: 'granos-cereales', unit: 'g', unit_size: 500,
    nutrition: {
      serving_size: '100g', calories: 389, protein_g: 16.89, carbs_g: 66.27, fat_g: 6.90,
      fiber_g: 10.60, sugar_g: 1, sodium_mg: 2, source: 'manual',
      source_url: 'https://archive.org/details/TablaDeComposicionDeAlimentosParaCentroamericaDelINCAP',
    },
    prices: { automercado: 1990, maxipali: 1750, 'walmart-cr': 1820, 'mas-x-menos': null, 'pricesmart-cr': 1690 },
  },
];

// ------------------------------- Carga -------------------------------

async function main() {
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.isProduction ? { rejectUnauthorized: true } : false,
  });
  await client.connect();

  try {
    const { rows: existing } = await client.query('SELECT COUNT(*)::int AS n FROM stores');
    if (existing[0].n > 0) {
      console.log(
        `Ya hay ${existing[0].n} tienda(s) en la base — no se vuelve a sembrar (este script no borra datos existentes).`
      );
      console.log('Si querés empezar de cero, vaciá las tablas de catálogo manualmente y volvé a correr "npm run seed".');
      return;
    }

    await client.query('BEGIN');

    const storeIdBySlug = {};
    for (const store of STORES) {
      const { rows } = await client.query(
        `INSERT INTO stores (slug, name, website_url) VALUES ($1, $2, $3) RETURNING id`,
        [store.slug, store.name, store.website_url]
      );
      storeIdBySlug[store.slug] = rows[0].id;
    }
    console.log(`✓ ${STORES.length} tiendas`);

    const categoryIdBySlug = {};
    for (const category of CATEGORIES) {
      const { rows } = await client.query(
        `INSERT INTO categories (slug, name) VALUES ($1, $2) RETURNING id`,
        [category.slug, category.name]
      );
      categoryIdBySlug[category.slug] = rows[0].id;
    }
    console.log(`✓ ${CATEGORIES.length} categorías`);

    let storeProductCount = 0;
    let priceSnapshotCount = 0;

    for (const product of PRODUCTS) {
      const { rows: productRows } = await client.query(
        `INSERT INTO products (name, brand, category_id, unit, unit_size)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [product.name, product.brand, categoryIdBySlug[product.category], product.unit, product.unit_size]
      );
      const productId = productRows[0].id;

      const n = product.nutrition;
      // Productos sin `source`/`source_url` explícitos son estimaciones a mano,
      // no verificadas contra ninguna tabla oficial — quedan marcadas 'estimated'
      // (ver docs/DATA_MODEL.md). Los que sí fueron sourceados (INCAP/USDA
      // FoodData Central) traen su propio 'manual' + source_url, ver comentarios
      // arriba en cada producto.
      await client.query(
        `INSERT INTO nutrition_facts
           (product_id, serving_size, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          productId, n.serving_size, n.calories, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, n.sodium_mg,
          n.source || 'estimated', n.source_url || null,
        ]
      );

      for (const [storeSlug, price] of Object.entries(product.prices)) {
        if (price === null) continue; // esta tienda no vende este producto

        const storeSku = `${storeSlug}-${productId.slice(0, 8)}`;
        const productUrl = `https://example-${storeSlug}.cr/producto/${productId}`;

        const { rows: spRows } = await client.query(
          `INSERT INTO store_products (store_id, product_id, store_sku, product_url, last_scraped_at)
           VALUES ($1, $2, $3, $4, now()) RETURNING id`,
          [storeIdBySlug[storeSlug], productId, storeSku, productUrl]
        );
        storeProductCount += 1;

        await client.query(
          `INSERT INTO price_snapshots (store_product_id, price, currency, in_stock)
           VALUES ($1, $2, 'CRC', true)`,
          [spRows[0].id, price]
        );
        priceSnapshotCount += 1;
      }
    }
    console.log(`✓ ${PRODUCTS.length} productos (con nutrition_facts)`);
    console.log(`✓ ${storeProductCount} store_products`);
    console.log(`✓ ${priceSnapshotCount} price_snapshots`);

    await client.query('COMMIT');
    console.log('\nListo. Datos de prueba cargados — recordá que son ficticios, no reales.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falló el seed:', err);
  process.exit(1);
});
