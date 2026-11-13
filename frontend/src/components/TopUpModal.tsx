import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, ShieldCheck, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  // Guarantees a payment is only ever processed once per opened modal.
  const processingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      processingRef.current = false;
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const finalize = async (reference: string, amountVal: number) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await api.topUpWallet(user.userId, amountVal, reference);
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

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.schoolEmail,
      amount: Math.round(amountVal * 100),
      currency: 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Student Name', variable_name: 'student_name', value: user.fullName },
          { display_name: 'Reg Number', variable_name: 'reg_number', value: user.regNumber }
        ]
      },
      callback: (response: { reference: string }) => {
        finalize(response && response.reference ? response.reference : reference, amountVal);
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

        <div className="grid grid-cols-4 gap-1.5">
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

        <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 border border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Credits directly to your buyer spending balance for immediate purchases.</span>
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
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            {loading ? 'Connecting...' : `Pay ₦${Number(amount || 0).toLocaleString()}`}
          </button>
        </div>
      </form>
    </div>
  );
};
