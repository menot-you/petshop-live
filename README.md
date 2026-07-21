# petshop-live — Bramble & Paw

A demo pet-shop storefront with an invented brand identity. Pure static site: hand-written
HTML/CSS/vanilla JS, no framework, no build step, no backend, no database.

**Bramble & Paw is fictional.** The catalog is six invented physical products in a flat
`catalog.json`; the buy button opens a prefilled email to the shop's (fake) address — there
are no payments, no cart, no accounts, and no admin.

## What's here

| File | Role |
| --- | --- |
| `index.html` | Single page: app shell, header, footer |
| `styles.css` | Brand styling (warm palette, responsive grid) |
| `app.js` | Renders catalog grid + product detail from `catalog.json`, hash routing (`#/` and `#/p/<id>`), mailto buy action |
| `catalog.json` | Store identity + the six products (names, prices, blurbs, images) |
| `img/*.svg` | Hand-drawn flat product illustrations |
| `server.mjs` | ~90-line hardened static server (allowlisted types, no dotfiles, no traversal, no listing) |
| `catalog.test.mjs` | Catalog contract tests (`node --test`) |
| `deploy/petshop-live.service` | systemd user unit that serves the site tailnet-only |

## Run locally

```sh
node server.mjs                 # http://127.0.0.1:4174/
node --test                     # catalog contract tests
```

No dependencies — any Node ≥ 18 works. Or skip the server entirely and use any static file
server pointed at this directory.

## Deployment (as run on the tailnet)

The site is served by `server.mjs` bound **only** to the host's Tailscale IP, so it is
reachable inside the tailnet and invisible to the LAN and the public internet:

```sh
cp deploy/petshop-live.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now petshop-live.service
```

## Editing the catalog

Edit `catalog.json` and refresh — the server sends `cache-control: no-store`, so changes land
instantly. The buy-email target is `store.contact`. Product `id`s become URLs (`#/p/<id>`),
so keep them lowercase-kebab. Run `node --test` after editing to keep the contract honest.
