import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const cat = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));

test("store identity is complete", () => {
  assert.ok(cat.store.name.length > 0, "store.name missing");
  assert.ok(cat.store.tagline.length > 0, "store.tagline missing");
  assert.ok(cat.store.contact.includes("@"), "store.contact is not an email");
  assert.ok(cat.store.note.length > 0, "store.note (demo disclaimer) missing");
});

test("catalog has exactly 6 products with required fields", () => {
  assert.equal(cat.products.length, 6);
  for (const p of cat.products) {
    for (const key of ["id", "name", "price", "species", "tagline", "description", "image"]) {
      assert.ok(p[key] !== undefined && p[key] !== "", `${p.id ?? "?"} missing ${key}`);
    }
    assert.equal(typeof p.price, "number", `${p.id} price must be a number`);
    assert.ok(p.price > 0, `${p.id} price must be positive`);
  }
});

test("product ids are unique and url-safe", () => {
  const ids = cat.products.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/, `${id} is not url-safe (used in #/p/<id> routes)`);
  }
});

test("every product image exists on disk", async () => {
  for (const p of cat.products) {
    await access(path.join(root, p.image));
  }
});
