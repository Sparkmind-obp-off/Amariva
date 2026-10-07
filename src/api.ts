import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { bodyLimit } from 'hono/body-limit'
import { Bindings, commerceReady, emailAdapter, paymentAdapter } from './providers'
import { sha256, constantEqual, verifyStripeSignature, sanitizeDimension, safePath } from './security.mjs'
import { browserEvents, validateEmail, canSettle } from '../public/static/calculator.mjs'
import { product, paths } from './content'
import { kitBase64 } from './private-kit'
const app = new Hono<{ Bindings: Bindings }>()
const now = () => Math.floor(Date.now()/1000)
const token = () => crypto.randomUUID()+crypto.randomUUID()
const origin = (c: any) => c.env.PUBLIC_ORIGIN || new URL(c.req.url).origin
export async function housekeeping(db: D1Database) {
 const result = await db.prepare("INSERT INTO maintenance(id,last_run) VALUES ('cleanup',?) ON CONFLICT(id) DO UPDATE SET last_run=excluded.last_run WHERE maintenance.last_run < ? RETURNING id").bind(now(),now()-3600).first();
 if (!result) return;
 await db.batch([
  db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now()-86400),
  db.prepare('DELETE FROM access_tokens WHERE expires_at < ?').bind(now()),
  db.prepare('DELETE FROM events WHERE created_at < ?').bind(now()-90*86400),
  db.prepare('DELETE FROM tool_sessions WHERE created_at < ?').bind(now()-90*86400),
  db.prepare('DELETE FROM visitors WHERE created_at < ? AND id NOT IN (SELECT visitor_id FROM tool_sessions)').bind(now()-90*86400),
  db.prepare("DELETE FROM leads WHERE updated_at < ? AND email NOT IN (SELECT c.email FROM customers c JOIN transactions t ON t.customer_id=c.id WHERE t.status IN ('paid','refunded'))").bind(now()-180*86400),
  db.prepare('DELETE FROM support_requests WHERE created_at < ?').bind(now()-180*86400)
 ]);
}
export async function rateLimit(c: any, bucket: string, limit: number, seconds = 60) {
 const db: D1Database | undefined = c.env.DB;
 if (!db) return false;
 const ip = c.req.header('cf-connecting-ip') || 'local';
 const hash = await sha256(`${Math.floor(now()/86400)}:${ip}`);
 const id = `${bucket}:${hash}:${Math.floor(now()/seconds)}`;
 const row = await db.prepare('INSERT INTO rate_limits(id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,now()+seconds).first<{count:number}>();
 return !!row && row.count <= limit;
}
export async function adminAllowed(c: any) {
 if (!c.env.ADMIN_TOKEN || c.env.ADMIN_TOKEN.length < 24) return false;
 const auth = c.req.header('Authorization') || '';
 let provided = '';
 try { if (auth.startsWith('Basic ')) { const decoded=atob(auth.slice(6)); if(decoded.startsWith('operator:'))provided=decoded.slice(9); } } catch {}
 return constantEqual(await sha256(provided),await sha256(c.env.ADMIN_TOKEN));
}
export async function sendNotifications(env: Bindings) {
 if (!env.DB || !env.RESEND_API_KEY || !env.EMAIL_FROM) return;
 const rows = await env.DB.prepare("SELECT n.id,t.id AS order_id,c.email FROM notifications n JOIN transactions t ON t.id=n.transaction_id JOIN customers c ON c.id=t.customer_id WHERE n.status='pending' AND n.attempts < 5 LIMIT 3").all<{id:string;order_id:string;email:string}>();
 for (const n of rows.results) {
  try {
   await env.DB.prepare('UPDATE notifications SET attempts=attempts+1 WHERE id=?').bind(n.id).run();
   await emailAdapter(env).send(n.email,'Pembelian AMARIVA telah diverifikasi',`Pembayaran Pricing Decision Kit untuk order ${n.order_id} telah diverifikasi. Buka ${env.PUBLIC_ORIGIN}/account untuk mengakses toolkit. Jika perangkat berbeda, gunakan tautan masuk email. Bantuan: ${env.PUBLIC_ORIGIN}/contact.`,n.id);
   await env.DB.prepare("UPDATE notifications SET status='sent' WHERE id=?").bind(n.id).run();
  } catch { /* Durable outbox remains visible to the operator. No secret/provider errors leaked. */ }
 }
}
app.use('*',bodyLimit({maxSize:65536,onError:c=>c.json({error:'Permintaan terlalu besar.'},413)}));
app.use('*',async(c,next)=>{
 c.header('Cache-Control','no-store');
 if(c.req.method==='POST' && c.req.path!=='/api/webhooks/stripe') {
  if(c.req.header('Origin') !== new URL(c.req.url).origin)return c.json({error:'Origin tidak diizinkan.'},403);
  if(!c.req.header('Content-Type')?.startsWith('application/json'))return c.json({error:'Gunakan JSON.'},415);
 }
 await next();
});
app.get('/health',c=>c.json({service:'amariva',public:'ready',storage:c.env.DB?'configured':'unconfigured',commerce:commerceReady(c.env)?'configured_not_payment_verified':'disabled',email:c.env.RESEND_API_KEY&&c.env.EMAIL_FROM?'configured':'disabled'}));
app.use('*',async(c,next)=>{
 if(!c.env.DB)return c.json({error:'Penyimpanan belum aktif. Data tidak tersimpan; silakan coba setelah aktivasi layanan.',code:'storage_unconfigured'},503);
 c.executionCtx.waitUntil(housekeeping(c.env.DB).catch(()=>{}));
 if(c.req.method==='POST' && c.req.path!=='/api/webhooks/stripe' && !(await rateLimit(c,'api',80)))return c.json({error:'Terlalu banyak permintaan. Coba lagi sebentar.'},429);
 await next();
});
app.post('/events',async c=>{
 const b = await c.req.json();
 if(!b || b.consent!==true || !browserEvents.includes(b.name) || ![...paths,'/checkout'].includes(b.page) || !/^[a-f0-9-]{36}$/.test(b.sessionId||'') || !/^[a-f0-9-]{36}$/.test(b.id||''))return c.json({error:'Event atau persetujuan tidak valid.'},400);
 const db=c.env.DB!;
 const source=sanitizeDimension(b.source)||'direct';
 const event = db.prepare('INSERT OR IGNORE INTO events(id,name,session_id,source,page,tool,product,offer,campaign,device) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(b.id,b.name,b.sessionId,source,safePath(b.page),b.tool==='pricing'?'pricing':null,b.product==='pricing-kit'?'pricing-kit':null,b.offer==='pricing-kit-entry'?'pricing-kit-entry':null,sanitizeDimension(b.campaign),['mobile','desktop'].includes(b.device)?b.device:null);
 const statements = [db.prepare('INSERT OR IGNORE INTO visitors(id,consent) VALUES (?,1)').bind(b.sessionId),db.prepare('INSERT OR IGNORE INTO sources(id,name) VALUES (?,?)').bind(source,source),event];
 if(b.tool==='pricing' && b.name==='tool_start')statements.push(db.prepare("INSERT OR IGNORE INTO tool_sessions(id,visitor_id,tool_id,status) VALUES (?,?,'pricing','started')").bind(b.sessionId+':pricing',b.sessionId));
 if(b.tool==='pricing' && b.name==='tool_complete')statements.push(db.prepare("INSERT INTO tool_sessions(id,visitor_id,tool_id,status) VALUES (?,?,'pricing','completed') ON CONFLICT(id) DO UPDATE SET status='completed'").bind(b.sessionId+':pricing',b.sessionId));
 await db.batch(statements);
 return c.json({accepted:true},202);
});
app.post('/leads',async c=>{
 if(!(await rateLimit(c,'lead',5,3600)))return c.json({error:'Batas pendaftaran tercapai. Coba lagi nanti.'},429);
 const b=await c.req.json();
 if(!b || !validateEmail(b.email) || b.consent!==true)return c.json({error:'Email valid dan persetujuan diperlukan.'},400);
 const email=b.email.trim().toLowerCase(),id=crypto.randomUUID(),source=sanitizeDimension(b.source)||'direct';
 const db=c.env.DB!;
 await db.batch([db.prepare('INSERT INTO leads(id,email,source,campaign,consent) VALUES (?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET updated_at=unixepoch(),consent=1,status=\'interested\'').bind(id,email,source,sanitizeDimension(b.campaign)),db.prepare("INSERT INTO events(id,name,source,offer) SELECT ?,'lead_created',?,'pricing-kit-entry' WHERE EXISTS (SELECT 1 FROM leads WHERE id=?)").bind(id,source,id)]);
 return c.json({stored:true},201);
});
app.post('/contact',async c=>{
 if(!(await rateLimit(c,'contact',5,3600)))return c.json({error:'Batas pengiriman tercapai. Coba lagi nanti.'},429);
 const b=await c.req.json();
 if(!b || !validateEmail(b.email) || !['support','privacy','feedback'].includes(b.topic) || typeof b.message!=='string' || b.message.trim().length<10 || b.message.length>3000 || b.consent!==true)return c.json({error:'Periksa email, pesan (10–3.000 karakter), dan persetujuan.'},400);
 const id=crypto.randomUUID();
 await c.env.DB!.prepare('INSERT INTO support_requests(id,email,topic,message) VALUES (?,?,?,?)').bind(id,b.email.trim().toLowerCase(),b.topic,b.message.trim()).run();
 return c.json({id,stored:true},201);
});
async function access(c: any) {
 const raw=getCookie(c,'amariva_access');
 if(!raw || raw.length>200)return null;
 return c.env.DB.prepare("SELECT kind,subject FROM access_tokens WHERE hash=? AND expires_at>? AND kind IN ('order','session')").bind(await sha256(raw),now()).first() as Promise<{kind:string;subject:string}|null>;
}
async function setAccess(c: any, kind: 'order'|'session', subject: string) {
 const raw=token();
 await c.env.DB.prepare('INSERT INTO access_tokens(hash,kind,subject,expires_at) VALUES (?,?,?,?)').bind(await sha256(raw),kind,subject,now()+7*86400).run();
 setCookie(c,'amariva_access',raw,{httpOnly:true,secure:new URL(c.req.url).protocol==='https:',sameSite:'Lax',path:'/',maxAge:7*86400});
}
app.post('/checkout',async c=>{
 if(!commerceReady(c.env))return c.json({error:'Pembayaran belum diaktifkan. Tidak ada transaksi atau tagihan yang diproses.',code:'payment_disabled'},503);
 if(!(await rateLimit(c,'checkout',5,3600)))return c.json({error:'Batas checkout tercapai.'},429);
 const b=await c.req.json();
 if(!b || !validateEmail(b.email) || b.terms!==true || !/^[a-f0-9-]{36}$/.test(b.idempotencyKey||''))return c.json({error:'Email, persetujuan ketentuan, atau identitas checkout tidak valid.'},400);
 const db=c.env.DB!,email=b.email.trim().toLowerCase();
 let order=await db.prepare('SELECT * FROM transactions WHERE idempotency_key=?').bind(b.idempotencyKey).first<any>();
 if(order) {
  const a=await access(c); if(!a || a.kind!=='order' || a.subject!==order.id)return c.json({error:'Checkout tidak tersedia. Mulai checkout baru.'},409);
  if(order.checkout_url && order.status==='checkout')return c.json({url:order.checkout_url});
  if(!['pending','failed'].includes(order.status))return c.json({error:'Checkout ini sudah selesai. Periksa pembelian Anda.'},409);
 } else {
  await db.prepare('INSERT OR IGNORE INTO customers(id,email) VALUES (?,?)').bind(crypto.randomUUID(),email).run();
  const customer=await db.prepare('SELECT id FROM customers WHERE email=?').bind(email).first<{id:string}>();
  const id=crypto.randomUUID();
  await db.prepare("INSERT INTO transactions(id,customer_id,product_id,amount,currency,status,idempotency_key,source) VALUES (?,?,'pricing-kit',?,?,'pending',?,?)").bind(id,customer!.id,product.price,product.currency,b.idempotencyKey,sanitizeDimension(b.source)||'direct').run();
  order={id,amount:product.price,currency:product.currency};
  await setAccess(c,'order',id); // This capability grants only this order, never all orders of a supplied email.
 }
 try {
  const checkout=await paymentAdapter(c.env).createCheckout({orderId:order.id,email,amount:order.amount,currency:order.currency,origin:origin(c)});
  await db.batch([db.prepare("UPDATE transactions SET status='checkout',provider_session=?,checkout_url=?,updated_at=unixepoch() WHERE id=? AND status IN ('pending','failed')").bind(checkout.id,checkout.url,order.id),db.prepare("INSERT OR IGNORE INTO events(id,name,product,offer,transaction_id,source) VALUES (?,'checkout_start','pricing-kit','pricing-kit-entry',?,?)").bind('checkout-'+order.id,order.id,sanitizeDimension(b.source)||'direct')]);
  return c.json({url:checkout.url});
 } catch {
  await db.prepare("UPDATE transactions SET status='failed',updated_at=unixepoch() WHERE id=? AND status='pending'").bind(order.id).run();
  return c.json({error:'Provider pembayaran belum dapat dihubungi. Tidak ada status pembayaran sukses yang dibuat.'},502);
 }
});
app.post('/webhooks/stripe',async c=>{
 const raw=await c.req.text();
 if(!(await verifyStripeSignature(raw,c.req.header('Stripe-Signature')||'',c.env.STRIPE_WEBHOOK_SECRET||'')))return c.json({error:'Signature tidak valid.'},400);
 const event=JSON.parse(raw),db=c.env.DB!;
 if(typeof event.id!=='string' || !event.id.startsWith('evt_'))return c.json({error:'Event tidak valid.'},400);
 if(await db.prepare('SELECT id FROM webhook_receipts WHERE id=?').bind(event.id).first())return c.json({received:true,duplicate:true});
 const obj=event.data?.object;
 if(!obj)return c.json({error:'Payload tidak valid.'},400);
 const statements: D1PreparedStatement[]=[];
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
  const order=await db.prepare('SELECT * FROM transactions WHERE id=?').bind(obj.metadata?.order_id||'').first<any>();
  if(!order)return c.json({error:'Order tidak ditemukan.'},400);
  if(obj.payment_status!=='paid')return c.json({received:true,pending:true});
  if(order.status==='paid' || order.status==='refunded') { await db.prepare('INSERT OR IGNORE INTO webhook_receipts(id,type) VALUES (?,?)').bind(event.id,event.type).run();return c.json({received:true}); }
  if(!canSettle(order,{...obj,livemode:event.livemode},c.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) || (order.provider_session && order.provider_session!==obj.id))return c.json({error:'Nilai pembayaran tidak cocok.'},400);
  statements.push(db.prepare("UPDATE transactions SET status='paid',provider_session=?,provider_payment=?,updated_at=unixepoch() WHERE id=? AND status IN ('pending','checkout','failed')").bind(obj.id,obj.payment_intent,order.id));
  statements.push(db.prepare("INSERT OR IGNORE INTO fulfillments(id,transaction_id,status) VALUES (?,?,'available')").bind('fulfill-'+order.id,order.id));
  statements.push(db.prepare("INSERT OR IGNORE INTO events(id,name,product,transaction_id,source) VALUES (?,'purchase','pricing-kit',?,?)").bind('purchase-'+order.id,order.id,order.source));
  statements.push(db.prepare("INSERT OR IGNORE INTO notifications(id,transaction_id,type) VALUES (?,?,'purchase_receipt')").bind('receipt-'+order.id,order.id));
 } else if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)) {
  statements.push(db.prepare("UPDATE transactions SET status=?,updated_at=unixepoch() WHERE provider_session=? AND status IN ('pending','checkout','failed')").bind(event.type.endsWith('expired')?'expired':'failed',obj.id));
 } else if(event.type==='charge.refunded') {
  const order=await db.prepare('SELECT * FROM transactions WHERE provider_payment=?').bind(obj.payment_intent||'').first<any>();
  if(!order)return c.json({error:'Order belum siap untuk rekonsiliasi refund; ulangi event.'},409);
  if(obj.currency!==order.currency || event.livemode!==c.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || !Number.isSafeInteger(obj.amount_refunded) || obj.amount_refunded<0)return c.json({error:'Refund tidak valid.'},400);
  {
   const refundedRupiah=Math.min(obj.amount_refunded / 100,order.amount);
   statements.push(db.prepare('UPDATE transactions SET refunded_amount=MAX(refunded_amount,?),updated_at=unixepoch() WHERE id=?').bind(refundedRupiah,order.id));
   if(refundedRupiah>=order.amount) {
    statements.push(db.prepare("UPDATE transactions SET status='refunded' WHERE id=? AND status='paid'").bind(order.id));
    statements.push(db.prepare("UPDATE fulfillments SET status='revoked' WHERE transaction_id=?").bind(order.id));
    statements.push(db.prepare("INSERT OR IGNORE INTO events(id,name,product,transaction_id) VALUES (?,'cancellation','pricing-kit',?)").bind('refund-'+order.id,order.id));
   }
  }
 }
 statements.push(db.prepare('INSERT OR IGNORE INTO webhook_receipts(id,type) VALUES (?,?)').bind(event.id,event.type));
 await db.batch(statements); // D1 batch is atomic; IDs ensure replay-safe business side effects.
 c.executionCtx.waitUntil(sendNotifications(c.env).catch(()=>{}));
 return c.json({received:true});
});
app.get('/orders',async c=>{
 const a=await access(c);
 if(!a)return c.json({orders:[]});
 const where=a.kind==='order'?'t.id=?':'c.email=?';
 const orders=await c.env.DB!.prepare(`SELECT t.id,t.amount,t.currency,t.status,t.created_at FROM transactions t JOIN customers c ON c.id=t.customer_id WHERE ${where} ORDER BY t.created_at DESC LIMIT 100`).bind(a.subject).all();
 return c.json({orders:orders.results});
});
app.get('/download/:id',async c=>{
 const a=await access(c),id=c.req.param('id');
 if(!a)return c.json({error:'Akses pembelian diperlukan.'},401);
 const order=await c.env.DB!.prepare(`SELECT t.id,t.status,f.status AS fulfillment_status FROM transactions t JOIN customers c ON c.id=t.customer_id JOIN fulfillments f ON f.transaction_id=t.id WHERE t.id=? AND ${a.kind==='order'?'t.id=?':'c.email=?'}`).bind(id,a.subject).first<any>();
 if(!order || order.status!=='paid' || order.fulfillment_status==='revoked')return c.json({error:'Akses tidak tersedia.'},403);
 await c.env.DB!.batch([c.env.DB!.prepare("UPDATE fulfillments SET status='delivered',delivered_at=COALESCE(delivered_at,unixepoch()) WHERE transaction_id=? AND status!='revoked'").bind(id),c.env.DB!.prepare("INSERT OR IGNORE INTO events(id,name,product,transaction_id) VALUES (?,'delivery_complete','pricing-kit',?)").bind('delivery-'+id,id),c.env.DB!.prepare("INSERT OR IGNORE INTO events(id,name,product,transaction_id) VALUES (?,'activation','pricing-kit',?)").bind('activation-'+id,id)]);
 return c.body(Uint8Array.from(atob(kitBase64),ch=>ch.charCodeAt(0)),200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="amariva-pricing-decision-kit-v1.zip"','Cache-Control':'private, no-store'});
});
app.post('/auth/request',async c=>{
 if(!c.env.RESEND_API_KEY || !c.env.EMAIL_FROM)return c.json({error:'Tautan email belum aktif. Gunakan perangkat saat checkout atau hubungi bantuan.'},503);
 if(!(await rateLimit(c,'login',5,3600)))return c.json({error:'Batas permintaan tautan tercapai.'},429);
 const b=await c.req.json();if(!b || !validateEmail(b.email))return c.json({error:'Email tidak valid.'},400);
 const email=b.email.trim().toLowerCase();
 const customer=await c.env.DB!.prepare('SELECT id FROM customers WHERE email=?').bind(email).first();
 if(customer) {
  const raw=token(),hash=await sha256(raw);
  await c.env.DB!.prepare("INSERT INTO access_tokens(hash,kind,subject,expires_at) VALUES (?,'magic',?,?)").bind(hash,email,now()+900).run();
  try { await emailAdapter(c.env).send(email,'Tautan masuk AMARIVA',`Masuk ke pembelian Anda: ${origin(c)}/auth/verify?token=${encodeURIComponent(raw)}\nBerlaku 15 menit, sekali pakai. Abaikan bila Anda tidak meminta tautan ini.`,hash); } catch { await c.env.DB!.prepare('DELETE FROM access_tokens WHERE hash=?').bind(hash).run(); }
 }
 return c.json({accepted:true});
});
app.post('/auth/verify',async c=>{
 const b=await c.req.json();if(!b || typeof b.token!=='string' || b.token.length>200)return c.json({error:'Tautan tidak valid.'},400);
 const row=await c.env.DB!.prepare("DELETE FROM access_tokens WHERE hash=? AND kind='magic' AND expires_at>? RETURNING subject").bind(await sha256(b.token),now()).first<{subject:string}>();
 if(!row)return c.json({error:'Tautan telah dipakai atau kedaluwarsa. Minta tautan baru.'},401);
 await setAccess(c,'session',row.subject);
 return c.json({authenticated:true});
});
app.post('/auth/logout',async c=>{
 const raw=getCookie(c,'amariva_access');if(raw)await c.env.DB!.prepare('DELETE FROM access_tokens WHERE hash=?').bind(await sha256(raw)).run();
 deleteCookie(c,'amariva_access',{path:'/'});return c.json({signedOut:true});
});
app.notFound(c=>c.json({error:'Endpoint tidak ditemukan.'},404));
app.onError((err,c)=>{console.error('api_error',err instanceof SyntaxError?'invalid_json':'request_failed');return c.json({error:err instanceof SyntaxError?'JSON tidak valid.':'Layanan sementara tidak tersedia.'},err instanceof SyntaxError?400:503)});
export default app
