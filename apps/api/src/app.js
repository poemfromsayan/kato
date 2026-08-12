/**
 * app.js — Configuración de la app Express: seguridad, parsing, rutas,
 * manejo de errores. Separado de server.js para poder importar `app` en
 * tests sin tener que levantar un puerto real.
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Detrás de un proxy/load balancer (Railway, Render, etc.) para que
// express-rate-limit vea la IP real del cliente en vez de la del proxy.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

if (!config.isProduction) {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
