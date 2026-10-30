/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import fs from 'node:fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mountStaticDist(app: express.Express) {
  const distPath = path.join(__dirname, 'dist');
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
  }
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
  }
  app.use((_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const distIndex = path.join(distPath, 'index.html');
    if (fs.existsSync(distIndex)) {
      res.sendFile(distIndex);
    } else {
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Dev SPA route fallback for any navigation requests
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api/')) return next();
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
            return;
          }
          next();
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (err) {
      console.warn('Vite dev server unavailable, falling back to static build:', err);
      mountStaticDist(app);
    }
  } else {
    mountStaticDist(app);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KaloriKu server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
