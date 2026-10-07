export function calculatePricing(input) {
  const names = ['cost', 'price', 'fixed', 'units', 'fee'];
  for (const name of names) {
    if (typeof input[name] !== 'number' || !Number.isFinite(input[name]) || input[name] < 0) throw new Error('Semua input harus berupa angka positif atau nol.');
  }
  if (input.price <= 0 || input.units < 1 || !Number.isInteger(input.units)) throw new Error('Harga harus lebih dari nol dan target penjualan berupa unit bulat minimal 1.');
  if (input.fee >= 100) throw new Error('Biaya platform harus kurang dari 100%.');
  if (input.cost > 1e12 || input.price > 1e12 || input.fixed > 1e12 || input.units > 1e7) throw new Error('Nilai terlalu besar untuk kalkulator ini.');
  const feePerUnit = input.price * input.fee / 100;
  const contribution = input.price - input.cost - feePerUnit;
  const margin = contribution / input.price * 100;
  const breakEven = contribution > 0 ? Math.ceil(input.fixed / contribution) : null;
  const profit = contribution * input.units - input.fixed;
  const minimumPrice = (input.cost + input.fixed / input.units) / (1 - input.fee / 100);
  return { feePerUnit, contribution, margin, breakEven, profit, minimumPrice, revenue: input.price * input.units, safe: contribution > 0 && profit >= 0 };
}
export function validateEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export const browserEvents = ['page_view','tool_start','tool_complete','result_view','product_view','offer_view','repeat_use','referral'];
export const allEvents = [...browserEvents,'checkout_start','lead_created','purchase','delivery_complete','activation','repeat_purchase','upgrade','cancellation'];
// Stripe represents IDR using two decimal minor units; domain amounts remain rupiah.
export function paymentMinorUnits(amount, currency) {
  if (currency !== 'idr' || !Number.isSafeInteger(amount) || amount < 0) throw new Error('Unsupported currency or amount');
  return amount * 100;
}
export function canSettle(order, session, expectedLive) {
  return !!order && ['pending','checkout','failed'].includes(order.status) && session.payment_status === 'paid' && session.amount_total === paymentMinorUnits(order.amount, order.currency) && session.currency === order.currency && session.metadata?.order_id === order.id && (expectedLive === undefined || session.livemode === expectedLive);
}
