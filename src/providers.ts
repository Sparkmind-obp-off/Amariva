import { paymentMinorUnits } from '../public/static/calculator.mjs'
export type Bindings = {
 DB?: D1Database; PUBLIC_ORIGIN?: string; PAYMENT_PROVIDER?: string; STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string;
 COMMERCE_ENABLED?: string; LEGAL_READY?: string; LEGAL_OPERATOR?: string; LEGAL_JURISDICTION?: string; REFUND_POLICY?: string;
 SUPPORT_EMAIL?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string; ADMIN_TOKEN?: string;
}
export function commerceReady(env: Bindings) {
 return !!(env.DB && env.COMMERCE_ENABLED === 'true' && env.LEGAL_READY === 'true' && env.LEGAL_OPERATOR && env.LEGAL_JURISDICTION && env.REFUND_POLICY && env.SUPPORT_EMAIL && env.PAYMENT_PROVIDER === 'stripe' && env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && env.STRIPE_WEBHOOK_SECRET && env.RESEND_API_KEY && env.EMAIL_FROM);
}
export interface PaymentAdapter { createCheckout(input: { orderId: string; email: string; amount: number; currency: string; origin: string }): Promise<{ id: string; url: string }>; }
export function paymentAdapter(env: Bindings): PaymentAdapter {
 if (env.PAYMENT_PROVIDER !== 'stripe' || !env.STRIPE_SECRET_KEY) throw new Error('Payment disabled');
 return { async createCheckout(input) {
  const params = new URLSearchParams({ mode:'payment',customer_email:input.email,success_url:input.origin+'/checkout/success',cancel_url:input.origin+'/checkout/cancel',client_reference_id:input.orderId,'metadata[order_id]':input.orderId,'payment_intent_data[metadata][order_id]':input.orderId,'line_items[0][price_data][currency]':input.currency,'line_items[0][price_data][unit_amount]':String(paymentMinorUnits(input.amount,input.currency)),'line_items[0][price_data][product_data][name]':'AMARIVA Pricing Decision Kit','line_items[0][quantity]':'1' });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':input.orderId},body:params});
  if(!response.ok)throw new Error('Payment provider unavailable');
  const data = await response.json() as {id:string;url:string};
  if(!data.id || !data.url?.startsWith('https://checkout.stripe.com/'))throw new Error('Invalid payment redirect');
  return data;
 } };
}
export interface EmailAdapter { send(to: string, subject: string, text: string, idempotencyKey: string): Promise<void>; }
export function emailAdapter(env: Bindings): EmailAdapter {
 if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('Email disabled');
 return { async send(to,subject,text,idempotencyKey) {
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text})});
  if(!response.ok)throw new Error('Email provider unavailable');
 } };
}
