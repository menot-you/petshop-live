import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const listen = (app) =>
  new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

const base = (srv) => `http://127.0.0.1:${srv.address().port}`;

test('serves the storefront, the API, product pages, and images', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const home = await fetch(`${base(srv)}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /petshop/);

  const res = await fetch(`${base(srv)}/api/catalog`);
  assert.equal(res.status, 200);
  const { store, products } = await res.json();
  assert.equal(store.name, 'petshop-live');
  assert.equal(products.length, 6);

  for (const p of products) {
    const item = await fetch(`${base(srv)}/api/catalog/${p.id}`);
    assert.equal(item.status, 200, `${p.id}: api`);
    const page = await fetch(`${base(srv)}/product/${p.id}`);
    assert.equal(page.status, 200, `${p.id}: page`);
    const img = await fetch(`${base(srv)}${p.image}`);
    assert.equal(img.status, 200, `${p.id}: image`);
  }
});

test('unknown product answers 404', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());
  const res = await fetch(`${base(srv)}/api/catalog/does-not-exist`);
  assert.equal(res.status, 404);
});

test('faq page is served with all four topics, no scripts, no images', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const res = await fetch(`${base(srv)}/faq.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  for (const topic of ['shipping', 'returns', 'opening hours', 'food advice']) {
    assert.match(html, new RegExp(topic), `faq covers ${topic}`);
  }
  assert.doesNotMatch(html, /<script/, 'faq stays JS-free');
  assert.doesNotMatch(html, /<img/, 'faq stays image-free');

  const home = await (await fetch(`${base(srv)}/`)).text();
  assert.match(home, /href="\/faq\.html"/, 'store nav links to the faq');
});

test('testimonials page is served with three quotes, no scripts, no images', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const res = await fetch(`${base(srv)}/testimonials.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal((html.match(/<blockquote>/g) ?? []).length, 3, 'exactly three quotes');
  assert.equal((html.match(/<figcaption>/g) ?? []).length, 3, 'every quote carries a name');
  assert.doesNotMatch(html, /<script/, 'testimonials stay JS-free');
  assert.doesNotMatch(html, /<img/, 'testimonials stay image-free');

  const home = await (await fetch(`${base(srv)}/`)).text();
  assert.match(home, /href="\/testimonials\.html"/, 'store nav links to the testimonials page');

  const faq = await (await fetch(`${base(srv)}/faq.html`)).text();
  assert.match(faq, /href="\/testimonials\.html"/, 'faq nav links to the testimonials page');
});

test('editing the catalog file is visible on the next request, no restart', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'petshop-'));
  const tmpCatalog = path.join(dir, 'catalog.json');
  copyFileSync(path.join(root, 'catalog.json'), tmpCatalog);

  const srv = await listen(createApp(tmpCatalog));
  t.after(() => srv.close());

  const before = await (await fetch(`${base(srv)}/api/catalog/ember-rope-tug`)).json();
  assert.notEqual(before.product.price, 99.99);

  const doc = JSON.parse(readFileSync(tmpCatalog, 'utf8'));
  doc.products.find((p) => p.id === 'ember-rope-tug').price = 99.99;
  writeFileSync(tmpCatalog, JSON.stringify(doc, null, 2));

  const after = await (await fetch(`${base(srv)}/api/catalog/ember-rope-tug`)).json();
  assert.equal(after.product.price, 99.99);
});
