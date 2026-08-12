/**
 * services/ai/client.js — Cliente de Anthropic, construido perezosamente.
 *
 * A propósito NO se instancia al importar el módulo: si lo hiciéramos, el
 * servidor entero fallaría al arrancar cuando ANTHROPIC_API_KEY no está
 * configurada (el SDK lanza un error apenas se construye sin apiKey), aunque
 * nadie haya intentado usar la función de subir plan todavía. En vez de eso,
 * el cliente se crea la primera vez que hace falta, y si la clave falta en
 * ese momento, se explica con un error claro (ver extractPlan.js).
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/env.js';

let client = null;

export function getAnthropicClient() {
  if (!config.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}
