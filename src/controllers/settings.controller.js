import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import SiteSettings from '../models/SiteSettings.js';

// Public subset used by the storefront (header/footer, currency, enabled payments).
export const getPublicSettings = asyncHandler(async (req, res) => {
  const s = await SiteSettings.getSettings();
  sendSuccess(res, {
    data: {
      siteName: s.siteName,
      logo: s.logo,
      favicon: s.favicon,
      phone: s.phone,
      address: s.address,
      adminEmail: s.adminEmail,
      currency: s.currency,
      currencySymbol: s.currencySymbol,
      shippingFee: s.shippingFee,
      freeShippingThreshold: s.freeShippingThreshold,
      taxRate: s.taxRate,
      paymentMethods: s.paymentMethods,
      socials: s.socials,
    },
  });
});

export const getSettings = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await SiteSettings.getSettings() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSettings();
  settings.set(req.body);
  await settings.save();
  sendSuccess(res, { message: 'Settings updated', data: settings });
});
