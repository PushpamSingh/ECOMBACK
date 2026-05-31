import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().min(1).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().min(1),
});

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone is required'),
    street: z.string().min(1, 'Address is required'),
    apartment: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postCode: z.string().min(1, 'Post code is required'),
    country: z.string().optional(),
    notes: z.string().optional(),
  }),
  paymentMethod: z.enum(['cod', 'razorpay', 'bank_transfer', 'check']),
  couponCode: z.string().optional(),
});

export const couponSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  image: z.string().optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  usageLimit: z.coerce.number().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});

export const wishlistToggleSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
});

export const reviewStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
