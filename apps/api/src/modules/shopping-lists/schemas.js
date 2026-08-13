import { z } from 'zod';

export const planIdParamsSchema = z.object({
  planId: z.string().uuid(),
});

export const shoppingListIdParamsSchema = z.object({
  id: z.string().uuid(),
});
