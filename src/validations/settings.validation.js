import { z } from 'zod';

// All fields optional — admin sends a partial or full settings object.
// Unknown keys (e.g. _id, __v) are stripped by zod, preventing mass assignment.
export const settingsSchema = z
  .object({
    siteName: z.string().optional(),
    siteUrl: z.string().optional(),
    adminEmail: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    postCode: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    currency: z.string().optional(),
    currencySymbol: z.string().optional(),
    dateFormat: z.string().optional(),
    taxRate: z.coerce.number().min(0).optional(),
    shippingFee: z.coerce.number().min(0).optional(),
    freeShippingThreshold: z.coerce.number().min(0).optional(),
    paymentMethods: z
      .object({
        cod: z.coerce.boolean().optional(),
        razorpay: z.coerce.boolean().optional(),
        bank_transfer: z.coerce.boolean().optional(),
        check: z.coerce.boolean().optional(),
      })
      .optional(),
    socials: z
      .object({
        facebook: z.string().optional(),
        twitter: z.string().optional(),
        instagram: z.string().optional(),
        linkedin: z.string().optional(),
      })
      .optional(),
  })
  .strip();
