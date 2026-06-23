import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const CLIENT_DIST = fileURLToPath(new URL('../../../web/dist/', import.meta.url));

/**
 * Serves the built client from the API process, so a deployment is one command
 * and one port. Does nothing if the client has not been built — in development
 * Vite serves it and proxies here instead.
 *
 * @returns {import('express').RequestHandler|null}
 */
export function serveClient() {
  if (!existsSync(join(CLIENT_DIST, 'index.html'))) return null;

  // Hashed asset filenames are immutable, so they can be cached hard. index.html
  // is the one file that must always be revalidated, or a deploy ships new
  // assets to browsers still holding the old document that references the old ones.
  const assets = express.static(CLIENT_DIST, {
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders(res, path) {
      if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  });

  return (req, res, next) => {
    // The API owns /api; everything else is the client's to route.
    if (req.path.startsWith('/api/')) return next();

    assets(req, res, (err) => {
      if (err) return next(err);
      // A deep link like /transactions is not a file — hand it the SPA shell
      // and let the router work out what to render.
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(join(CLIENT_DIST, 'index.html'));
    });
  };
}
