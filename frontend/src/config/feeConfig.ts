/**
 * eBron - Centralized Fee Configuration (Frontend)
 *
 * All percentage charges and flat fees for wallet top-ups and seller payouts
 * are mirrored here for client-side live breakdowns and calculations.
 *
 * To adjust fees in the future:
 * 1. Modify the tier boundaries, percentage rates, or flat fees in FEE_CONFIG below.
 * 2. Ensure the same changes are applied in backend/FeeConfig.js and backend/Code.gs.
 */

export interface FeeTier {
  min: number;
  max: number | null;
  percentage: number;
  flatFee: number;
}

export interface FeeConfiguration {
  walletTopUp: {
    tiers: FeeTier[];
  };
  sellerPayout: {
    tiers: FeeTier[];
  };
}

export const FEE_CONFIG: FeeConfiguration = {
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

export interface TopUpFeeCalculation {
  originalAmount: number;
  percentageRate: number;
  percentageFee: number;
  flatFee: number;
  totalFee: number;
  totalPayment: number;
  isValid?: boolean;
  tierSnapshot: FeeTier;
}

export interface PayoutFeeCalculation {
  requestedAmount: number;
  percentageRate: number;
  percentageFee: number;
  flatFee: number;
  totalFee: number;
  netPayout: number;
  isValid: boolean;
  tierSnapshot: FeeTier;
}

/**
 * Finds the applicable fee tier for a given amount.
 */
export function getFeeTier(amount: number, tiers: FeeTier[]): FeeTier | null {
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
 * Calculates wallet top-up charges with integer kobo precision.
 */
export function calculateTopUpFee(amount: number, config: FeeConfiguration = FEE_CONFIG): TopUpFeeCalculation {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Top-up amount must be a positive number.');
  }

  const tier = getFeeTier(num, config.walletTopUp.tiers);
  if (!tier) {
    throw new Error('No applicable fee tier found for top-up amount.');
  }

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
    tierSnapshot: { ...tier }
  };
}

/**
 * Calculates seller payout charges with integer kobo precision.
 */
export function calculatePayoutFee(amount: number, config: FeeConfiguration = FEE_CONFIG): PayoutFeeCalculation {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Withdrawal amount must be a positive number.');
  }

  const tier = getFeeTier(num, config.sellerPayout.tiers);
  if (!tier) {
    throw new Error('No applicable fee tier found for payout amount.');
  }

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
    tierSnapshot: { ...tier }
  };
}
