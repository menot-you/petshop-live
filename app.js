// Bramble & Paw storefront: renders catalog grid + product detail from catalog.json.
// Hash routes: "#/" → grid, "#/p/<id>" → product detail. Buy = prefilled mailto.

"use strict";

const app = document.getElementById("app");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
let catalog = null;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function orderMailto(store, product) {
  const subject = `Order: ${product.name}`;
  const body = [
    `Hi ${store.name},`,
    "",
    `I'd like to order the ${product.name} (${usd.format(product.price)}).`,
    "",
    "Name:",
    "Delivery address:",
    "",
    "Thanks!",
  ].join("\n");
  return `mailto:${store.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderGrid({ store, products }) {
  document.title = `${store.name} — ${store.tagline}`;
  app.innerHTML = `
    <section class="shopfront">
      <h1>The shelves</h1>
      <p class="shopfront-intro">Six things we'd put in the window if the window were real.</p>
      <ul class="grid">
        ${products
          .map(
            (p) => `
          <li>
            <a class="card" href="#/p/${esc(p.id)}">
              <span class="card-art"><img src="${esc(p.image)}" alt="" loading="lazy" /></span>
              <span class="card-body">
                <span class="card-species">${esc(p.species)}</span>
                <span class="card-name">${esc(p.name)}</span>
                <span class="card-tagline">${esc(p.tagline)}</span>
                <span class="card-price">${usd.format(p.price)}</span>
              </span>
            </a>
          </li>`
          )
          .join("")}
      </ul>
    </section>`;
}

function renderProduct({ store, products }, id) {
  const p = products.find((x) => x.id === id);
  if (!p) return renderMissing(id);
  document.title = `${p.name} — ${store.name}`;
  app.innerHTML = `
    <article class="product">
      <a class="back" href="#/">&larr; Back to the shelves</a>
      <div class="product-layout">
        <div class="product-art"><img src="${esc(p.image)}" alt="Illustration of the ${esc(p.name)}" /></div>
        <div class="product-info">
          <span class="card-species">${esc(p.species)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="product-tagline">${esc(p.tagline)}</p>
          <p class="product-price">${usd.format(p.price)}</p>
          <p class="product-description">${esc(p.description)}</p>
          <a class="buy" href="${orderMailto(store, p)}">Email us to order</a>
          <p class="buy-note">Opens your email app with the order prefilled — ${esc(store.name)} is fictional, so nothing is charged.</p>
        </div>
      </div>
    </article>`;
}

function renderMissing(id) {
  document.title = `Not on our shelves — ${catalog.store.name}`;
  app.innerHTML = `
    <section class="missing">
      <h1>That one isn't on our shelves</h1>
      <p>No product called <code>${esc(id)}</code> here — maybe it sold out of existence.</p>
      <p><a class="back" href="#/">&larr; Back to the shelves</a></p>
    </section>`;
}

function renderError(err) {
  app.innerHTML = `
    <section class="missing">
      <h1>The shelves wouldn't load</h1>
      <p>Couldn't fetch <code>catalog.json</code> (${esc(err.message)}). Refresh to try again.</p>
    </section>`;
}

function route() {
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/p\/([a-z0-9-]+)$/);
  if (m) renderProduct(catalog, m[1]);
  else renderGrid(catalog);
  window.scrollTo(0, 0);
}

async function boot() {
  try {
    const res = await fetch("catalog.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalog = await res.json();
    const contact = document.getElementById("footer-contact");
    contact.href = `mailto:${catalog.store.contact}`;
    contact.textContent = catalog.store.contact;
    window.addEventListener("hashchange", route);
    route();
  } catch (err) {
    renderError(err);
  }
}

boot();
