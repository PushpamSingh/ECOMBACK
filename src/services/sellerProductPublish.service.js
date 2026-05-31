import Product from '../models/Product.js';

// Creates or updates the live catalog Product that mirrors a published SellerProduct.
// The Product is the buyable/stock entity (existing cart/checkout/Order reuse it);
// the SellerProduct remains the submission/review record. Returns the Product.
export async function publishSellerProduct(sellerProduct) {
  const images = [sellerProduct.mainImage, ...(sellerProduct.gallery || [])].filter(Boolean);
  const fields = {
    name: sellerProduct.name,
    description: sellerProduct.description,
    shortDescription: `${sellerProduct.brand || ''} ${sellerProduct.condition} item`.trim(),
    price: sellerProduct.sellingPrice,
    discountType: 'none',
    discountValue: 0,
    stock: sellerProduct.stock,
    category: sellerProduct.category,
    subCategory: sellerProduct.subCategory || null,
    brand: sellerProduct.brand,
    images,
    thumbnail: sellerProduct.mainImage || images[0] || '',
    status: 'active',
    source: 'marketplace',
    seller: sellerProduct.seller,
    sellerProduct: sellerProduct._id,
  };

  if (sellerProduct.product) {
    await Product.findByIdAndUpdate(sellerProduct.product, fields);
    return sellerProduct.product;
  }
  const product = await Product.create(fields);
  return product._id;
}

// Hides a marketplace product from the catalog without deleting it.
export async function unpublishSellerProduct(sellerProduct) {
  if (sellerProduct.product) {
    await Product.findByIdAndUpdate(sellerProduct.product, { status: 'inactive' });
  }
}
