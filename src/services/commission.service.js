import CommissionSettings from '../models/CommissionSettings.js';

// Current platform commission percentage (read once at sale time, then snapshotted).
export async function getCommissionPercentage() {
  const settings = await CommissionSettings.getSettings();
  return settings.commissionValue;
}

// Splits a line total into platform commission and seller receivable.
// Commission is rounded; seller gets the remainder so the two always sum to the line total.
export function computeLineCommission(lineTotal, commissionPercentage) {
  const commissionAmount = Math.round((lineTotal * commissionPercentage) / 100);
  const sellerReceivableAmount = lineTotal - commissionAmount;
  return { commissionAmount, sellerReceivableAmount };
}
