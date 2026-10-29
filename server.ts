import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mikrotikRouter } from './src/server/mikrotikRoutes';
import { RouterStore } from './src/server/routerStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize router store & ensure directories exist
  RouterStore.initialize();

  // Middleware
  app.use(express.json());

  // Mount MikroTik API
  app.use('/api/mikrotik', mikrotikRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TAMIM SUPER NET Backend & MikroTik Gateway',
      mikrotikIntegration: 'active',
      timestamp: new Date().toISOString(),
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 TAMIM SUPER NET Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
