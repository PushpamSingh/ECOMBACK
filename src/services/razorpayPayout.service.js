import { env } from '../config/env.js';

/*
 * Seam for RazorpayX (Razorpay Payouts) integration. RazorpayX requires a funded
 * virtual account + fund accounts, which is an account-level setup. Until configured,
 * payouts are processed MANUALLY by an admin (status tracked through the payout state
 * machine) and this returns { processed: false } so callers fall back to manual marking.
 *
 * When RAZORPAYX_ACCOUNT_NUMBER is set, wire the real Payouts API call here and return
 * { processed: true, gatewayPayoutId }.
 */
export const isRazorpayPayoutConfigured = Boolean(process.env.RAZORPAYX_ACCOUNT_NUMBER);

// eslint-disable-next-line no-unused-vars
export async function sendPayout({ amount, bankSnapshot, reference }) {
  if (!isRazorpayPayoutConfigured) {
    return { processed: false, gatewayPayoutId: '' };
  }
  // TODO: integrate RazorpayX Payouts API using env.razorpay credentials + a fund account
  // created from bankSnapshot. Left as a manual step by default for safety with real money.
  return { processed: false, gatewayPayoutId: '' };
}
