import { z } from 'zod';

// Mínimo 10 caracteres: preferimos frases largas por encima de reglas de
// complejidad artificiales (mayúscula+número+símbolo), siguiendo la
// recomendación actual de NIST 800-63B sobre longitud vs. complejidad.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

// Todos los campos opcionales (PATCH parcial), pero si viene el objeto,
// que tenga al menos un campo — si no, no hay nada que actualizar.
export const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    priceQualityPreference: z.enum(['price', 'quality', 'balance']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Enviá al menos un campo para actualizar',
  });
