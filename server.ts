import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { initDatabase } from './server/db.js';
import { apiRouter } from './server/api.js';

async function startServer() {
  // Initialize database schema and default tables
  initDatabase();

  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS and LAN header allowance
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health and ping endpoint for local LAN discovery
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Hostel Namaz Attendance System', offline: true });
  });

  // Mount API endpoints under /api
  app.use('/api', apiRouter);

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Hostel Namaz Attendance System] Server running locally and on LAN at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Hostel Namaz System] Server startup error:', err);
  process.exit(1);
});
