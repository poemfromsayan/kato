/**
 * services/ai/extractPlan.js — El único punto del sistema donde Claude toca
 * un plan nutricional.
 *
 * Alcance deliberadamente angosto (ver docs/DATA_MODEL.md): el modelo SOLO
 * convierte un PDF no estructurado en una lista de alimentos/cantidades.
 * No decide tiendas, no decide precios reales — eso lo resuelve después
 * nuestro propio código con datos de price_snapshots.
 *
 * Usamos "tool use" forzado (tool_choice) en vez de pedirle al modelo que
 * "responda en JSON" en prosa: así la forma de la respuesta está garantizada
 * por el schema de la tool, no por instrucciones de prompt que el modelo
 * podría no seguir al pie de la letra. Aun así, revalidamos con zod antes de
 * tocar la base de datos — nunca confiamos en la salida de un LLM a ciegas.
 */

import { z } from 'zod';
import { getAnthropicClient } from './client.js';
import { ApiError } from '../../middleware/errorHandler.js';

const MODEL = 'claude-haiku-4-5-20251001'; // tarea de extracción, no necesita un modelo grande

const planItemSchema = z.object({
  foodName: z.string().min(1).max(200),
  quantity: z.number().positive().nullable(),
  unit: z.string().max(40).nullable(),
  frequency: z.string().max(80).nullable(),
  // Estimación del propio modelo a partir del texto del plan (si lo menciona).
  // NO es un precio real de mercado — eso vive aparte, en price_snapshots.
  priceRangeMin: z.number().nonnegative().nullable(),
  priceRangeMax: z.number().nonnegative().nullable(),
});

const extractionResultSchema = z.object({
  items: z.array(planItemSchema).max(200),
});

const EXTRACT_TOOL = {
  name: 'extract_nutrition_plan',
  description:
    'Registra la lista estructurada de alimentos encontrados en el plan nutricional.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            foodName: { type: 'string', description: 'Nombre del alimento tal como aparece en el plan.' },
            quantity: { type: ['number', 'null'], description: 'Cantidad numérica, o null si no se especifica.' },
            unit: { type: ['string', 'null'], description: "Unidad, ej. 'g', 'ml', 'porciones', o null." },
            frequency: { type: ['string', 'null'], description: "Ej. 'diario', '3 veces por semana', o null." },
            priceRangeMin: { type: ['number', 'null'], description: 'Estimación mínima orientativa, solo si el documento la sugiere.' },
            priceRangeMax: { type: ['number', 'null'], description: 'Estimación máxima orientativa, solo si el documento la sugiere.' },
          },
          required: ['foodName', 'quantity', 'unit', 'frequency', 'priceRangeMin', 'priceRangeMax'],
        },
      },
    },
    required: ['items'],
  },
};

const SYSTEM_PROMPT = `Eres un extractor de datos, no un asesor nutricional ni de precios.

Tu única tarea es leer el plan nutricional adjunto y llamar a la herramienta
"extract_nutrition_plan" con la lista de alimentos que encuentres.

Reglas estrictas:
- Extrae únicamente lo que el documento dice explícitamente. No inventes alimentos, cantidades ni frecuencias que no estén en el texto.
- Los campos de precio (priceRangeMin/priceRangeMax) solo se llenan si el documento menciona un precio o presupuesto explícito. Si no lo menciona, ambos van en null — NUNCA estimes un precio de mercado por tu cuenta, no tienes esa información confiable.
- No agregues comentarios, recomendaciones ni texto fuera de la llamada a la herramienta.`;

/**
 * @param {Buffer} pdfBuffer
 * @param {{ messages: { create: Function } }} [client] inyectable para tests (default: cliente real de Anthropic)
 * @returns {Promise<{ items: Array<z.infer<typeof planItemSchema>> }>}
 */
export async function extractPlanFromPdf(pdfBuffer, client = getAnthropicClient()) {
  if (!client) {
    throw new ApiError(
      503,
      'La subida de planes nutricionales todavía no está configurada (falta ANTHROPIC_API_KEY en apps/api/.env).'
    );
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: EXTRACT_TOOL.name },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Extrae la lista estructurada de alimentos de este plan nutricional.',
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');

  if (!toolUse) {
    throw new ApiError(502, 'El modelo no devolvió una extracción estructurada. Intenta de nuevo.');
  }

  const parsed = extractionResultSchema.safeParse(toolUse.input);

  if (!parsed.success) {
    // La respuesta del modelo no cumplió el schema esperado: mejor fallar
    // explícitamente que guardar datos a medio validar.
    throw new ApiError(502, 'La extracción del plan no tuvo el formato esperado.', parsed.error.issues);
  }

  return parsed.data;
}
