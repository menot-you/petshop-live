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

test('gift cards page is served with three tiers, no scripts, no images', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const res = await fetch(`${base(srv)}/giftcards.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal((html.match(/class="tier-card/g) ?? []).length, 3, 'exactly three tier cards');
  for (const [name, price] of [['Pounce', '€25'], ['Fetch', '€50'], ['Best Friend', '€100']]) {
    assert.match(html, new RegExp(name), `offers the ${name} card`);
    assert.match(html, new RegExp(price), `${name} shows ${price}`);
  }
  assert.doesNotMatch(html, /<script/, 'gift cards stay JS-free');
  assert.doesNotMatch(html, /<img/, 'gift cards stay image-free');
  assert.match(html, /orders@petshop\.live/, 'how-to-get-one line points at the contact address');

  for (const page of ['/', '/faq.html', '/testimonials.html']) {
    const nav = await (await fetch(`${base(srv)}${page}`)).text();
    assert.match(nav, /href="\/giftcards\.html"/, `${page} nav links to the gift cards page`);
  }
});

test('loyalty page is served with three tiers, no scripts, no images', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const res = await fetch(`${base(srv)}/loyalty.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal((html.match(/class="tier-card/g) ?? []).length, 3, 'exactly three tier cards');
  assert.equal((html.match(/tier-featured/g) ?? []).length > 0, true, 'the middle tier is featured');
  for (const [name, stamps] of [['Paw', '0\\+ stamps'], ['Whisker', '10\\+ stamps'], ['Pack Leader', '25\\+ stamps']]) {
    assert.match(html, new RegExp(name), `offers the ${name} tier`);
    assert.match(html, new RegExp(stamps), `${name} shows its stamp threshold`);
  }
  assert.doesNotMatch(html, /<script/, 'loyalty stays JS-free');
  assert.doesNotMatch(html, /<img/, 'loyalty stays image-free');
  assert.match(html, /how to join/, 'explains joining in-store');

  for (const page of ['/', '/faq.html', '/testimonials.html', '/giftcards.html']) {
    const nav = await (await fetch(`${base(srv)}${page}`)).text();
    assert.match(nav, /href="\/loyalty\.html"/, `${page} nav links to the loyalty page`);
  }
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

test('promo banner page is standalone: offer, end date, one CTA back to the store', async (t) => {
  const srv = await listen(createApp());
  t.after(() => srv.close());

  const res = await fetch(`${base(srv)}/promo.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /20% off all pet food/, 'headline carries the offer');
  assert.match(html, /sunday, july 26/, 'end date is stated');
  assert.match(html, /the fine print/, 'offer terms section present');
  assert.equal((html.match(/<a\s/g) ?? []).length, 1, 'exactly one link on the page');
  assert.match(html, /<a class="cta" href="\/">/, 'the one link is the CTA back to the store');
  assert.doesNotMatch(html, /<nav/, 'promo carries no nav');
  assert.doesNotMatch(html, /<form/, 'promo carries no forms');
  assert.doesNotMatch(html, /<script/, 'promo stays JS-free');
  assert.doesNotMatch(html, /<img/, 'promo stays image-free');
});
