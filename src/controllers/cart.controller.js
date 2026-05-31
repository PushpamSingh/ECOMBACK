import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import SiteSettings from '../models/SiteSettings.js';
import { lineUnitPrice, computeTotals } from '../utils/pricing.js';

// Loads the user's cart (creating an empty one) and returns a shaped response
// with per-line prices and computed totals.
async function buildCartResponse(userId) {
  // upsert avoids a duplicate-key race when two requests create the cart at once.
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('items.product');

  // Drop items whose product was deleted.
  cart.items = cart.items.filter((i) => i.product);

  const items = cart.items.map((i) => {
    const unitPrice = lineUnitPrice(i.product);
    return {
      product: {
        id: i.product._id,
        name: i.product.name,
        slug: i.product.slug,
        thumbnail: i.product.thumbnail || i.product.images?.[0] || '',
        price: i.product.price,
        finalPrice: unitPrice,
        stock: i.product.stock,
        rating: i.product.rating,
        numReviews: i.product.numReviews,
      },
      quantity: i.quantity,
      lineTotal: unitPrice * i.quantity,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const settings = await SiteSettings.getSettings();
  const { tax, shippingCost, total } = computeTotals({ subtotal, settings });
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, subtotal, tax, shippingCost, total, count };
}

export const getCart = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await buildCartResponse(req.user._id) });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.stock < 1) throw new ApiError(400, 'Product is out of stock');

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id, items: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const existing = cart.items.find((i) => String(i.product) === String(productId));
  if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity);
  else cart.items.push({ product: productId, quantity: Math.min(product.stock, quantity) });

  await cart.save();
  sendSuccess(res, { message: 'Added to cart', data: await buildCartResponse(req.user._id) });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');

  const item = cart.items.find((i) => String(i.product) === String(req.params.productId));
  if (!item) throw new ApiError(404, 'Item not in cart');

  const product = await Product.findById(req.params.productId);
  if (!product) throw new ApiError(404, 'Product no longer exists');
  if (product.stock < 1) throw new ApiError(400, 'Product is out of stock');
  item.quantity = Math.min(product.stock, Math.max(1, quantity));
  await cart.save();
  sendSuccess(res, { message: 'Cart updated', data: await buildCartResponse(req.user._id) });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');
  cart.items = cart.items.filter((i) => String(i.product) !== String(req.params.productId));
  await cart.save();
  sendSuccess(res, { message: 'Item removed', data: await buildCartResponse(req.user._id) });
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  sendSuccess(res, { message: 'Cart cleared', data: await buildCartResponse(req.user._id) });
});

export { buildCartResponse };
