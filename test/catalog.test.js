import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(readFileSync(path.join(root, 'catalog.json'), 'utf8'));

test('store identity is present', () => {
  assert.equal(catalog.store.name, 'petshop-live');
  assert.match(catalog.store.contact, /^[^@\s]+@[^@\s]+$/);
});

test('catalog holds exactly six products', () => {
  assert.equal(catalog.products.length, 6);
});

test('every product carries the full schema', () => {
  for (const p of catalog.products) {
    assert.match(p.id, /^[a-z0-9-]+$/, `id "${p.id}" must be a slug`);
    assert.ok(p.name.length > 2, `${p.id}: name`);
    assert.ok(p.category.length > 2, `${p.id}: category`);
    assert.equal(typeof p.price, 'number', `${p.id}: price is a number`);
    assert.ok(p.price > 0, `${p.id}: price > 0`);
    assert.equal(p.currency, 'EUR', `${p.id}: currency`);
    assert.ok(p.blurb.length > 10, `${p.id}: blurb`);
    assert.ok(p.description.length > 40, `${p.id}: description`);
    assert.match(p.image, /^\/img\/[a-z0-9-]+\.svg$/, `${p.id}: image path`);
  }
});

test('product ids are unique', () => {
  const ids = catalog.products.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every product image exists on disk', () => {
  for (const p of catalog.products) {
    const file = path.join(root, 'public', p.image);
    assert.ok(existsSync(file), `missing image: ${p.image}`);
  }
});
