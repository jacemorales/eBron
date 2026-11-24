/**
 * eBron - Centralized Fee Configuration & Calculations
 *
 * All percentage charges and flat fees for wallet top-ups and seller payouts
 * are stored here as the single source of truth.
 *
 * To adjust fees in the future:
 * 1. Modify the tier boundaries, percentage rates, or flat fees in FEE_CONFIG below.
 * 2. Mirror the changes in backend/Code.gs (Apps Script) and frontend/src/config/feeConfig.ts.
 */

export const FEE_CONFIG = {
  // Buyer wallet deposit charges
  walletTopUp: {
    tiers: [
      { min: 0, max: 5000, percentage: 2.5, flatFee: 200 },
      { min: 5000, max: 30000, percentage: 3.0, flatFee: 200 },
      { min: 30000, max: 100000, percentage: 3.5, flatFee: 200 },
      { min: 100000, max: null, percentage: 4.0, flatFee: 2000 }
    ]
  },

  // Seller sales payout deductions
  sellerPayout: {
    tiers: [
      { min: 0, max: 5000, percentage: 6.0, flatFee: 100 },
      { min: 5000, max: 25000, percentage: 5.0, flatFee: 100 },
      { min: 25000, max: 80000, percentage: 6.0, flatFee: 200 },
      { min: 80000, max: null, percentage: 5.0, flatFee: 500 }
    ]
  }
};

/**
 * Finds the applicable fee tier for a given amount.
 * Tier ranges: [min, max) where max: null means no upper bound.
 */
export function getFeeTier(amount, tiers = []) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return null;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const meetsMin = num >= tier.min;
    const meetsMax = tier.max === null || tier.max === undefined || num < tier.max;
    if (meetsMin && meetsMax) {
      return tier;
    }
  }
  return tiers[tiers.length - 1] || null;
}

/**
 * Calculates wallet top-up charges using safe integer kobo arithmetic.
 *
 * Top-Up Amount = Amount the buyer actually wants credited to their spending wallet.
 * Percentage Fee = (Top-Up Amount * Percentage Rate) / 100
 * Total Top-Up Charge = Percentage Fee + Flat Gateway Cost
 * Total Payment = Top-Up Amount + Total Top-Up Charge
 *
 * @param {number} amount - Intended wallet credit in Naira
 * @param {object} config - Optional config override
 * @returns {object} Full fee breakdown in Naira
 */
export function calculateTopUpFee(amount, config = FEE_CONFIG) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Top-up amount must be a positive number.');
  }

  const tier = getFeeTier(num, config.walletTopUp.tiers);
  if (!tier) {
    throw new Error('No applicable fee tier found for top-up amount.');
  }

  // Integer kobo calculations for 100% precision (1 NGN = 100 kobo)
  const amountKobo = Math.round(num * 100);
  const percentageFeeKobo = Math.round((amountKobo * tier.percentage) / 100);
  const flatFeeKobo = Math.round(tier.flatFee * 100);
  const totalFeeKobo = percentageFeeKobo + flatFeeKobo;
  const totalPaymentKobo = amountKobo + totalFeeKobo;

  return {
    originalAmount: num,
    percentageRate: tier.percentage,
    percentageFee: Number((percentageFeeKobo / 100).toFixed(2)),
    flatFee: Number((flatFeeKobo / 100).toFixed(2)),
    totalFee: Number((totalFeeKobo / 100).toFixed(2)),
    totalPayment: Number((totalPaymentKobo / 100).toFixed(2)),
    isValid: true,
    tierSnapshot: {
      min: tier.min,
      max: tier.max,
      percentage: tier.percentage,
      flatFee: tier.flatFee
    }
  };
}

/**
 * Calculates seller payout charges using safe integer kobo arithmetic.
 *
 * Payout Amount = Amount requested from available sales balance.
 * Percentage Charge = (Payout Amount * Applicable Percentage) / 100
 * Total Payout Fee = Percentage Charge + Flat Transfer Fee
 * Net Payout = Payout Amount - Total Payout Fee
 *
 * @param {number} amount - Requested withdrawal amount in Naira
 * @param {object} config - Optional config override
 * @returns {object} Full fee breakdown in Naira
 */
export function calculatePayoutFee(amount, config = FEE_CONFIG) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Withdrawal amount must be a positive number.');
  }

  const tier = getFeeTier(num, config.sellerPayout.tiers);
  if (!tier) {
    throw new Error('No applicable fee tier found for payout amount.');
  }

  // Integer kobo calculations for 100% precision (1 NGN = 100 kobo)
  const amountKobo = Math.round(num * 100);
  const percentageFeeKobo = Math.round((amountKobo * tier.percentage) / 100);
  const flatFeeKobo = Math.round(tier.flatFee * 100);
  const totalFeeKobo = percentageFeeKobo + flatFeeKobo;
  const netPayoutKobo = amountKobo - totalFeeKobo;

  const totalFeeNaira = Number((totalFeeKobo / 100).toFixed(2));
  const netPayoutNaira = Number((netPayoutKobo / 100).toFixed(2));

  return {
    requestedAmount: num,
    percentageRate: tier.percentage,
    percentageFee: Number((percentageFeeKobo / 100).toFixed(2)),
    flatFee: Number((flatFeeKobo / 100).toFixed(2)),
    totalFee: totalFeeNaira,
    netPayout: netPayoutNaira,
    isValid: netPayoutKobo > 0,
    tierSnapshot: {
      min: tier.min,
      max: tier.max,
      percentage: tier.percentage,
      flatFee: tier.flatFee
    }
  };
}
