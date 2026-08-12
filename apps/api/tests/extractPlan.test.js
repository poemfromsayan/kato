import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

// extractPlan.js importa config.js, que valida env vars al cargarse — le
// damos valores falsos suficientes para pasar la validación sin tocar
// ningún servicio real.
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'x'.repeat(32);
process.env.ANTHROPIC_API_KEY ??= 'test-key';

const { extractPlanFromPdf } = await import('../src/services/ai/extractPlan.js');

function fakeClient(toolInput) {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'tool_use', name: 'extract_nutrition_plan', input: toolInput }],
      }),
    },
  };
}

describe('extractPlanFromPdf', () => {
  test('devuelve los items cuando la respuesta cumple el schema', async () => {
    const client = fakeClient({
      items: [
        {
          foodName: 'Pechuga de pollo',
          quantity: 150,
          unit: 'g',
          frequency: 'diario',
          priceRangeMin: null,
          priceRangeMax: null,
        },
      ],
    });

    const result = await extractPlanFromPdf(Buffer.from('pdf-falso'), client);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].foodName, 'Pechuga de pollo');
  });

  test('rechaza una respuesta que no cumple el schema (ej. foodName vacío)', async () => {
    const client = fakeClient({
      items: [{ foodName: '', quantity: null, unit: null, frequency: null, priceRangeMin: null, priceRangeMax: null }],
    });

    await assert.rejects(
      () => extractPlanFromPdf(Buffer.from('pdf-falso'), client),
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
      () => extractPlanFromPdf(Buffer.from('pdf-falso'), client),
      (err) => err.statusCode === 502
    );
  });
});
