import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';

// Atomically decrements stock for each line, only if enough is available.
// Rolls back any successful decrements and throws if a line can't be satisfied.
// Prevents overselling without needing multi-document transactions.
export async function reserveStock(items) {
  const done = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (res.modifiedCount === 1) {
      done.push(item);
    } else {
      // Roll back what we already took, then fail the whole order.
      // eslint-disable-next-line no-await-in-loop
      await releaseStock(done);
      throw new ApiError(400, 'One or more items are out of stock');
    }
  }
}

// Returns stock for each line (used to honour an already-paid order, or on cancel).
export async function releaseStock(items) {
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
}
