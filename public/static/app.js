import { calculatePricing } from './calculator.mjs';
const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const safeStorage = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k,v) { try { localStorage.setItem(k,v); } catch {} } };
let consent = safeStorage.get('amariva-analytics');
let sessionId;
try { sessionId = sessionStorage.getItem('amariva-session'); } catch {}
const source = new URLSearchParams(location.search);
const dimension = (value) => (value || '').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
let attribution = { source: dimension(source.get('utm_source')) || 'direct', campaign: dimension(source.get('utm_campaign')) || '' };
try { if (source.has('utm_source')) sessionStorage.setItem('amariva-source', JSON.stringify(attribution)); else attribution = JSON.parse(sessionStorage.getItem('amariva-source') || 'null') || attribution; } catch {}
async function api(path, payload) {
 const response = await fetch(path, { method: payload === undefined ? 'GET' : 'POST', headers: payload === undefined ? {} : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(data.error || 'Layanan belum tersedia. Silakan coba lagi.');
 return data;
}
async function track(name, dimensions = {}) {
 if (consent !== 'yes' || /^\/(internal|account|auth)(\/|$)/.test(location.pathname)) return;
 if (!sessionId) { sessionId = crypto.randomUUID(); try { sessionStorage.setItem('amariva-session', sessionId); } catch {} }
 try { await api('/api/events', { id: crypto.randomUUID(), name, sessionId, page: location.pathname, source: attribution.source, campaign: attribution.campaign, device: matchMedia('(max-width:760px)').matches ? 'mobile' : 'desktop', consent: true, ...dimensions }); } catch {} // Optional analytics must never block a tool.
}
$('nav-toggle')?.addEventListener('click', () => { const open = $('main-navigation').classList.toggle('open'); $('nav-toggle').setAttribute('aria-expanded', String(open)); });
function updateConsent(value) { consent = value; safeStorage.set('amariva-analytics',value); $('consent-notice').hidden = true; if (value === 'yes') track('page_view'); else { sessionId = null; try { sessionStorage.removeItem('amariva-session'); } catch {} } }
$('consent-notice').hidden = consent !== null;
$('consent-yes')?.addEventListener('click', () => updateConsent('yes'));
$('consent-no')?.addEventListener('click', () => updateConsent('no'));
$('privacy-settings')?.addEventListener('click', () => { $('consent-notice').hidden = false; $('consent-yes').focus(); });
track('page_view');
if (location.pathname.startsWith('/products/')) { track('product_view',{product:'pricing-kit'}); track('offer_view',{offer:'pricing-kit-entry'}); }
let result, inputs, started = false, completions = 0;
$('pricing-form')?.addEventListener('input', () => { if (!started) { started = true; track('tool_start',{tool:'pricing'}); } });
$('pricing-form')?.addEventListener('submit', (event) => {
 event.preventDefault();
 const error = $('tool-error'); error.hidden = true;
 try {
  inputs = Object.fromEntries([...new FormData(event.target)].map(([k,v]) => [k,Number(v)]));
  result = calculatePricing(inputs);
  if (!started) { started = true; track('tool_start',{tool:'pricing'}); }
  $('result-empty').hidden = true; $('result-content').hidden = false;
  $('result-margin').textContent = result.margin.toLocaleString('id-ID',{maximumFractionDigits:2}) + '%';
  $('result-margin').classList.toggle('warning',!result.safe);
  $('result-contribution').textContent = money(result.contribution);
  $('result-bep').textContent = result.breakEven === null ? 'Tidak tercapai' : result.breakEven.toLocaleString('id-ID') + ' unit';
  $('result-profit').textContent = money(result.profit);
  $('result-minimum').textContent = money(Math.ceil(result.minimumPrice));
  $('result-meaning').textContent = result.contribution <= 0 ? 'Setiap penjualan belum menutup biaya variabel dan fee. Menambah volume dengan harga ini tidak menutup biaya tetap.' : `${money(result.contribution)} per unit tersisa untuk menutup biaya tetap. Pada ${inputs.units.toLocaleString('id-ID')} unit, estimasi ${result.profit >= 0 ? 'laba' : 'rugi'} operasional adalah ${money(Math.abs(result.profit))}.`;
  $('result-next').textContent = result.contribution <= 0 ? 'Naikkan harga atau kurangi biaya per unit. Uji kembali sebelum menambah penjualan.' : result.profit < 0 ? `Target penjualan belum menutup biaya tetap. Uji volume minimal ${result.breakEven.toLocaleString('id-ID')} unit, atau harga minimal ${money(Math.ceil(result.minimumPrice))}.` : 'Uji skenario volume yang lebih rendah dan biaya yang lebih tinggi. Pastikan target penjualan realistis; hasil positif belum memperhitungkan pajak dan investasi awal.';
  track('tool_complete',{tool:'pricing'}); track('result_view',{tool:'pricing'});
  if (completions++) track('repeat_use',{tool:'pricing'});
  if (matchMedia('(max-width:760px)').matches) $('pricing-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
 } catch (err) { error.textContent = err.message; error.hidden = false; }
});
$('export-result')?.addEventListener('click', () => {
 if (!result) return;
 const rows = [['AMARIVA - estimasi operasional','Nilai'],['Biaya variabel per unit',inputs.cost],['Harga jual',inputs.price],['Fee (%)',inputs.fee],['Biaya tetap',inputs.fixed],['Target unit',inputs.units],['Margin kontribusi (%)',result.margin],['Kontribusi per unit',result.contribution],['BEP unit',result.breakEven ?? 'Tidak tercapai'],['Estimasi laba',result.profit],['Harga minimum (dibulatkan ke atas)',Math.ceil(result.minimumPrice)],['Batasan','Belum termasuk pajak dan investasi awal. Bukan nasihat keuangan.']];
 const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
 const a = document.createElement('a'); a.href=url; a.download='amariva-pricing-result.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function submitForm(formId,statusId,endpoint,transform,success) {
 $(formId)?.addEventListener('submit',async event => {
  event.preventDefault(); const form = event.target, status = $(statusId), btn = form.querySelector('button[type=submit]');
  btn.disabled=true; status.textContent='Memproses…';
  try { const data = await api(endpoint,transform(Object.fromEntries(new FormData(form)))); status.textContent=typeof success==='function'?success(data):success; if(formId!=='checkout-form')form.reset(); }
  catch (err) { status.textContent=err.message; }
  finally { btn.disabled=false; }
 });
}
submitForm('lead-form','lead-status','/api/leads',v=>({email:v.email,consent:v.consent==='on',source:attribution.source,campaign:attribution.campaign}), 'Minat Anda tersimpan. Kami belum menjanjikan jadwal peluncuran atau email otomatis.');
submitForm('contact-form','contact-status','/api/contact',v=>({...v,consent:v.consent==='on'}),data=>`Permintaan tersimpan. Referensi: ${data.id}. Simpan nomor ini untuk tindak lanjut.`);
let checkoutKey = crypto.randomUUID();
submitForm('checkout-form','checkout-status','/api/checkout',v=>({email:v.email,terms:v.terms==='on',idempotencyKey:checkoutKey,source:attribution.source}),data=>{location.assign(data.url);return 'Membuka pembayaran aman…';});
submitForm('login-form','login-status','/api/auth/request',v=>({email:v.email}), 'Jika ada pembelian yang sesuai, tautan masuk akan dikirim ke email Anda.');
function escape(v) { return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
async function loadOrders() {
 if (!$('orders-panel')) return;
 try {
  const data = await api('/api/orders');
  if (!data.orders.length) { $('orders-panel').innerHTML='<h2>Belum ada pembelian.</h2><p>Gunakan email pembelian untuk masuk, atau mulai dari tool gratis.</p>'; return; }
  $('orders-panel').innerHTML='<h2>Pembelian Anda</h2>'+data.orders.map(o=>`<article class="order-card"><h3>Pricing Decision Kit</h3><p>Order ${escape(o.id)} · ${escape(o.status)} · ${money(o.amount)}</p>${o.status==='paid'?`<a class="button" href="/api/download/${encodeURIComponent(o.id)}">Unduh toolkit ↓</a><p>Mulai dari panduan penggunaan, lalu isi workbook dengan data Anda.</p>`:'<p>Akses tersedia setelah pembayaran terverifikasi. Jika sudah membayar, tunggu sebentar atau hubungi bantuan.</p>'}</article>`).join('')+'<button id="logout" class="text-button">Keluar dari akses pembelian</button>';
  $('logout')?.addEventListener('click',async()=>{await api('/api/auth/logout',{});location.reload();});
 } catch(err) { $('orders-panel').textContent=err.message; }
}
submitForm('verify-form','verify-status','/api/auth/verify',()=>({token:new URLSearchParams(location.search).get('token')}),()=>{history.replaceState(null,'','/auth/verify');location.assign('/account');return 'Akses terverifikasi.';});
loadOrders();
if (location.pathname==='/checkout/success') { let attempts=0; const timer=setInterval(()=>{loadOrders();if(++attempts>=8)clearInterval(timer);},4000); }
