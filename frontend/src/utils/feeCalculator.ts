/**
 * eBron - Dynamic Fee Calculator (Frontend)
 *
 * All percentage charges and flat fees are fetched dynamically from the server.
 * There are NO hardcoded fallback rates in code.
 *
 * The button is disabled and calculations are locked until fee tiers are
 * verified directly from the server.
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

// Active runtime configuration (initialized strictly from cache or loaded via api.getFeeConfig())
let runtimeFeeConfig: FeeConfiguration | null = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem('ebron_fee_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.walletTopUp && parsed.sellerPayout) {
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }
  return null;
})();

export function isFeeConfigLoaded(): boolean {
  return runtimeFeeConfig !== null && Array.isArray(runtimeFeeConfig.walletTopUp?.tiers) && runtimeFeeConfig.walletTopUp.tiers.length > 0;
}

export function getActiveFeeConfig(): FeeConfiguration | null {
  return runtimeFeeConfig;
}

export function setActiveFeeConfig(newConfig: FeeConfiguration) {
  if (newConfig && newConfig.walletTopUp && newConfig.sellerPayout) {
    runtimeFeeConfig = newConfig;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ebron_fee_config', JSON.stringify(newConfig));
      }
    } catch (e) {
      // Ignore localStorage write errors
    }
  }
}

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
 * Evaluates dynamic fee tiers with upper bound clamping.
 * Tiers are sorted by min ascending, and if a tier has an open upper bound while
 * a higher tier exists, effectiveMax is clamped to the next tier's min.
 */
export function getFeeTier(amount: number, tiers: FeeTier[] = []): FeeTier | null {
  const num = Number(amount);
  if (isNaN(num) || num <= 0 || !Array.isArray(tiers) || tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => (Number(a.min) || 0) - (Number(b.min) || 0));

  let matchedTier: FeeTier | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const nextTier = sorted[i + 1];
    const min = Number(tier.min) || 0;

    const effectiveMax = (tier.max !== null && tier.max !== undefined && String(tier.max).trim() !== '' && !isNaN(Number(tier.max)))
      ? Number(tier.max)
      : (nextTier ? (Number(nextTier.min) || null) : null);

    const meetsMin = num >= min;
    const meetsMax = effectiveMax === null || isNaN(effectiveMax) || num < effectiveMax;

    if (meetsMin && meetsMax) {
      matchedTier = tier;
    }
  }

  return matchedTier || sorted[sorted.length - 1] || null;
}

export function calculateTopUpFee(amount: number, config: FeeConfiguration | null = runtimeFeeConfig): TopUpFeeCalculation {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Top-up amount must be a positive number.');
  }

  if (!config || !config.walletTopUp || !Array.isArray(config.walletTopUp.tiers) || config.walletTopUp.tiers.length === 0) {
    throw new Error('Fee schedule is loading from server. Please check your connection and retry.');
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
    tierSnapshot: {
      min: tier.min,
      max: tier.max,
      percentage: tier.percentage,
      flatFee: tier.flatFee
    }
  };
}

export function calculatePayoutFee(amount: number, config: FeeConfiguration | null = runtimeFeeConfig): PayoutFeeCalculation {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Withdrawal amount must be a positive number.');
  }

  if (!config || !config.sellerPayout || !Array.isArray(config.sellerPayout.tiers) || config.sellerPayout.tiers.length === 0) {
    throw new Error('Fee schedule is loading from server. Please check your connection and retry.');
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

  return {
    requestedAmount: num,
    percentageRate: tier.percentage,
    percentageFee: Number((percentageFeeKobo / 100).toFixed(2)),
    flatFee: Number((flatFeeKobo / 100).toFixed(2)),
    totalFee: Number((totalFeeKobo / 100).toFixed(2)),
    netPayout: Number((netPayoutKobo / 100).toFixed(2)),
    isValid: netPayoutKobo > 0,
    tierSnapshot: {
      min: tier.min,
      max: tier.max,
      percentage: tier.percentage,
      flatFee: tier.flatFee
    }
  };
}
