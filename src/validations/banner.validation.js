import { z } from 'zod';

export const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  desktopImage: z.string().min(1, 'Desktop image is required'),
  mobileImage: z.string().optional(),
  thumbnail: z.string().optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  bannerType: z.enum(['hero', 'offer', 'category', 'promo']).optional(),
  displayOrder: z.coerce.number().optional(),
  isActive: z.coerce.boolean().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  textPosition: z.enum(['left', 'center', 'right']).optional(),
  textColor: z.string().optional(),
  buttonColor: z.string().optional(),
});

export const bannerStatusSchema = z.object({
  isActive: z.coerce.boolean(),
});

export const bannerReorderSchema = z.object({
  // [{ id, displayOrder }]
  order: z
    .array(
      z.object({
        id: z.string().min(1),
        displayOrder: z.coerce.number(),
      })
    )
    .min(1, 'Order list is required'),
});
