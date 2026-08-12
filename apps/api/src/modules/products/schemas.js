import { z } from 'zod';

export const searchProductsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});
