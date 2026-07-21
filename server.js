// petshop-live — tiny Express server: static storefront + fresh-read JSON catalog API.
import express from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

export function createApp(catalogPath = process.env.CATALOG_PATH || path.join(__dirname, 'catalog.json')) {
  const app = express();
  app.disable('x-powered-by');

  // The catalog is read from disk on every request: editing catalog.json is
  // visible on the next refresh, no restart, no cache to bust.
  const readCatalog = () => JSON.parse(readFileSync(catalogPath, 'utf8'));

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/catalog', (req, res) => {
    const { store, products } = readCatalog();
    res.json({ store, products });
  });

  app.get('/api/catalog/:id', (req, res) => {
    const { store, products } = readCatalog();
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'no such product' });
    res.json({ store, product });
  });

  app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'product.html'));
  });

  app.get('/health', (req, res) => {
    const { store, products } = readCatalog();
    res.json({ ok: true, store: store.name, products: products.length });
  });

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 4174);
  const host = process.env.HOST || '0.0.0.0';
  createApp().listen(port, host, () => {
    console.log(`petshop-live serving on http://${host}:${port}`);
  });
}
