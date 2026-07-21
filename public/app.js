// petshop-live storefront — renders the product grid from /api/catalog.

const fmtPrice = (p) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: p.currency || 'EUR' }).format(p.price);

function cardHtml(p) {
  return `
  <a class="card" href="/product/${encodeURIComponent(p.id)}">
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
    <div class="card-art"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
    <div class="card-body">
      <span class="chip">${p.category}</span>
      <h3>${p.name}</h3>
      <p class="card-blurb">${p.blurb}</p>
      <div class="card-foot">
        <span class="price">${fmtPrice(p)}</span>
        <span class="view">view →</span>
      </div>
    </div>
  </a>`;
}

async function load() {
  const grid = document.getElementById('catalog');
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`catalog answered ${res.status}`);
    const { store, products } = await res.json();
    document.querySelectorAll('a[data-contact]').forEach((a) => { a.href = `mailto:${store.contact}`; });
    const addr = document.querySelector('[data-store-address]');
    if (addr && store.address) addr.textContent = `${store.address.toLowerCase()} · ${store.hours || ''}`.trim();
    grid.innerHTML = products.map(cardHtml).join('');
  } catch {
    grid.innerHTML = '<p class="loading">the shop is napping — refresh in a second.</p>';
  }
}

load();
