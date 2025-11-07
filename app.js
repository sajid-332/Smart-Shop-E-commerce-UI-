// SmartShop Core

const $  = (q, ctx=document) => ctx.querySelector(q);
const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];

// Currency & symbols (demo)
const RATES = { USD: 1, CNY: 7.20, BDT: 120 };
const SYM   = { USD: '$', CNY: '¥',   BDT: '৳'  };

// Global state
const STATE = {
  currency: localStorage.getItem('smartshop-currency') || 'USD',
  lang:     localStorage.getItem('smartshop-lang') || 'en',
  cart: JSON.parse(localStorage.getItem('smartshop-cart') || '[]'),
  couponPercent: 0,
  isNewAccount: JSON.parse(localStorage.getItem('smartshop-isNewAccount') ?? 'true'),
  // Balance stored in USD (canonical)
  balanceUSD: (() => {
    const savedUSD = localStorage.getItem('smartshop-balanceUSD');
    if (savedUSD !== null) return Number(savedUSD);
    const legacy = localStorage.getItem('smartshop-balanceDisplay');
    if (legacy !== null) {
      const lastCur = localStorage.getItem('smartshop-currency') || 'USD';
      const usd = Number(legacy) / (RATES[lastCur] || 1);
      localStorage.setItem('smartshop-balanceUSD', String(usd));
      localStorage.removeItem('smartshop-balanceDisplay');
      return usd;
    }
    localStorage.setItem('smartshop-balanceUSD', '3000');
    return 3000;
  })(),
  bannerIndex: 0
};

const money = (usd) => `${SYM[STATE.currency]} ${(usd * RATES[STATE.currency]).toFixed(2)}`;
const setBadge  = () => { const b=$('#cartCountBadge'); if(b) b.textContent = STATE.cart.reduce((n,i)=>n+i.qty,0); };
const saveCart  = () => localStorage.setItem('smartshop-cart', JSON.stringify(STATE.cart));

function stars(rate=0){
  const full = Math.floor(rate);
  const half = (rate - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return [
    ...Array(full).fill('<i class="fa-solid fa-star text-amber-400"></i>'),
    ...Array(half).fill('<i class="fa-solid fa-star-half-stroke text-amber-400"></i>'),
    ...Array(empty).fill('<i class="fa-regular fa-star text-amber-400"></i>')
  ].join('');
}

// Theme toggle (Dark / Light)
const themeBtn  = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyThemeIcon(){
  if(!themeIcon) return;
  if (document.documentElement.classList.contains('dark')) {
    themeIcon.className = 'fa-solid fa-sun text-lg text-amber-400';
  } else {
    themeIcon.className = 'fa-regular fa-moon text-lg text-gray-800';
  }
}

themeBtn?.addEventListener('click', ()=>{
  const on = document.documentElement.classList.toggle('dark');
  localStorage.setItem('smartshop-theme', on ? 'dark' : 'light');
  applyThemeIcon();
});
(() => { const saved = localStorage.getItem('smartshop-theme'); if(saved==='dark') document.documentElement.classList.add('dark'); applyThemeIcon(); })();

// Lang/Currency popup
$('#langCurBtn')?.addEventListener('click', ()=> $('#langCurMenu')?.classList.toggle('hidden'));
document.addEventListener('click', (e)=>{
  const m=$('#langCurMenu'), b=$('#langCurBtn');
  if(m && b && !m.contains(e.target) && !b.contains(e.target)) m.classList.add('hidden');
});
$$('#langCurMenu [data-lang]').forEach(b=>{
  b.addEventListener('click', ()=>{
    STATE.lang=b.dataset.lang;
    localStorage.setItem('smartshop-lang', STATE.lang);
    $('#langCurMenu')?.classList.add('hidden');
  });
});
$$('#langCurMenu [data-cur]').forEach(b=>{
  b.addEventListener('click', ()=>{
    STATE.currency=b.dataset.cur;
    localStorage.setItem('smartshop-currency', STATE.currency);
    $('#langCurMenu')?.classList.add('hidden');
    renderBalanceBox(); renderCartPage(); renderProducts();
  });
});

// Sub-nav dropdowns & categories
const CAT_LIST = [
  { name: 'Categories for you',           icon: 'fa-regular fa-star' },
  { name: 'Consumer Electronics',         icon: 'fa-solid fa-headphones' },
  { name: 'Gifts & Crafts',               icon: 'fa-solid fa-gift' },
  { name: 'Home Appliances',              icon: 'fa-solid fa-tv' },
  { name: 'Vehicle Parts & Accessories',  icon: 'fa-solid fa-car' },
  { name: 'Tools & Hardware',             icon: 'fa-solid fa-screwdriver-wrench' },
  { name: 'Power Transmission',           icon: 'fa-solid fa-gears' },
  { name: 'Apparel & Accessories',        icon: 'fa-solid fa-shirt' },
  { name: 'Home & Garden',                icon: 'fa-solid fa-seedling' },
  { name: 'Sports & Entertainment',       icon: 'fa-solid fa-football' },
  { name: 'Beauty',                       icon: 'fa-solid fa-spa' },
  { name: 'Jewelry, Eyewear & Watches',   icon: 'fa-solid fa-gem' },
  { name: 'Shoes & Accessories',          icon: 'fa-solid fa-shoe-prints' },
  { name: 'Luggage, Bags & Cases',        icon: 'fa-solid fa-suitcase-rolling' },
  { name: 'Packaging & Printing',         icon: 'fa-solid fa-box' },
  { name: 'Parents, Kids & Toys',         icon: 'fa-solid fa-puzzle-piece' },
  { name: 'Personal Care & Home Care',    icon: 'fa-solid fa-pump-soap' },
  { name: 'Health & Medical',             icon: 'fa-solid fa-briefcase-medical' },
  { name: 'School & Office Supplies',     icon: 'fa-solid fa-pen' },
  { name: 'Commercial Equipment & Machinery', icon: 'fa-solid fa-industry' }
];

(function buildCatMenu(){
  const box = document.getElementById('allCatMenu');
  if (!box) return;
  box.innerHTML = CAT_LIST.map(c => `
    <button class="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            data-cat="${c.name}">
      <i class="${c.icon} text-lg min-w-[1.2rem] text-gray-700 dark:text-gray-200"></i>
      <span>${c.name}</span>
    </button>
  `).join('');
  box.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    const val = btn.dataset.cat;
    location.href = `./category.html?name=${encodeURIComponent(val)}`;
  });
})();

(function subNavDropdowns(){
  const map = [
    { btn: 'allCatBtn',   menu: 'allCatMenu'   },
    { btn: 'featuredBtn', menu: 'featuredMenu' },
    { btn: 'moreBtn',     menu: 'moreMenu'     },
  ];
  map.forEach(({btn, menu})=>{
    const b = document.getElementById(btn);
    const m = document.getElementById(menu);
    if (!b || !m) return;
    b.addEventListener('click', (e)=>{
      e.stopPropagation();
      m.classList.toggle('hidden');
      map.forEach(({menu:other})=>{
        if (other !== menu) document.getElementById(other)?.classList.add('hidden');
      });
    });
    document.addEventListener('click', (e)=>{
      if (!m.contains(e.target) && !b.contains(e.target)) m.classList.add('hidden');
    });
  });
  const featuredMenu = document.getElementById('featuredMenu');
  featuredMenu?.addEventListener('click', (e)=>{
    const item = e.target.closest('[data-feature]');
    if (!item) return;
    const f = item.dataset.feature;
    location.href = `./category.html?feature=${encodeURIComponent(f)}`;
  });
})();

// Sub-nav hide on scroll
(function subNavScroll(){
  const bar = document.getElementById('subNav');
  if (!bar) return;
  let lastY = window.scrollY;
  const THRESHOLD = 30;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const down = y > lastY && y > THRESHOLD;
    bar.style.transform = down ? 'translateY(-100%)' : 'translateY(0)';
    lastY = y;
  }, { passive: true });
})();

// Banner slider
// ======= Full-bleed banner with rotate-on-slide =======
(function banner() {
  const track = document.getElementById('bannerTrack');
  if (!track) return;
  const slides = [...track.querySelectorAll('.slide')];
  const total = slides.length;
  let i = 0;
  let timer;

  function setSlideWidths() {
    const vw = window.innerWidth;
    slides.forEach(s => { s.style.width = vw + 'px'; });
    track.style.transform = `translateX(-${i * vw}px)`;
  }
  setSlideWidths();
  window.addEventListener('resize', setSlideWidths);

  function decorateSlides(direction = 1) {
    slides.forEach((s, idx) => {
      const tilted = idx === i ? 0 : (direction > 0 ? -4 : 4);
      s.style.transition = 'transform 700ms, opacity 700ms';
      s.style.transform  = `rotate(${tilted}deg)`;
      s.style.opacity    = idx === i ? '1' : '.92';
    });
  }

  function goTo(nextIndex, direction = 1) {
    i = (nextIndex + total) % total;
    const offset = i * window.innerWidth;
    track.style.transform = `translateX(-${offset}px)`;
    decorateSlides(direction);
  }

  function next() { goTo(i + 1, 1); }
  function prev() { goTo(i - 1, -1); }

  document.getElementById('nextBanner')?.addEventListener('click', next);
  document.getElementById('prevBanner')?.addEventListener('click', prev);

  function start() { timer = setInterval(next, 5000); }
  function stop()  { clearInterval(timer); }
  start();

  ['mouseenter','touchstart'].forEach(ev => track.addEventListener(ev, stop, {passive:true}));
  ['mouseleave','touchend'  ].forEach(ev => track.addEventListener(ev, start,{passive:true}));

  decorateSlides(1);
})();


// Search Options
$('#globalSearchForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = $('#globalSearchInput').value.trim();
  if(q) location.href = `./category.html?search=${encodeURIComponent(q)}`;
});

// Products
async function fetchProducts(){
  const res = await fetch('https://fakestoreapi.com/products');
  const data = await res.json();
  return data.map(p => ({
    id: p.id,
    title: p.title,
    image: p.image,
    priceUSD: Number(p.price),
    category: p.category,
    rating: p.rating?.rate || 0
  }));
}

function productCard(p){
  return `
  <div class="rounded-2xl border bg-white dark:bg-gray-950 p-3 flex flex-col">
    <img src="${p.image}" alt="${p.title}" class="w-full h-40 object-contain p-3">
    <h3 class="font-semibold line-clamp-2 min-h-[3rem]">${p.title}</h3>
    <div class="mt-2 text-sm flex items-center justify-between">
      <span class="font-bold">${money(p.priceUSD)}</span>
      <span>${stars(p.rating)}</span>
    </div>
    <button data-add="${p.id}" class="mt-3 px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Add to Cart</button>
  </div>`;
}

async function renderProducts(){
  const grid = $('#productsGrid'); if(!grid) return;
  try{
    $('#productsMsg') && ($('#productsMsg').textContent='Loading...');
    const data = window.__allProducts || await fetchProducts();
    window.__allProducts = data;
    grid.innerHTML = data.map(productCard).join('');
    $('#productsMsg') && ($('#productsMsg').textContent='');
    grid.onclick = (e)=>{
      const id = e.target.closest('button[data-add]')?.dataset.add;
      if(id) addToCart(Number(id));
    };
  }catch(e){
    $('#productsMsg') && ($('#productsMsg').textContent='Failed to load products.');
  }
}

// Category page renderer
async function renderCategoryPage(){
  const grid = $('#productsGrid'); if(!grid) return;
  const params = new URLSearchParams(location.search);
  const name = params.get('name');
  const feature = params.get('feature');
  const search = params.get('search');

  const data = window.__allProducts || await fetchProducts();
  let list = data;

  if(name){
    if(/gift|craft/i.test(name)) list = data.filter(p => /jewel|home/i.test(p.category));
    else if(/electronics/i.test(name)) list = data.filter(p => /elect/i.test(p.category));
    else if(/apparel|accessories/i.test(name)) list = data.filter(p => /cloth|jewel/i.test(p.category));
    $('#catTitle') && ($('#catTitle').textContent = name);
  }
  if(feature){
    if(feature==='top-ranking') list = [...data].sort((a,b)=> b.rating-a.rating).slice(0,12);
    if(feature==='new-arrivals') list = data.slice(-12);
    if(feature==='top-deals'){
      const avg = data.reduce((s,p)=>s+p.priceUSD,0)/data.length;
      list = data.filter(p=>p.rating>=4 && p.priceUSD<=avg).slice(0,12);
    }
    $('#catTitle') && ($('#catTitle').textContent = feature.replace('-', ' ').replace(/\b\w/g, m=>m.toUpperCase()));
  }
  if(search){
    list = data.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
    $('#catTitle') && ($('#catTitle').textContent = `Search: ${search}`);
  }

  grid.innerHTML = list.map(productCard).join('');
  grid.onclick = (e)=>{
    const id = e.target.closest('[data-add]')?.dataset.add;
    if(id) addToCart(Number(id));
  };
}

// Cart ops
function addToCart(id){
  const p = (window.__allProducts || []).find(x=>x.id===id);
  if(!p) return;
  const ex = STATE.cart.find(x=>x.id===id);
  if (ex) ex.qty += 1; else STATE.cart.push({id:p.id,title:p.title,image:p.image,priceUSD:p.priceUSD,qty:1,rating:p.rating});
  saveCart(); setBadge(); alert('Added to cart.');
}
function removeFromCart(id){
  const i = STATE.cart.findIndex(x=>x.id===id);
  if(i>=0){ STATE.cart.splice(i,1); saveCart(); setBadge(); renderCartPage(); }
}
function changeQty(id, d){
  const it = STATE.cart.find(x=>x.id===id); if(!it) return;
  it.qty = Math.max(1, it.qty + d);
  saveCart(); renderCartPage();
}

// Shipping rule; free for new account
const shipUSD = (subUSD, isNew) => subUSD<=0 ? 0 : (isNew ? 0 : (subUSD<=30 ? 0 : 5 + Math.floor((subUSD-30)/20)*5));
function totalsUSD(){
  const sub = STATE.cart.reduce((s,i)=> s+i.priceUSD*i.qty, 0);
  const disc = sub * (STATE.couponPercent/100);
  const ship = shipUSD(sub, STATE.isNewAccount);
  const fin  = Math.max(0, sub - disc + ship);
  return { sub, disc, ship, fin };
}

// Cart page render
function renderCartPage(){
  const list = $('#cartList');
  if(!list){ setBadge(); return; }

  list.innerHTML = '';
  const emptyState = $('#emptyState');
  if (emptyState) emptyState.classList.toggle('hidden', STATE.cart.length !== 0);

  STATE.cart.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.className='rounded-2xl border bg-white dark:bg-gray-950 p-4 shadow-sm';
    li.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="w-24 h-24 rounded-xl border bg-white dark:bg-gray-900 grid place-items-center overflow-hidden">
          <img src="${it.image}" class="max-h-20 object-contain" alt="">
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold line-clamp-2">${it.title}</p>
              <div class="mt-1 text-xs">${stars(it.rating)}</div>
            </div>
            <div class="text-right">
              <p class="text-sm opacity-70">Price</p>
              <p class="font-semibold">${money(it.priceUSD)}</p>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <div class="inline-flex items-center rounded-xl border overflow-hidden">
              <button class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" data-dec="${it.id}" aria-label="Decrease">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="px-4 py-2 min-w-[2.5rem] text-center">${it.qty}</span>
              <button class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" data-inc="${it.id}" aria-label="Increase">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>

            <div class="text-right">
              <p class="text-sm opacity-70">Line total</p>
              <p class="font-bold text-blue-700 dark:text-blue-300">${money(it.priceUSD*it.qty)}</p>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-3">
            <button class="text-red-600 hover:underline" data-del="${it.id}">
              <i class="fa-regular fa-trash-can"></i> Remove
            </button>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">ID: ${idx+1}</span>
          </div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  list.onclick = (e)=>{
    const inc=e.target.closest('[data-inc]')?.dataset.inc;
    const dec=e.target.closest('[data-dec]')?.dataset.dec;
    const del=e.target.closest('[data-del]')?.dataset.del;
    if(inc) changeQty(Number(inc), +1);
    if(dec) changeQty(Number(dec), -1);
    if(del) removeFromCart(Number(del));
  };

  const { sub, disc, ship, fin } = totalsUSD();
  $('#subtotal')  && ($('#subtotal').textContent   = money(sub));
  $('#discount')  && ($('#discount').textContent   = `− ${money(disc)}`);
  $('#shipping')  && ($('#shipping').textContent   = money(ship));
  $('#finalTotal')&& ($('#finalTotal').textContent = money(fin));
  $('#newAccountMsg') && ($('#newAccountMsg').textContent = STATE.isNewAccount ? 'New account: Free shipping applied.' : '');

  const btn = $('#checkoutBtn');
  if (btn) { const disabled = STATE.cart.length === 0; btn.disabled = disabled; btn.classList.toggle('opacity-60', disabled); btn.classList.toggle('cursor-not-allowed', disabled); }

  setBadge();
}

// Balance box (cart page)
function renderBalanceBox(){
  const val = $('#balanceVal'); if(!val) return;
  const cur = STATE.currency;
  const display = STATE.balanceUSD * RATES[cur];
  val.textContent = Math.round(display);
  $('#curTag') && ($('#curTag').textContent = SYM[cur]);
}
$('#addMoney')?.addEventListener('click', ()=>{
  const inp = $('#addAmount'); if(!inp) return;
  const amtDisplay = Number(inp.value);
  if(!amtDisplay || amtDisplay<=0){ $('#balanceMsg').textContent='Enter valid amount.'; return; }
  STATE.balanceUSD += amtDisplay / RATES[STATE.currency];
  localStorage.setItem('smartshop-balanceUSD', String(STATE.balanceUSD));
  inp.value=''; $('#balanceMsg').textContent='Balance added.'; renderBalanceBox();
});

// Coupon & checkout

// Load saved coupon percent (persist between reloads)
STATE.couponPercent = Number(localStorage.getItem('smartshop-couponPct') || 0);

// Helper to set + persist + rerender
function setCoupon(pct) {
  STATE.couponPercent = pct;
  localStorage.setItem('smartshop-couponPct', String(pct));
  renderCartPage();
}

// Coupon: SMART10 / SMART20 / SMART30 (subtotal only)
$('#applyCoupon')?.addEventListener('click', () => {
  const inp = $('#coupon');
  const msg = $('#couponMsg');
  if (!inp || !msg) return;

  // normalize e.g. "smart-10" -> "SMART10"
  const code = (inp.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const map  = { SMART10: 10, SMART20: 20, SMART30: 30 };
  const pct  = map[code] || 0;

  if (STATE.cart.length === 0) {
    setCoupon(0);
    msg.textContent = 'Add items to your cart before applying a coupon.';
    msg.className = 'text-sm text-amber-600';
    return;
  }

  if (pct) {
    setCoupon(pct);
    msg.textContent = `${code} applied — ${pct}% off subtotal.`;
    msg.className = 'text-sm text-emerald-600';
  } else {
    setCoupon(0);
    msg.textContent = 'Invalid coupon. Use SMART10, SMART20, or SMART30.';
    msg.className = 'text-sm text-red-600';
  }
});


// ✅ Checkout with success toast popup and order saving
$('#checkoutBtn')?.addEventListener('click', ()=>{
  const { fin } = totalsUSD();

  // --- Basic checks ---
  if (STATE.cart.length === 0) return;
  if (STATE.balanceUSD < fin) return alert('Insufficient balance.');

  // --- Update balance & reset ---
  STATE.balanceUSD -= fin;
  localStorage.setItem('smartshop-balanceUSD', String(STATE.balanceUSD));
  STATE.isNewAccount = false;
  localStorage.setItem('smartshop-isNewAccount', 'false');

  // --- Create and save order ---
  const orderID = 'ORD' + Math.floor(10000 + Math.random() * 90000);
  const orders = JSON.parse(localStorage.getItem('smartshop-orders') || '[]');

  const order = {
    id: orderID,
    destination: "Dhaka, Bangladesh",
    deliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toLocaleDateString(),
    status: [
      { stage: "Order Confirmed", desc: "Your order has been placed successfully.", done: true },
      { stage: "Packaging",       desc: "Items are being packed for shipment.",     done: true },
      { stage: "Shipping",        desc: "Package is in transit with the courier.",  done: false },
      { stage: "Delivered",       desc: "Will be delivered soon.",                  done: false }
    ]
  };

  orders.push(order);
  localStorage.setItem('smartshop-orders', JSON.stringify(orders));
  localStorage.setItem('smartshop-lastOrderId', orderID); // helpful for prefill later

  // --- Reset cart ---
  STATE.cart = [];
  saveCart();
  STATE.couponPercent = 0;
  renderCartPage();
  renderBalanceBox();

  // --- Show success toast ---
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toastMsg');
  msg.textContent = `Your Order ID is ${orderID}. Track it on the Order page.`;
  toast.classList.remove('hidden');

  setTimeout(() => toast.classList.add('hidden'), 5000);
});


// Reviews
async function renderReviews(){
  const container = $('#reviewsCards'); if(!container) return;
  try{
    const res = await fetch('./reviews.json');
    const data = await res.json();
    container.innerHTML = data.map(r=>`
      <div class="rounded-2xl border bg-white dark:bg-gray-950 p-4 shadow-soft">
        <div class="flex items-center gap-3">
          <img src="${r.avatar}" class="h-10 w-10 rounded-full object-cover" alt="">
          <div class="leading-tight">
            <p class="font-semibold">${r.name}</p>
            <p class="text-xs opacity-70">${r.product} • ${new Date(r.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="mt-2">${stars(r.rating)}</div>
        <p class="text-sm mt-2 leading-6">${r.comment}</p>
      </div>
    `).join('');
  }catch(e){ console.error(e); }
}

// Footer + init
$('#year') && ($('#year').textContent = new Date().getFullYear());
$('#backToTop')?.addEventListener('click', e=>{ e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); });

window.addEventListener('DOMContentLoaded', async ()=>{
  setBadge();
  renderBalanceBox();

  if($('#productsGrid') && $('#catTitle')) { await renderCategoryPage(); }
  else if($('#productsGrid')) { await renderProducts(); }

  renderReviews();
  renderCartPage();
});
