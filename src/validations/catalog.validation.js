import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parent: z.string().nullable().optional(),
  isActive: z.coerce.boolean().optional(),
  order: z.coerce.number().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price is required'),
  discountType: z.enum(['none', 'fixed', 'percent']).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().min(0).optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().nullable().optional(),
  brand: z.string().optional(),
  tags: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  shipping: z
    .object({
      width: z.coerce.number().optional(),
      height: z.coerce.number().optional(),
      weight: z.coerce.number().optional(),
      cost: z.coerce.number().optional(),
    })
    .optional(),
  featured: z.coerce.boolean().optional(),
  status: z.enum(['active', 'inactive', 'scheduled']).optional(),
});
