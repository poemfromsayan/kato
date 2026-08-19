import { z } from 'zod';

export const scanIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const scanImageParamsSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['package', 'nutrition']),
});

export const listScansQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const nutritionInputSchema = z.object({
  servingSize: z.string().min(1).max(40).nullable(),
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  fiberG: z.number().nonnegative().nullable(),
  sugarG: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
});

// El admin manda los valores FINALES (puede haber corregido lo que Claude
// extrajo) — por eso name/unit/unitSize son obligatorios acá aunque en la
// extracción original pudieran venir en null.
export const approveScanSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  unit: z.string().trim().min(1).max(20),
  unitSize: z.number().positive(),
  nutrition: nutritionInputSchema,
});

export const rejectScanSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
