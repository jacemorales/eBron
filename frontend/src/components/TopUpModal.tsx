import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, ShieldCheck, X, Receipt, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { calculateTopUpFee, TopUpFeeCalculation, setActiveFeeConfig } from '../utils/feeCalculator';
import type { BuyerWallet } from '../types';

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newWallet: BuyerWallet) => void;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
  defaultAmount?: number;
  minAmount?: number;
  notice?: string;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  defaultAmount = 5000,
  minAmount = 100,
  notice
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [loading, setLoading] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  // Guarantees a payment is only ever processed once per opened modal.
  const processingRef = useRef(false);

  const fetchFeeConfig = async () => {
    setLoadingFees(true);
    setFeeError(null);
    try {
      const cfg = await api.getFeeConfig();
      if (cfg && cfg.walletTopUp && Array.isArray(cfg.walletTopUp.tiers) && cfg.walletTopUp.tiers.length > 0) {
        setActiveFeeConfig(cfg);
        setFeeError(null);
      } else {
        setFeeError('Could not retrieve fee schedule from Google Sheets.');
      }
    } catch (err: any) {
      setFeeError(err.message || 'Unable to connect to Google Sheets to load charges.');
    } finally {
      setLoadingFees(false);
    }
  };

  const numAmount = Number(amount) || 0;
  let feeCalc: TopUpFeeCalculation | null = null;
  if (numAmount > 0 && !loadingFees && !feeError) {
    try {
      feeCalc = calculateTopUpFee(numAmount);
    } catch {
      feeCalc = null;
    }
  }

  useEffect(() => {
    if (isOpen) {
      processingRef.current = false;
      setLoading(false);
      fetchFeeConfig();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const finalize = async (reference: string, amountVal: number, calc?: TopUpFeeCalculation | null) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await api.topUpWallet(user.userId, amountVal, reference, {
        fee: calc?.totalFee,
        totalPaid: calc?.totalPayment
      });
      if (res.success && res.wallet) {
        onSuccess(res.wallet);
        if (!res.alreadyCredited) {
          onToast('success', `₦${amountVal.toLocaleString()} added to your spending wallet!`);
        }
        onClose();
      } else {
        // Never fabricate a balance: re-sync from the server and surface the error.
        const fresh = await api.getWallet(user.userId);
        onSuccess(fresh);
        onToast('error', res.error || 'We could not confirm your payment. Your wallet balance is unchanged.');
        onClose();
      }
    } catch (err: any) {
      try {
        const fresh = await api.getWallet(user.userId);
        onSuccess(fresh);
      } catch {
        /* ignore refresh errors */
      }
      onToast('error', err.message || 'Error crediting wallet');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || processingRef.current) return;

    const amountVal = Number(amount);
    if (!amountVal || amountVal < minAmount) {
      onToast('error', `Please enter a valid amount (minimum ₦${minAmount.toLocaleString()}).`);
      return;
    }

    let currentCalc = feeCalc;
    if (!currentCalc) {
      try {
        currentCalc = calculateTopUpFee(amountVal);
      } catch (calcErr: any) {
        onToast('error', calcErr.message || 'Failed to calculate top-up fee.');
        return;
      }
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      onToast('error', 'Paystack is not configured. Please set VITE_PAYSTACK_PUBLIC_KEY in your .env file.');
      return;
    }

    if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
      onToast('error', 'Paystack checkout failed to load. Please check your connection and try again.');
      return;
    }

    setLoading(true);

    // One reference per payment attempt. It is reused for the Paystack transaction and
    // the backend credit, so a duplicated callback can never credit the wallet twice.
    const reference = 'PSTK_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    const totalToPayKobo = Math.round(currentCalc.totalPayment * 100);

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.schoolEmail,
      amount: totalToPayKobo,
      currency: 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Student Name', variable_name: 'student_name', value: user.fullName },
          { display_name: 'Reg Number', variable_name: 'reg_number', value: user.regNumber },
          { display_name: 'Intended Credit', variable_name: 'intended_credit', value: `₦${currentCalc.originalAmount.toLocaleString()}` },
          { display_name: 'Fee Breakdown', variable_name: 'fee_breakdown', value: `₦${currentCalc.totalFee.toLocaleString()} (${currentCalc.percentageRate}% + ₦${currentCalc.flatFee})` }
        ]
      },
      callback: (response: { reference: string }) => {
        finalize(response && response.reference ? response.reference : reference, amountVal, currentCalc);
      },
      onClose: () => {
        setLoading(false);
        if (!processingRef.current) {
          onToast('info', 'Paystack transaction cancelled.');
        }
      }
    });

    handler.openIframe();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleTopUpSubmit}
        className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
              ₦
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Fund Spending Wallet</h3>
              <p className="text-[11px] text-slate-500 font-medium">Secured with Paystack Inline</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-medium">
            {notice}
          </div>
        )}

        <div>
          <label className="block mb-1 text-xs font-bold text-slate-700">Amount to Deposit (₦)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-slate-400 font-black">₦</span>
            <input
              type="number"
              min={minAmount}
              step="100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {['1000', '2000', '5000', '10000'].map(val => (
            <button
              type="button"
              key={val}
              onClick={() => setAmount(val)}
              className={`py-1.5 rounded-xl border text-xs font-bold transition ${
                amount === val
                  ? 'bg-cu-blue text-white border-cu-blue'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              +{Number(val).toLocaleString()}
            </button>
          ))}
        </div>

        {/* Fee schedule loading state */}
        {loadingFees && (
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-blue-800 text-xs flex items-center gap-2.5 animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            <span>Fetching live fee schedule from Google Sheets...</span>
          </div>
        )}

        {/* Fee schedule error state */}
        {feeError && !loadingFees && (
          <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Unable to Calculate Charges</p>
              <p className="text-[11px] text-red-700 mt-0.5">{feeError}</p>
              <button
                type="button"
                onClick={fetchFeeConfig}
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Loading Fees
              </button>
            </div>
          </div>
        )}

        {/* Live Top-Up Fee Calculation Breakdown */}
        {feeCalc && !loadingFees && !feeError && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 pb-1 border-b border-slate-200/70">
              <Receipt className="w-3.5 h-3.5 text-cu-blue" />
              <span>Payment & Fee Breakdown</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-0.5">
              <span>Intended Wallet Credit:</span>
              <span className="font-bold text-slate-900">₦{feeCalc.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Service Charge ({feeCalc.percentageRate}%):</span>
              <span>+₦{feeCalc.percentageFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Flat Gateway Cost:</span>
              <span>+₦{feeCalc.flatFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-200/80 pt-1 flex justify-between font-bold text-slate-700 text-[11px]">
              <span>Total Top-Up Charges:</span>
              <span>₦{feeCalc.totalFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-200/80 pt-1.5 flex justify-between items-center text-emerald-800 font-black text-sm">
              <span>Total Amount to Pay:</span>
              <span>₦{feeCalc.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <div className="p-2.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 border border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Only your intended deposit amount is added to your spendable wallet balance.</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || loadingFees || !feeCalc || Boolean(feeError)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            {loading ? 'Connecting...' : loadingFees ? 'Loading Fees...' : feeError ? 'Fees Unavailable' : `Pay ₦${feeCalc ? feeCalc.totalPayment.toLocaleString() : '0'}`}
          </button>
        </div>
      </form>
    </div>
  );
};
