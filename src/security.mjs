export const sha256 = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
export function constantEqual(a,b) { if (a.length !== b.length) return false; let diff=0; for(let i=0;i<a.length;i++)diff |= a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
export async function verifyStripeSignature(body, signature, secret, now = Math.floor(Date.now()/1000)) {
 if (!secret || !signature || signature.length > 2048) return false;
 const parts = signature.split(',').map(v=>v.trim().split('='));
 const timestamps=parts.filter(v=>v[0]==='t');
 if(timestamps.length!==1)return false;
 const timestamp=Number(timestamps[0][1]);
 if(!Number.isInteger(timestamp)||Math.abs(now-timestamp)>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const expected=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 return parts.some(v=>v[0]==='v1' && constantEqual(v[1]||'',expected));
}
export function sanitizeDimension(value) { return typeof value==='string' ? value.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60) : ''; }
export function safePath(value) { return typeof value==='string' && /^\/[a-zA-Z0-9/_-]*$/.test(value) && value.length<=200 ? value : '/'; }
