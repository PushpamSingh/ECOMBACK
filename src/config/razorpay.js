import Razorpay from 'razorpay';
import { env } from './env.js';

// Razorpay client. If keys are missing, the instance still constructs but
// payment calls will fail clearly — checkout falls back to COD in that case.
const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || 'rzp_test_placeholder',
  key_secret: env.razorpay.keySecret || 'placeholder',
});

export const isRazorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);

export default razorpay;
