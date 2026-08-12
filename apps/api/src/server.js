import { app } from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(`Katö API escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
});

// Apagado ordenado: dejar de aceptar conexiones nuevas y esperar a que
// terminen las peticiones en curso antes de salir.
function shutdown(signal) {
  console.log(`\n${signal} recibido, cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
