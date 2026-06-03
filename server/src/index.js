import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Rs API listening on http://localhost:${config.port} (${config.env})`);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[shutdown] ${signal} received, draining connections`);

  // If a request hangs, don't let the process linger forever.
  const forceExit = setTimeout(() => {
    console.error('[shutdown] connections did not drain in 10s, forcing exit');
    process.exit(1);
  }, 10_000).unref();

  server.close((err) => {
    clearTimeout(forceExit);
    if (err) {
      console.error('[shutdown] server did not close cleanly', err);
      process.exit(1);
    }
    console.log('[shutdown] done');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
