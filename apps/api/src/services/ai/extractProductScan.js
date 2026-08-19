/**
 * services/ai/extractProductScan.js — Lee foto(s) de un producto (empaque
 * y, opcionalmente, su tabla nutricional) y devuelve datos estructurados.
 *
 * Mismo criterio que extractPlan.js: Claude solo CONVIERTE una imagen no
 * estructurada en estructura (nombre, marca, nutrición) — nunca decide si
 * ese producto ya existe en el catálogo (eso lo resuelve nuestro código por
 * similaridad de texto) ni se guarda como dato oficial (queda en
 * product_scans, pendiente de revisión — ver migrations/0002_product_scans.sql).
 */

import { z } from 'zod';
import { getAnthropicClient } from './client.js';
import { ApiError } from '../../middleware/errorHandler.js';

const MODEL = 'claude-haiku-4-5-20251001'; // tarea de extracción, no necesita un modelo grande

const nutritionSchema = z.object({
  servingSize: z.string().max(40).nullable(),
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  fiberG: z.number().nonnegative().nullable(),
  sugarG: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
});

const extractionResultSchema = z.object({
  productName: z.string().min(1).max(200).nullable(),
  brand: z.string().max(120).nullable(),
  categoryGuess: z.string().max(80).nullable(),
  unit: z.string().max(20).nullable(),
  unitSize: z.number().positive().nullable(),
  nutrition: nutritionSchema,
});

const EXTRACT_TOOL = {
  name: 'extract_product_scan',
  description: 'Registra los datos del producto y su tabla nutricional a partir de las fotos.',
  input_schema: {
    type: 'object',
    properties: {
      productName: { type: ['string', 'null'], description: 'Nombre del producto tal como aparece en el empaque.' },
      brand: { type: ['string', 'null'], description: 'Marca, o null si no es visible.' },
      categoryGuess: {
        type: ['string', 'null'],
        description: "Categoría aproximada en español (ej. 'lácteos', 'snacks', 'bebidas'), o null si no es obvia. Es solo una sugerencia, no tiene que coincidir con ninguna lista fija.",
      },
      unit: { type: ['string', 'null'], description: "Unidad de venta, ej. 'kg', 'g', 'ml', 'l', 'unidad'. Null si no es visible." },
      unitSize: { type: ['number', 'null'], description: 'Tamaño numérico de la presentación (ej. 1 para "1kg"). Null si no es visible.' },
      nutrition: {
        type: 'object',
        description: 'Datos de la tabla nutricional, SOLO si hay una foto de la tabla y es legible. Si no, todos los campos en null.',
        properties: {
          servingSize: { type: ['string', 'null'], description: "Tamaño de porción tal como aparece, ej. '100g'." },
          calories: { type: ['number', 'null'] },
          proteinG: { type: ['number', 'null'] },
          carbsG: { type: ['number', 'null'] },
          fatG: { type: ['number', 'null'] },
          fiberG: { type: ['number', 'null'] },
          sugarG: { type: ['number', 'null'] },
          sodiumMg: { type: ['number', 'null'] },
        },
        required: ['servingSize', 'calories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sugarG', 'sodiumMg'],
      },
    },
    required: ['productName', 'brand', 'categoryGuess', 'unit', 'unitSize', 'nutrition'],
  },
};

const SYSTEM_PROMPT = `Eres un extractor de datos, no un experto en nutrición ni en catalogación de productos.

Tu única tarea es mirar la(s) foto(s) adjunta(s) de un producto (empaque y, si se incluye, su tabla de información nutricional) y llamar a la herramienta "extract_product_scan" con lo que puedas leer.

Reglas estrictas:
- Extrae únicamente lo que es visible y legible en la foto. Si un dato no se ve con claridad, ese campo va en null — NUNCA completes con un valor típico o "razonable" que no esté realmente en la imagen.
- Si no hay foto de la tabla nutricional, o está borrosa/ilegible, todos los campos de "nutrition" van en null.
- No agregues comentarios ni texto fuera de la llamada a la herramienta.`;

/**
 * @param {{ packageImage: Buffer, packageImageMediaType: string, nutritionImage?: Buffer, nutritionImageMediaType?: string }} images
 * @param {{ messages: { create: Function } }} [client] inyectable para tests
 */
export async function extractProductScan(
  { packageImage, packageImageMediaType, nutritionImage, nutritionImageMediaType },
  client = getAnthropicClient()
) {
  if (!client) {
    throw new ApiError(
      503,
      'El escaneo de productos todavía no está configurado (falta ANTHROPIC_API_KEY en apps/api/.env).'
    );
  }

  const content = [
    {
      type: 'image',
      source: { type: 'base64', media_type: packageImageMediaType, data: packageImage.toString('base64') },
    },
  ];

  if (nutritionImage) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: nutritionImageMediaType, data: nutritionImage.toString('base64') },
    });
  }

  content.push({
    type: 'text',
    text: nutritionImage
      ? 'La primera imagen es el empaque del producto. La segunda es su tabla de información nutricional. Extraé los datos de ambas.'
      : 'Esta imagen es el empaque de un producto. Extraé lo que puedas leer (no hay foto de tabla nutricional, esos campos van en null).',
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: EXTRACT_TOOL.name },
    messages: [{ role: 'user', content }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');

  if (!toolUse) {
    throw new ApiError(502, 'El modelo no devolvió una extracción estructurada. Intenta de nuevo.');
  }

  const parsed = extractionResultSchema.safeParse(toolUse.input);

  if (!parsed.success) {
    throw new ApiError(502, 'La extracción del escaneo no tuvo el formato esperado.', parsed.error.issues);
  }

  return parsed.data;
}
