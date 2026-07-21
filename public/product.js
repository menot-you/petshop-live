// petshop-live product page — renders one product; "buy" is a prefilled order email.

const fmtPrice = (p) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: p.currency || 'EUR' }).format(p.price);

const id = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');

async function load() {
  const wrap = document.getElementById('product');
  try {
    const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      document.title = 'this shelf is empty — petshop-live';
      wrap.innerHTML = `
        <div class="empty">
          <h1>this shelf is empty</h1>
          <p>we don't have “${id}” — maybe it sold out, maybe it never existed.</p>
          <a class="btn btn-primary" href="/#shop">back to the shop</a>
        </div>`;
      return;
    }
    if (!res.ok) throw new Error(`catalog answered ${res.status}`);
    const { store, product: p } = await res.json();

    document.title = `${p.name} — ${store.name}`;
    document.querySelectorAll('a[data-contact]').forEach((a) => { a.href = `mailto:${store.contact}`; });
    const addr = document.querySelector('[data-store-address]');
    if (addr && store.address) addr.textContent = `${store.address.toLowerCase()} · ${store.hours || ''}`.trim();

    const subject = encodeURIComponent(`order: ${p.name}`);
    const body = encodeURIComponent(
      `hi ${store.name},\n\ni'd like to buy: ${p.name} (${fmtPrice(p)}).\n\nname:\npickup or delivery:\n\nthanks!`
    );

    wrap.innerHTML = `
      <div class="product-art">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <span class="chip">${p.category}</span>
        <h1>${p.name}</h1>
        <p class="price price-big">${fmtPrice(p)}</p>
        <p class="product-desc">${p.description}</p>
        <a class="btn btn-primary btn-buy" href="mailto:${store.contact}?subject=${subject}&amp;body=${body}">buy — email us</a>
        <p class="buy-note">${p.inStock ? 'in stock · ' : ''}we reply within a day. pickup in store or local delivery.</p>
      </div>`;
  } catch {
    wrap.innerHTML = '<p class="loading">the shop is napping — refresh in a second.</p>';
  }
}

load();
