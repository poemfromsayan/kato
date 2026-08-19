import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

// Mismo motivo que en extractPlan.test.js: config.js valida env vars al
// cargarse, así que le damos valores falsos suficientes para pasar sin
// tocar ningún servicio real.
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'x'.repeat(32);
process.env.ANTHROPIC_API_KEY ??= 'test-key';

const { extractProductScan } = await import('../src/services/ai/extractProductScan.js');

function fakeClient(toolInput) {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'tool_use', name: 'extract_product_scan', input: toolInput }],
      }),
    },
  };
}

const validNutrition = {
  servingSize: '100g',
  calories: 250,
  proteinG: 5,
  carbsG: 30,
  fatG: 10,
  fiberG: 2,
  sugarG: 8,
  sodiumMg: 400,
};

describe('extractProductScan', () => {
  test('devuelve los datos cuando la respuesta cumple el schema (con foto de tabla nutricional)', async () => {
    const client = fakeClient({
      productName: 'Galletas María',
      brand: 'Marca X',
      categoryGuess: 'snacks',
      unit: 'g',
      unitSize: 200,
      nutrition: validNutrition,
    });

    const result = await extractProductScan(
      { packageImage: Buffer.from('foto-falsa'), packageImageMediaType: 'image/jpeg' },
      client
    );

    assert.equal(result.productName, 'Galletas María');
    assert.equal(result.nutrition.calories, 250);
  });

  test('acepta que nutrition venga toda en null (sin foto de tabla nutricional)', async () => {
    const client = fakeClient({
      productName: 'Producto sin tabla legible',
      brand: null,
      categoryGuess: null,
      unit: null,
      unitSize: null,
      nutrition: {
        servingSize: null,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        fiberG: null,
        sugarG: null,
        sodiumMg: null,
      },
    });

    const result = await extractProductScan(
      { packageImage: Buffer.from('foto-falsa'), packageImageMediaType: 'image/jpeg' },
      client
    );

    assert.equal(result.productName, 'Producto sin tabla legible');
    assert.equal(result.nutrition.calories, null);
  });

  test('rechaza una respuesta que no cumple el schema (ej. falta un campo de nutrition)', async () => {
    const client = fakeClient({
      productName: 'Producto incompleto',
      brand: null,
      categoryGuess: null,
      unit: null,
      unitSize: null,
      nutrition: { servingSize: null, calories: null }, // faltan proteinG, carbsG, etc.
    });

    await assert.rejects(
      () =>
        extractProductScan(
          { packageImage: Buffer.from('foto-falsa'), packageImageMediaType: 'image/jpeg' },
          client
        ),
      (err) => err.statusCode === 502
    );
  });

  test('rechaza si el modelo no llama a la tool esperada', async () => {
    const client = {
      messages: {
        create: async () => ({ content: [{ type: 'text', text: 'no debería pasar esto' }] }),
      },
    };

    await assert.rejects(
      () =>
        extractProductScan(
          { packageImage: Buffer.from('foto-falsa'), packageImageMediaType: 'image/jpeg' },
          client
        ),
      (err) => err.statusCode === 502
    );
  });

  test('tira 503 si no hay client configurado (sin ANTHROPIC_API_KEY real)', async () => {
    await assert.rejects(
      () =>
        extractProductScan(
          { packageImage: Buffer.from('foto-falsa'), packageImageMediaType: 'image/jpeg' },
          null
        ),
      (err) => err.statusCode === 503
    );
  });
});
