import { z } from 'zod';

export const becomeSellerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  mobile: z.string().min(8, 'Valid mobile is required'),
  email: z.string().email('Valid email is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().optional(),
  pincode: z.string().min(4, 'Pincode is required'),
  storeName: z.string().min(2, 'Store name is required'),
  storeDescription: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
});

export const sellerBankSchema = z
  .object({
    method: z.enum(['upi', 'bank']),
    upiId: z.string().optional(),
    accountHolder: z.string().optional(),
    accountNumber: z.string().optional(),
    ifsc: z.string().optional(),
    bankName: z.string().optional(),
  })
  .refine((d) => (d.method === 'upi' ? !!d.upiId : true), { message: 'UPI ID is required', path: ['upiId'] })
  .refine(
    (d) => (d.method === 'bank' ? d.accountHolder && d.accountNumber && d.ifsc && d.bankName : true),
    { message: 'All bank fields are required', path: ['accountNumber'] }
  );

export const sellerProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().nullable().optional(),
  brand: z.string().optional(),
  condition: z.enum(['new', 'refurbished', 'used']).optional(),
  sellingPrice: z.coerce.number().positive('Selling price must be greater than 0'),
  mrp: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  mainImage: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  weight: z.coerce.number().min(0).optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  warranty: z.string().optional(),
  returnPolicy: z.string().optional(),
});

export const commissionSettingsSchema = z.object({
  commissionValue: z.coerce.number().min(0).max(100).optional(),
  returnWindowDays: z.coerce.number().min(0).optional(),
  payoutMinAmount: z.coerce.number().min(0).optional(),
  requireAadhaar: z.coerce.boolean().optional(),
  requirePan: z.coerce.boolean().optional(),
});

export const productReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes', 'block', 'unpublish']),
  notes: z.string().min(1, 'Admin notes are required'),
});

export const payoutCreateSchema = z.object({
  sellerId: z.string().min(1, 'Seller is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
});

export const disputeRaiseSchema = z.object({
  orderId: z.string().min(1, 'Order is required'),
  reason: z.string().min(3, 'Reason is required'),
});

export const disputeResolveSchema = z.object({
  resolution: z.enum(['buyer_wins', 'seller_wins', 'partial']),
  refundAmount: z.coerce.number().min(0).optional(),
  adminNotes: z.string().min(1, 'Admin notes are required'),
});

export const sellerStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended', 'blocked']),
});
