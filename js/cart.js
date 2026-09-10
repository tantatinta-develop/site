// ============================================================
// TANTA TINTA — cart, shop grid, checkout & admin logic
// Works entirely client-side with localStorage.
// See README.md for how to connect real payments.
// ============================================================

const TT_CART_KEY = 'tt_cart';
const TT_OVERRIDE_KEY = 'tt_products_override';
const TT_WHATSAPP_NUMBER = '5521995780587'; // Tanta Tinta WhatsApp, country+number, no symbols

// ---------- product source (catalog + any local admin overrides) ----------
function ttGetProducts() {
  let products = [...TT_PRODUCTS];
  try {
    const override = JSON.parse(localStorage.getItem(TT_OVERRIDE_KEY) || 'null');
    if (Array.isArray(override) && override.length) products = override;
  } catch (e) { /* ignore malformed override */ }
  return products;
}

function ttFormatPrice(price, currency) {
  const symbols = { USD: 'US$', CLP: 'CLP$', BRL: 'R$' };
  const symbol = symbols[currency] || currency + ' ';
  const value = currency === 'CLP' ? Math.round(price).toLocaleString('en-US') : price.toFixed(2);
  return `${symbol}${value}`;
}

// ---------- cart storage ----------
function ttGetCart() {
  try { return JSON.parse(localStorage.getItem(TT_CART_KEY) || '{}'); }
  catch (e) { return {}; }
}
function ttSaveCart(cart) {
  localStorage.setItem(TT_CART_KEY, JSON.stringify(cart));
  ttRenderCartCount();
  ttRenderCartDrawer();
}
function ttAddToCart(id, qty = 1) {
  const cart = ttGetCart();
  cart[id] = (cart[id] || 0) + qty;
  ttSaveCart(cart);
  ttOpenCartDrawer();
}
function ttSetQty(id, qty) {
  const cart = ttGetCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  ttSaveCart(cart);
}
function ttRemoveFromCart(id) {
  const cart = ttGetCart();
  delete cart[id];
  ttSaveCart(cart);
}
function ttCartCount() {
  const cart = ttGetCart();
  return Object.values(cart).reduce((a, b) => a + b, 0);
}
function ttCartLines() {
  const products = ttGetProducts();
  const cart = ttGetCart();
  return Object.entries(cart).map(([id, qty]) => {
    const product = products.find(p => p.id === id);
    return product ? { ...product, qty } : null;
  }).filter(Boolean);
}
function ttCartTotal() {
  return ttCartLines().reduce((sum, line) => sum + line.price * line.qty, 0);
}

// ---------- header cart count ----------
function ttRenderCartCount() {
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = ttCartCount();
  });
}

// ---------- cart drawer (present on every page that includes #cart-drawer) ----------
function ttOpenCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.classList.add('open');
}
function ttCloseCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.classList.remove('open');
}
function ttRenderCartDrawer() {
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  if (!body) return;
  const lines = ttCartLines();
  if (!lines.length) {
    body.innerHTML = `<p class="cart-empty">Your cart is empty. Browse the <a href="shop.html">shop</a> to find something to take home.</p>`;
    if (footer) footer.innerHTML = '';
    return;
  }
  body.innerHTML = lines.map(line => `
    <div class="cart-line">
      <div class="cart-line-img" style="background-image:url('${line.image}')"></div>
      <div class="cart-line-info">
        <p class="cart-line-name">${line.name}</p>
        <p class="tag">${TT_CATEGORY_LABELS[line.category] || line.category}</p>
        <div class="cart-line-controls">
          <button class="qty-btn" onclick="ttSetQty('${line.id}', ${line.qty - 1})" aria-label="Decrease quantity">–</button>
          <span>${line.qty}</span>
          <button class="qty-btn" onclick="ttSetQty('${line.id}', ${line.qty + 1})" aria-label="Increase quantity">+</button>
          <button class="cart-line-remove" onclick="ttRemoveFromCart('${line.id}')">Remove</button>
        </div>
      </div>
      <div class="cart-line-price">${ttFormatPrice(line.price * line.qty, line.currency)}</div>
    </div>
  `).join('');
  if (footer) {
    const currency = lines[0].currency;
    footer.innerHTML = `
      <div class="cart-total-row">
        <span>Subtotal</span>
        <strong>${ttFormatPrice(ttCartTotal(), currency)}</strong>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-block btn-lg">Go to checkout</a>
    `;
  }
}

// ---------- shop grid (shop.html) ----------
function ttRenderShopGrid(filter = 'all') {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  const products = ttGetProducts().filter(p => filter === 'all' || p.category === filter);
  if (!products.length) {
    grid.innerHTML = `<p>No pieces in this category right now — check back soon.</p>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <article class="product-card" data-reveal>
      <div class="product-img" style="background-image:url('${p.image}')" onclick="ttOpenProduct('${p.id}')">
        ${p.stock <= 0 ? '<span class="sold-out">Sold out</span>' : ''}
      </div>
      <div class="product-body">
        <p class="tag">${TT_CATEGORY_LABELS[p.category] || p.category}</p>
        <h3 onclick="ttOpenProduct('${p.id}')">${p.name}</h3>
        <p class="lede" style="font-size:0.92rem;max-width:none;">${p.description}</p>
        <div class="product-foot">
          <span class="product-price">${ttFormatPrice(p.price, p.currency)}</span>
          <button class="btn btn-ink" ${p.stock <= 0 ? 'disabled' : ''} onclick="ttAddToCart('${p.id}')">
            ${p.stock <= 0 ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  `).join('');
  // newly-rendered cards (e.g. after clicking a filter) should show immediately —
  // the scroll-reveal observer in main.js only watched the cards present at page load
  grid.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'));
}

// ---------- product detail modal ----------
let ttModalImages = [];

function ttOpenProduct(id) {
  const product = ttGetProducts().find(p => p.id === id);
  if (!product) return;

  ttModalImages = Array.isArray(product.images) && product.images.length ? product.images : [product.image];

  const body = document.getElementById('product-modal-body');
  body.innerHTML = `
    <div class="product-modal-gallery">
      <div class="product-modal-main" id="product-modal-main" style="background-image:url('${ttModalImages[0]}')"></div>
      ${ttModalImages.length > 1 ? `
        <div class="product-modal-thumbs">
          ${ttModalImages.map((src, i) => `
            <button type="button" class="product-modal-thumb ${i === 0 ? 'active' : ''}" style="background-image:url('${src}')" onclick="ttSetModalImage(${i})" aria-label="Show photo ${i + 1}"></button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="product-modal-details">
      <p class="tag">${TT_CATEGORY_LABELS[product.category] || product.category}</p>
      <h3>${product.name}</h3>
      <span class="product-price">${ttFormatPrice(product.price, product.currency)}</span>
      <p class="lede" style="max-width:none;">${product.description}</p>
      <div class="product-foot">
        <button class="btn btn-ink btn-lg" ${product.stock <= 0 ? 'disabled' : ''} onclick="ttAddToCart('${product.id}')">
          ${product.stock <= 0 ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('product-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function ttSetModalImage(index) {
  const main = document.getElementById('product-modal-main');
  if (!main || !ttModalImages[index]) return;
  main.style.backgroundImage = `url('${ttModalImages[index]}')`;
  document.querySelectorAll('.product-modal-thumb').forEach((t, i) => t.classList.toggle('active', i === index));
}

function ttCloseProduct() {
  document.getElementById('product-modal').hidden = true;
  document.body.style.overflow = '';
}

function ttInitShopFilters() {
  const tabs = document.querySelectorAll('.shop-filter');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ttRenderShopGrid(tab.dataset.filter);
    });
  });
}

// ---------- checkout page ----------
function ttRenderCheckout() {
  const body = document.getElementById('checkout-lines');
  if (!body) return;
  const lines = ttCartLines();
  const totalEl = document.getElementById('checkout-total');
  const waBtn = document.getElementById('checkout-whatsapp');

  if (!lines.length) {
    body.innerHTML = `<p>Your cart is empty. <a href="shop.html">Go back to the shop</a> to add something first.</p>`;
    if (totalEl) totalEl.textContent = '';
    if (waBtn) waBtn.setAttribute('aria-disabled', 'true');
    return;
  }

  body.innerHTML = lines.map(line => `
    <div class="checkout-line">
      <span>${line.qty} × ${line.name}</span>
      <span>${ttFormatPrice(line.price * line.qty, line.currency)}</span>
    </div>
  `).join('');

  const currency = lines[0].currency;
  if (totalEl) totalEl.textContent = ttFormatPrice(ttCartTotal(), currency);

  if (waBtn) {
    let msg = `Hi Tanta Tinta! I'd like to order:\n`;
    lines.forEach(l => { msg += `\n• ${l.qty} × ${l.name} — ${ttFormatPrice(l.price * l.qty, l.currency)}`; });
    msg += `\n\nTotal: ${ttFormatPrice(ttCartTotal(), currency)}`;
    msg += `\n\nCould you send me payment details (Chile or Brazil)?`;
    waBtn.href = `https://wa.me/${TT_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
}

// ============================================================
// ADMIN — simple product manager, no server required.
// Visit shop.html?admin=1 to use it. Changes are stored in this
// browser only until you press "Export products.js" — then copy
// the downloaded file's content into js/products.js to make the
// change permanent and visible to every visitor.
// See README.md for details.
// ============================================================
function ttInitAdmin() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') !== '1') return;
  panel.hidden = false;
  ttRenderAdminList();

  document.getElementById('admin-add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const products = ttGetProducts();
    const id = f.id.value.trim() || ('item-' + Date.now());
    const newProduct = {
      id,
      category: f.category.value,
      name: f.name.value.trim(),
      price: parseFloat(f.price.value) || 0,
      currency: f.currency.value,
      stock: parseInt(f.stock.value, 10) || 0,
      image: f.image.value.trim() || 'images/shop/placeholder.jpg',
      description: f.description.value.trim()
    };
    const existingIndex = products.findIndex(p => p.id === id);
    if (existingIndex > -1) products[existingIndex] = newProduct;
    else products.push(newProduct);
    localStorage.setItem(TT_OVERRIDE_KEY, JSON.stringify(products));
    f.reset();
    ttRenderAdminList();
    ttRenderShopGrid();
  });

  document.getElementById('admin-export').addEventListener('click', () => {
    const products = ttGetProducts();
    const fileContent = `// Exported from the admin panel — paste this whole file over js/products.js\n\nconst TT_PRODUCTS = ${JSON.stringify(products, null, 2)};\n\nconst TT_CATEGORY_LABELS = {\n  silkscreen: "Silkscreen artwork",\n  prints: "Prints",\n  jewels: "Jewels"\n};\n`;
    const blob = new Blob([fileContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.js';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('admin-reset').addEventListener('click', () => {
    if (confirm('Discard local changes and go back to the saved products.js catalog?')) {
      localStorage.removeItem(TT_OVERRIDE_KEY);
      ttRenderAdminList();
      ttRenderShopGrid();
    }
  });
}

function ttRenderAdminList() {
  const list = document.getElementById('admin-list');
  if (!list) return;
  const products = ttGetProducts();
  list.innerHTML = products.map(p => `
    <div class="admin-row">
      <div>
        <strong>${p.name}</strong>
        <span class="tag">${p.category}</span>
        <span>${ttFormatPrice(p.price, p.currency)}</span>
        <span>Stock: ${p.stock}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" onclick='ttEditAdminProduct(${JSON.stringify(p)})'>Edit</button>
        <button type="button" onclick="ttDeleteAdminProduct('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function ttEditAdminProduct(p) {
  const f = document.getElementById('admin-add-form');
  f.id.value = p.id;
  f.category.value = p.category;
  f.name.value = p.name;
  f.price.value = p.price;
  f.currency.value = p.currency;
  f.stock.value = p.stock;
  f.image.value = p.image;
  f.description.value = p.description;
  f.scrollIntoView({ behavior: 'smooth' });
}

function ttDeleteAdminProduct(id) {
  if (!confirm('Delete this piece from the shop?')) return;
  const products = ttGetProducts().filter(p => p.id !== id);
  localStorage.setItem(TT_OVERRIDE_KEY, JSON.stringify(products));
  ttRenderAdminList();
  ttRenderShopGrid();
}

// ---------- init on load ----------
document.addEventListener('DOMContentLoaded', () => {
  ttRenderCartCount();
  ttRenderCartDrawer();
  ttRenderShopGrid();
  ttInitShopFilters();
  ttRenderCheckout();
  ttInitAdmin();

  const cartToggle = document.querySelectorAll('[data-cart-toggle]');
  cartToggle.forEach(btn => btn.addEventListener('click', ttOpenCartDrawer));
  const cartClose = document.querySelectorAll('[data-cart-close]');
  cartClose.forEach(btn => btn.addEventListener('click', ttCloseCartDrawer));

  const productModalClose = document.querySelectorAll('[data-product-modal-close]');
  productModalClose.forEach(el => el.addEventListener('click', ttCloseProduct));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('product-modal');
      if (modal && !modal.hidden) ttCloseProduct();
    }
  });
});
