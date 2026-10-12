/* Sparkora shared logic: storage, demo data, nav, premium, card linking, currency */
(function () {
'use strict';

/* ---------- CONFIG ---------- */
const CFG = {
  PRICE_USD: 5,
  // 'demo' = no real charge, nothing is sent anywhere.
  // To take real payments, set to 'live' and implement Payments.linkCard() below with Stripe (or similar).
  PAYMENT_MODE: 'demo'
};

/* ---------- HELPERS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const U = (id, w = 500) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&q=80&w=' + w;
const DEF_AV = 'photo-1534528741775-53994a69daeb';
const PH = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#42080e"/><circle cx="50" cy="38" r="16" fill="#7a1a24"/><rect x="20" y="60" width="60" height="40" rx="30" fill="#7a1a24"/></svg>');
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && !t.dataset.f) { t.dataset.f = '1'; t.src = PH; } }, true);

const store = {
  get(k, d) { try { const v = localStorage.getItem('sp_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sp_' + k, JSON.stringify(v)); return true; } catch (e) { toast('Storage is full. Remove a photo and try again.'); return false; } },
  del(k) { try { localStorage.removeItem('sp_' + k); } catch (e) {} }
};
function toast(t) { const o = $('.toast'); if (o) o.remove(); const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2800); }
function ago(ts) { const s = (Date.now() - ts) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }

/* ---------- DEMO PEOPLE ---------- */
const P = (id, name, age, dist, tags, photo, o) => Object.assign({ id, name, age, dist, tags, photo, verified: true, online: true, likesYou: false, space: 'any', bio: '' }, o || {});
const PEOPLE = [
  P(1, 'Sofia', 24, 2, ['Photographer', 'Coffee', 'Art', 'Hiking'], 'photo-1534528741775-53994a69daeb', { likesYou: true, bio: 'Chasing golden hour in the Mission. Always up for a coffee walk.' }),
  P(2, 'Jake', 27, 3, ['Fitness', 'Music', 'Travel'], 'photo-1500648767791-00dcc994a43e', { bio: 'Gym in the morning, live music at night.' }),
  P(3, 'Maya', 25, 5, ['Art', 'Yoga', 'Coffee'], 'photo-1494790108377-be9c29b29330', { bio: 'Sketchbook in my bag, matcha in my hand.' }),
  P(4, 'Noah', 29, 6, ['Adventure', 'Music', 'Hiking'], 'photo-1492562080023-ab3db95bfbce', { bio: 'Weekend trail runner and amateur guitarist.' }),
  P(5, 'Aria', 31, 8, ['Fitness', 'Coffee', 'Art'], 'photo-1531746020798-e6953c6e8e04', { verified: false, bio: 'New in town, show me your favorite spots.' }),
  P(6, 'Ethan', 34, 9, ['Music', 'Adventure', 'Film'], 'photo-1472099645785-5658abf4ff4e', { bio: 'Film nerd. Will fight you over the best soundtrack.' }),
  P(7, 'Chloe', 22, 4, ['Art', 'Music', 'Coffee'], 'photo-1438761681033-6461ffad8d80', { bio: 'Illustrator. Vinyl collector. Terrible at parallel parking.' }),
  P(8, 'Liam', 23, 7, ['Fitness', 'Coffee', 'Gaming'], 'photo-1507003211169-0a1dd7228f2d', { online: false, bio: 'Barista by day, gamer by night.' }),
  P(11, 'Luna', 26, 4, ['Hiking', 'Music', 'Books'], 'photo-1517841905240-472988babdf9', { space: 'lesbian', likesYou: true, bio: 'Bookshop regular and trail enthusiast.' }),
  P(12, 'Zoe', 28, 7, ['Art', 'Yoga', 'Cooking'], 'photo-1544005313-94ddf0286df2', { space: 'lesbian', bio: 'Ceramics, yoga and big pots of soup.' }),
  P(13, 'Ivy', 25, 3, ['Fitness', 'Travel', 'Film'], 'photo-1438761681033-6461ffad8d80', { space: 'lesbian', bio: 'Always planning the next trip.' }),
  P(14, 'Mia', 30, 9, ['Coffee', 'Books', 'Art'], 'photo-1531746020798-e6953c6e8e04', { space: 'lesbian', bio: 'Museum dates are my love language.' }),
  P(21, 'Leo', 29, 6, ['Cooking', 'Film', 'Dogs'], 'photo-1507003211169-0a1dd7228f2d', { space: 'gay', likesYou: true, bio: 'Chef, dog dad, cinema lover.' }),
  P(22, 'Eli', 26, 8, ['Adventure', 'Books', 'Gym'], 'photo-1506794778202-cad84cf45f1d', { space: 'gay', bio: 'Climbing walls and reading on rooftops.' }),
  P(23, 'Kai', 27, 3, ['Music', 'Fitness', 'Travel'], 'photo-1519085360753-af0119f7cbe7', { space: 'gay', bio: 'DJ on weekends. Beach person always.' }),
  P(24, 'Theo', 31, 5, ['Art', 'Coffee', 'Hiking'], 'photo-1500648767791-00dcc994a43e', { space: 'gay', bio: 'Gallery curator who loves a long hike.' })
];
const byId = id => PEOPLE.find(p => p.id === +id);

/* ---------- STATE ---------- */
const DEF_PROFILE = { name: 'Alex', age: 25, gender: '', bio: '', city: 'San Francisco, CA', interests: ['Adventure', 'Coffee'], looking: ['Dating'], photos: [], showMe: true };
const DEF_F = { active: true, ageMin: 22, ageMax: 32, dist: 10, interests: ['Adventure'], custom: [], looking: ['Dating', 'Friends', 'Relationship'], verified: true };
const DEF_SET = { units: 'km', notifs: true, showOnline: true };
const profile = () => Object.assign({}, DEF_PROFILE, store.get('profile', {}));
const setProfile = o => store.set('profile', o);
const filters = () => Object.assign({}, DEF_F, store.get('filters', {}));
const setFilters = o => store.set('filters', o);
const settings = () => Object.assign({}, DEF_SET, store.get('settings', {}));
const setSettings = o => store.set('settings', o);
const matches = () => store.get('matches', []);
const likes = () => store.get('likes', []);
const seen = () => store.get('seen', []);
const threads = () => store.get('threads', {});
const notifs = () => store.get('notifs', []);
const boost = () => store.get('boost', { credits: 1, until: 0 });
const card = () => store.get('card', null);
const premium = () => store.get('premium', { active: false });
const isPremium = () => !!premium().active;
const avatar = () => { const p = profile(); return (p.photos && p.photos[0]) || U(DEF_AV, 100); };
const dist = km => settings().units === 'mi' ? Math.max(1, Math.round(km * 0.621)) + ' mi' : km + ' km';
function score() {
  const p = profile(); let s = 0;
  if (p.name) s += 10; if (p.age >= 18) s += 10; if ((p.bio || '').trim().length >= 20) s += 20;
  s += Math.min(3, (p.photos || []).length) * 10; if (p.city) s += 10; if ((p.interests || []).length >= 3) s += 20;
  return s;
}
function seed() {
  if (store.get('seeded')) return;
  const now = Date.now();
  store.set('matches', [3, 2, 7]);
  store.set('threads', { 3: [{ f: 'them', t: 'Hey! Loved your photos 😊', ts: now - 36e5 }], 2: [{ f: 'them', t: 'Coffee this weekend?', ts: now - 72e5 }], 7: [{ f: 'me', t: "Haha that's awesome!", ts: now - 864e5 }] });
  store.set('unread', [3, 2]);
  store.set('notifs', [
    { id: 1, t: 'Sofia liked your profile', ic: 'bi-heart-fill', ts: now - 12e4, r: false },
    { id: 2, t: 'You have a new match with Maya', ic: 'bi-chat-heart-fill', ts: now - 36e5, r: false },
    { id: 3, t: 'Chloe viewed your profile', ic: 'bi-eye-fill', ts: now - 864e5, r: true }]);
  store.set('seeded', 1);
}
seed();
function notify(t, ic) { const n = notifs(); n.unshift({ id: Date.now(), t, ic: ic || 'bi-bell-fill', ts: Date.now(), r: false }); store.set('notifs', n.slice(0, 50)); }
function addMatch(id) { const m = matches(); if (!m.includes(id)) { m.push(id); store.set('matches', m); notify("It's a match with " + byId(id).name + '!', 'bi-chat-heart-fill'); } }
function unmatch(id) { store.set('matches', matches().filter(x => x !== +id)); }
function pass(id) { const s = seen(); if (!s.includes(id)) { s.push(id); store.set('seen', s); } }
function like(id, sup) {
  const p = byId(id), l = likes();
  if (!l.find(x => x.id === id)) l.push({ id, sup: !!sup, ts: Date.now() });
  store.set('likes', l); pass(id);
  if ((sup || p.likesYou) && !matches().includes(id)) { addMatch(id); return 'match'; }
  return 'liked';
}
function likeFlow(id, sup) {
  const r = like(id, sup), p = byId(id);
  if (r === 'match') matchModal(p); else toast('You liked ' + p.name + (sup ? ' with a Super Like' : ''));
  return r;
}
function sendMsg(id, text) { const th = threads(); (th[id] = th[id] || []).push({ f: 'me', t: text, ts: Date.now() }); store.set('threads', th); }
function markRead(id) { store.set('unread', store.get('unread', []).filter(x => x !== +id)); }
function boostActive() { return boost().until > Date.now(); }
function activateBoost() {
  const b = boost(); if (b.until > Date.now()) return 'active'; if (b.credits < 1) return 'none';
  b.credits--; b.until = Date.now() + 30 * 60 * 1000; store.set('boost', b); notify('Your Boost is active for 30 minutes', 'bi-lightning-fill'); return 'ok';
}
function addBoosts(n) { const b = boost(); b.credits += n; store.set('boost', b); }

/* ---------- MODALS ---------- */
function modal(html) {
  const b = document.createElement('div'); b.className = 'mback';
  b.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(b);
  const k = e => { if (e.key === 'Escape') close(); };
  const close = () => { b.remove(); document.removeEventListener('keydown', k); };
  document.addEventListener('keydown', k);
  b.addEventListener('mousedown', e => { if (e.target === b) close(); });
  b.close = close; $$('[data-close]', b).forEach(x => x.onclick = close);
  return b;
}
function confirmBox(o) {
  return new Promise(res => {
    const b = modal('<div class="mh"><h3>' + esc(o.title) + '</h3></div><p class="sub">' + esc(o.body) + '</p><button class="btn full" data-ok>' + esc(o.ok || 'Confirm') + '</button><button class="btn ghost full" data-close>Cancel</button>');
    let done = false;
    $('[data-ok]', b).onclick = () => { done = true; b.close(); res(true); };
    new MutationObserver((m, ob) => { if (!document.body.contains(b)) { ob.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true });
  });
}
function matchModal(p) {
  modal('<div class="center"><div class="mt">It\'s a match!</div><p>You and ' + esc(p.name) + ' liked each other.</p><div class="pair"><img src="' + avatar() + '" alt="You"><img src="' + U(p.photo, 200) + '" alt="' + esc(p.name) + '"></div><a class="btn full" href="messages.html?c=' + p.id + '">Send a message</a><button class="btn ghost full" data-close>Keep swiping</button></div>');
}
function viewProfile(p) {
  const m = matches().includes(p.id);
  const b = modal('<img src="' + U(p.photo, 700) + '" alt="' + esc(p.name) + '" style="width:100%;height:320px;object-fit:cover;border-radius:16px"><div style="margin:12px 0 4px;font-size:20px;font-weight:900">' + esc(p.name) + ', ' + p.age + (p.verified ? ' <i class="bi bi-patch-check-fill vf"></i>' : '') + '</div><div class="sub" style="margin-bottom:8px"><i class="bi bi-geo-alt-fill" style="color:#ef4444"></i> ' + dist(p.dist) + ' away</div><p class="sub">' + esc(p.bio || 'No bio yet.') + '</p><div class="tags">' + p.tags.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' +
    (m ? '<a class="btn full" href="messages.html?c=' + p.id + '">Message</a>' : '<button class="btn full" data-like>Like</button>') + '<button class="btn ghost full" data-close>Close</button>');
  const l = $('[data-like]', b); if (l) l.onclick = () => { b.close(); likeFlow(p.id, false); window.dispatchEvent(new Event('sp:change')); };
}
function openMore() {
  modal('<div class="mh"><h3>More</h3><button class="ib" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div><div class="morelist"><a href="boosts.html"><i class="bi bi-lightning-fill"></i>Boosts</a><a href="events.html"><i class="bi bi-geo-alt"></i>Events</a><a href="search.html"><i class="bi bi-search"></i>Search</a><a href="notifications.html"><i class="bi bi-bell"></i>Notifications</a><a href="profile.html"><i class="bi bi-person"></i>My profile</a><a href="settings.html"><i class="bi bi-gear"></i>Settings</a></div>');
}

/* ---------- NAV ---------- */
function mountNav(active) {
  $('#spNav') && $('#spNav').remove(); $('#spTab') && $('#spTab').remove();
  const mc = matches().length, uc = store.get('unread', []).length, nr = notifs().filter(n => !n.r).length, prem = isPremium();
  const lk = (h, k, label, ic, c) => '<a href="' + h + '" class="lk' + (active === k ? ' on' : '') + '">' + (ic ? '<i class="bi ' + ic + '"></i>' : '') + '<span>' + label + '</span>' + (c ? '<span class="cnt">' + c + '</span>' : '') + '</a>';
  document.body.insertAdjacentHTML('afterbegin',
    '<nav class="nav" id="spNav"><div class="nav-in"><div class="brand-wrap"><a class="logo" href="index.html"><i class="bi bi-fire"></i><span>Sparkora</span></a>' +
    '<button class="pro" id="proBadge" aria-label="Premium"><span>PRO</span><small>' + (prem ? 'Premium' : 'Upgrade') + '</small></button></div>' +
    '<div class="links">' + lk('index.html', 'discover', 'Discover') + lk('matches.html', 'matches', 'Matches', '', mc || '') + lk('messages.html', 'messages', 'Messages', '', uc || '') + lk('pride.html', 'pride', 'Pride', prem ? 'bi-rainbow' : 'bi-lock-fill') + lk('boosts.html', 'boosts', 'Boosts', 'bi-lightning-fill') + lk('events.html', 'events', 'Events', 'bi-geo-alt') + '</div>' +
    '<div class="acts"><a class="ib" href="search.html" aria-label="Search"><i class="bi bi-search"></i></a><a class="ib" href="notifications.html" aria-label="Notifications"><i class="bi bi-bell"></i>' + (nr ? '<span class="dot"></span>' : '') + '</a>' +
    '<a class="ib hide-m" href="settings.html" aria-label="Settings"><i class="bi bi-gear"></i></a><a class="av" href="profile.html" aria-label="My profile"><img src="' + avatar() + '" alt="You"><i></i></a>' +
    '<a class="boostnow hide-m" href="boosts.html"><i class="bi bi-lightning-fill"></i><span>Boost Now</span></a></div></div></nav>');
  const tb = (h, k, ic, label, c) => '<a href="' + h + '" class="' + (active === k ? 'on' : '') + '"><i class="bi ' + ic + '"></i><span>' + label + '</span>' + (c ? '<span class="cnt">' + c + '</span>' : '') + '</a>';
  document.body.insertAdjacentHTML('beforeend',
    '<div class="tabbar" id="spTab">' + tb('index.html', 'discover', 'bi-fire', 'Discover') + tb('matches.html', 'matches', 'bi-heart-fill', 'Matches', mc || '') + tb('messages.html', 'messages', 'bi-chat-fill', 'Messages', uc || '') + tb('pride.html', 'pride', prem ? 'bi-rainbow' : 'bi-lock-fill', 'Pride') + '<button id="moreBtn"><i class="bi bi-grid-fill"></i><span>More</span></button></div>');
  $('#moreBtn').onclick = openMore;
  $('#proBadge').onclick = () => { if (isPremium()) location.href = 'settings.html#billing'; else openPremium(); };
}

/* ---------- RANGE SLIDERS ---------- */
function dual(el, o) {
  el.classList.add('dual');
  el.innerHTML = '<div class="tr"><div class="fil"></div></div><input type="range" aria-label="Minimum"><input type="range" aria-label="Maximum">';
  const [a, b] = $$('input', el), fl = $('.fil', el);
  [a, b].forEach(i => { i.min = o.min; i.max = o.max; i.step = 1; });
  a.value = o.lo; b.value = o.hi;
  const draw = () => { const r = o.max - o.min; fl.style.left = ((a.value - o.min) / r * 100) + '%'; fl.style.right = (100 - (b.value - o.min) / r * 100) + '%'; a.style.zIndex = (+a.value > o.min + r / 2) ? 3 : 1; b.style.zIndex = 2; };
  a.addEventListener('input', () => { if (+a.value > +b.value - 1) a.value = +b.value - 1; draw(); o.onChange(+a.value, +b.value); });
  b.addEventListener('input', () => { if (+b.value < +a.value + 1) b.value = +a.value + 1; draw(); o.onChange(+a.value, +b.value); });
  draw();
}
function single(el, o) {
  el.classList.add('rng'); el.min = o.min; el.max = o.max; el.step = o.step || 1; el.value = o.value;
  const draw = () => el.style.setProperty('--p', ((el.value - o.min) / (o.max - o.min) * 100) + '%');
  el.addEventListener('input', () => { draw(); o.onChange(+el.value); }); draw();
}

/* ---------- PHOTOS ---------- */
function resizeImage(file, max) {
  max = max || 900;
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); };
      im.onerror = rej; im.src = r.result;
    };
    r.onerror = rej; r.readAsDataURL(file);
  });
}
function cardHTML(p, btn) {
  return '<div class="pcard"><img src="' + U(p.photo, 500) + '" alt="' + esc(p.name) + '" loading="lazy"><div class="pi"><div class="nm">' + esc(p.name) + ', ' + p.age + (p.verified ? ' <i class="bi bi-patch-check-fill vf"></i>' : '') + '</div><div class="loc"><i class="bi bi-geo-alt-fill"></i> ' + dist(p.dist) + ' away' + (p.online ? ' • Online' : '') + '</div><div class="tags">' + p.tags.slice(0, 3).map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' + (btn || '') + '</div></div>';
}

/* ---------- PRICING: IP -> local currency ---------- */
let pricingP;
async function tfetch(u, ms) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 4000);
  try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('bad'); return await r.json(); } finally { clearTimeout(t); }
}
function getPricing() {
  if (pricingP) return pricingP;
  pricingP = (async () => {
    let out = store.get('pricing', null);
    if (!out || Date.now() - out.ts > 12 * 36e5) {
      let cur = 'USD', cc = '', rates = null;
      try { const g = await tfetch('https://ipapi.co/json/'); cur = g.currency || cur; cc = g.country_code || ''; }
      catch (e) { try { const g = await tfetch('https://ipwho.is/'); cur = (g.currency && g.currency.code) || cur; cc = g.country_code || ''; } catch (e2) {} }
      try { const r = await tfetch('https://open.er-api.com/v6/latest/USD'); rates = r.rates; } catch (e) {}
      if (!rates || !rates[cur]) cur = 'USD';
      out = { ts: Date.now(), cur, cc, rates: rates || { USD: 1 }, rate: (rates && rates[cur]) || 1 };
      if (rates) store.set('pricing', out);
    }
    out = Object.assign({}, out);
    const pref = store.get('curPref', null);
    if (pref && out.rates[pref]) { out.cur = pref; out.rate = out.rates[pref]; }
    return out;
  })();
  return pricingP;
}
function money(usd, pr) {
  const v = usd * pr.rate, o = { style: 'currency', currency: pr.cur };
  if (v >= 100) { o.maximumFractionDigits = 0; o.minimumFractionDigits = 0; }
  try { return new Intl.NumberFormat(undefined, o).format(v); } catch (e) { return 'US$' + usd.toFixed(2); }
}
function hydrate() {
  getPricing().then(pr => $$('[data-price]').forEach(el => { el.textContent = money(+el.dataset.price, pr); }));
}

/* ---------- PAYMENTS ---------- */
const Payments = {
  // Replace this with your real provider. With Stripe: collect the card using Stripe Elements
  // (so raw card numbers never touch your code), create a subscription on your server, return {brand,last4}.
  async linkCard(c) {
    if (CFG.PAYMENT_MODE === 'demo') { await new Promise(r => setTimeout(r, 1200)); return { brand: cardBrand(c.number) || 'Card', last4: c.number.slice(-4) }; }
    throw new Error('Payment provider is not connected yet.');
  }
};
const COUNTRIES = 'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');
function countryOpts(sel) {
  let dn; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}
  return COUNTRIES.map(c => { let n = c; try { n = dn ? dn.of(c) : c; } catch (e) {} return [c, n]; }).sort((a, b) => a[1].localeCompare(b[1]))
    .map(x => '<option value="' + x[0] + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('');
}
function cardBrand(d) {
  if (/^4/.test(d)) return 'Visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'; if (/^3[47]/.test(d)) return 'Amex';
  if (/^(6011|65|64[4-9])/.test(d)) return 'Discover'; if (/^(62|81)/.test(d)) return 'UnionPay'; if (/^35/.test(d)) return 'JCB'; return '';
}
function luhn(n) { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; }

function openCard(o) {
  o = o || {}; const mode = o.mode || 'card', prem = mode === 'premium';
  const b = modal(
    '<div class="mh"><h3>' + (prem ? 'Go Premium' : 'Link payment card') + '</h3><button class="ib" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div>' +
    (prem ? '<div class="plan"><div class="plan-n">Pride Premium</div><div class="plan-p"><b id="pp">…</b><span> / month</span></div><div class="plan-s" id="ps">US$5.00 per month · cancel anytime</div><ul class="plan-l"><li>Sapphic Sparks: women who love women</li><li>Gay Flames: men who love men</li><li>Cancel anytime in Settings</li></ul></div>' : '') +
    '<form id="cf" novalidate>' +
    '<label class="lb" for="cn">Name on card</label><input class="in" id="cn" autocomplete="cc-name" placeholder="Full name">' +
    '<label class="lb" for="cc">Card number</label><div class="cnw"><input class="in" id="cc" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456"><span class="brand" id="cb"></span></div>' +
    '<div class="two"><div><label class="lb" for="ce">Expiry</label><input class="in" id="ce" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY"></div><div><label class="lb" for="cv">CVC</label><input class="in" id="cv" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4"></div></div>' +
    '<div class="two"><div><label class="lb" for="ct">Country</label><select class="in" id="ct" autocomplete="country">' + countryOpts('US') + '</select></div><div><label class="lb" for="cz">Postal code</label><input class="in" id="cz" autocomplete="postal-code" placeholder="Postal code"></div></div>' +
    (prem ? '<label class="lb" for="cur">Currency</label><select class="in" id="cur"><option>USD</option></select>' : '') +
    '<div class="err" id="cerr" role="alert"></div><button class="btn full" id="cs" type="submit">' + (prem ? 'Subscribe' : 'Save card') + '</button>' +
    '<p class="fine"><i class="bi bi-lock-fill"></i> Your card is sent securely to the payment provider. Sparkora keeps only the card type and last 4 digits.' + (CFG.PAYMENT_MODE === 'demo' ? ' <b>Demo mode: no real charge is made.</b>' : '') + '</p></form>');
  const f = $('#cf', b), cc = $('#cc', b), ce = $('#ce', b), cv = $('#cv', b), btn = $('#cs', b);
  let curPr = null, touchedCountry = false;
  const label = () => { if (prem && curPr) btn.textContent = 'Subscribe · ' + money(CFG.PRICE_USD, curPr) + ' / month'; };
  const upd = pr => {
    curPr = pr;
    if (prem) {
      $('#pp', b).textContent = money(CFG.PRICE_USD, pr);
      $('#ps', b).textContent = pr.cur === 'USD' ? 'US$5.00 per month · cancel anytime' : 'Based on US$5.00 per month · ' + pr.cur + ' · cancel anytime';
      label();
    }
  };
  getPricing().then(pr => {
    if (!document.body.contains(b)) return;
    upd(pr);
    if (pr.cc && COUNTRIES.includes(pr.cc) && !touchedCountry) $('#ct', b).value = pr.cc;
    if (prem) {
      const sel = $('#cur', b); let dn; try { dn = new Intl.DisplayNames(['en'], { type: 'currency' }); } catch (e) {}
      sel.innerHTML = Object.keys(pr.rates).sort().map(c => { let n = ''; try { n = dn ? ' – ' + dn.of(c) : ''; } catch (e) {} return '<option value="' + c + '"' + (c === pr.cur ? ' selected' : '') + '>' + c + n + '</option>'; }).join('');
      sel.onchange = () => { store.set('curPref', sel.value); upd(Object.assign({}, pr, { cur: sel.value, rate: pr.rates[sel.value] })); };
    }
  });
  $('#ct', b).addEventListener('change', () => touchedCountry = true);
  cc.addEventListener('input', () => {
    let d = cc.value.replace(/\D/g, ''); const br = cardBrand(d); d = d.slice(0, br === 'Amex' ? 15 : 19);
    cc.value = br === 'Amex' ? [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(' ') : d.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('#cb', b).textContent = br;
  });
  ce.addEventListener('input', () => { let d = ce.value.replace(/\D/g, '').slice(0, 4); if (d.length >= 3) d = d.slice(0, 2) + ' / ' + d.slice(2); ce.value = d; });
  cv.addEventListener('input', () => { cv.value = cv.value.replace(/\D/g, '').slice(0, 4); });
  function validate() {
    const name = $('#cn', b).value.trim(), num = cc.value.replace(/\D/g, ''), ex = ce.value.replace(/\D/g, ''), cvc = cv.value, zip = $('#cz', b).value.trim();
    if (name.length < 2) return 'Enter the name on your card.';
    if (num.length < 13 || !luhn(num)) return 'That card number does not look right.';
    const m = +ex.slice(0, 2), y = 2000 + +ex.slice(2), n = new Date();
    if (ex.length < 4 || m < 1 || m > 12 || y < n.getFullYear() || (y === n.getFullYear() && m < n.getMonth() + 1)) return 'Enter a valid expiry date.';
    if (cvc.length < (cardBrand(num) === 'Amex' ? 4 : 3)) return 'Enter the security code (CVC).';
    if (!zip) return 'Enter your postal code.';
    return '';
  }
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const er = validate(); $('#cerr', b).textContent = er; if (er) return;
    btn.disabled = true; btn.textContent = 'Processing…';
    try {
      const data = { name: $('#cn', b).value.trim(), number: cc.value.replace(/\D/g, ''), exp: ce.value, cvc: cv.value, country: $('#ct', b).value, postal: $('#cz', b).value.trim() };
      const res = await Payments.linkCard(data);
      f.reset();
      store.set('card', { brand: res.brand, last4: res.last4, country: data.country });
      if (prem) await activatePremium(res, curPr);
      b.close(); toast(prem ? 'Welcome to Premium!' : 'Card linked');
      mountNav(document.body.dataset.nav || ''); window.dispatchEvent(new Event('sp:premium'));
      if (o.onDone) o.onDone();
    } catch (err) { btn.disabled = false; label(); if (!prem) btn.textContent = 'Save card'; $('#cerr', b).textContent = err.message || 'Something went wrong. Please try again.'; }
  });
}
async function activatePremium(c, pr) {
  pr = pr || await getPricing();
  store.set('premium', { active: true, since: Date.now(), next: Date.now() + 30 * 864e5, cur: pr.cur, price: money(CFG.PRICE_USD, pr), brand: c.brand, last4: c.last4 });
  notify('Pride Premium is active', 'bi-rainbow');
}
async function openPremium(onDone) {
  const c = card();
  if (!c) return openCard({ mode: 'premium', onDone });
  const pr = await getPricing(), price = money(CFG.PRICE_USD, pr);
  const b = modal('<div class="mh"><h3>Go Premium</h3><button class="ib" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button></div><div class="plan"><div class="plan-n">Pride Premium</div><div class="plan-p"><b>' + esc(price) + '</b><span> / month</span></div></div><p class="sub" style="margin-top:10px">Pay with ' + esc(c.brand) + ' ending in ' + esc(c.last4) + '?</p><button class="btn full" data-ok>Subscribe · ' + esc(price) + ' / month</button><button class="btn ghost full" data-other>Use a different card</button>');
  $('[data-ok]', b).onclick = async () => { await activatePremium(c, pr); b.close(); toast('Welcome to Premium!'); mountNav(document.body.dataset.nav || ''); window.dispatchEvent(new Event('sp:premium')); if (onDone) onDone(); };
  $('[data-other]', b).onclick = () => { b.close(); openCard({ mode: 'premium', onDone }); };
}
function requireCard(cb) { if (card()) cb(); else openCard({ mode: 'card', onDone: cb }); }
function cancelPremium() { store.set('premium', { active: false }); notify('Premium was cancelled', 'bi-x-circle'); }
function removeCard() { store.del('card'); }

/* ---------- PUBLIC ---------- */
window.S = { $, $$, esc, U, store, toast, ago, people: PEOPLE, byId, profile, setProfile, filters, setFilters, settings, setSettings, matches, likes, seen, threads, notifs, boost, card, premium, isPremium, avatar, dist, score,
  notify, addMatch, unmatch, pass, like, likeFlow, sendMsg, markRead, boostActive, activateBoost, addBoosts, modal, confirmBox, matchModal, viewProfile, mountNav: a => { document.body.dataset.nav = a; mountNav(a); }, dual, single, resizeImage, cardHTML,
  pricing: getPricing, money, hydrate, openCard, openPremium, requireCard, cancelPremium, removeCard, CFG };
})();
