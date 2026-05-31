import crypto from 'crypto';
import razorpay, { isRazorpayConfigured } from '../config/razorpay.js';
import { env } from '../config/env.js';

// Creates a Razorpay order. Amount is in rupees; Razorpay expects paise.
export async function createRazorpayOrder(amountInRupees, receipt) {
  return razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
  });
}

// Verifies the signature returned by Razorpay checkout.
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

export { isRazorpayConfigured };
