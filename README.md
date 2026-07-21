# petshop-live

A demo pet-shop storefront: a static English store served by one tiny Express server,
driven entirely by a single `catalog.json` on disk. Built as an interview demo piece —
intentionally small, and honest about what it is.

- **Six invented physical products** with generated SVG product art
- **Buy = contact** — every buy button opens a prefilled order email (`mailto`); no payments, no cart, no accounts, no admin
- **One source of truth** — edit `catalog.json`, refresh the page, the store changes; no restart, no build step
- **No database**, no frontend framework, no bundler

## Run

```sh
npm install
npm start        # → http://localhost:4174
```

Environment: `PORT` (default `4174`), `HOST` (default `0.0.0.0`), `CATALOG_PATH`
(default `./catalog.json`).

## Test

```sh
npm test
```

Covers the catalog schema (exactly six products, unique slug ids, prices, images exist
on disk), the HTTP surface (storefront, API, product pages, images, 404 on unknown ids),
and the core guarantee: editing the catalog file is visible on the next request without
a restart.

## Layout

```
server.js             Express server: static files + fresh-read catalog API
catalog.json          THE file — store identity + six products
public/index.html     storefront (hero, grid, about, contact)
public/product.html   product detail shell (rendered client-side)
public/faq.html       FAQ — four questions, one static page, inline CSS, no JS, no images
public/styles.css     warm pet-shop look: cream, clay, pine, sun
public/app.js         renders the grid from /api/catalog
public/product.js     renders one product; buy = prefilled order email
public/img/*.svg      generated product art, one per product + logo
test/                 node --test suites (catalog + server)
deploy/               systemd user unit for the tailnet-only demo posture
```

## Serving posture (demo)

On the demo box this runs as a systemd user service (`deploy/petshop-live.service`)
bound to the Tailscale IP only — reachable from the tailnet, invisible on LAN and the
public internet. Making it public later is a hosting change, not a rebuild.

## Honest limits

Demo catalog: the products, prices, address, and email domain are invented. "Buy" is a
contact action by design — there are no payment rails, and there is no order state
anywhere except your mail client.
