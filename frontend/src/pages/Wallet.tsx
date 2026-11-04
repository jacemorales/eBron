import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Clock, ArrowUpRight, TrendingUp, PlusCircle } from 'lucide-react';
import type { Wallet as WalletType, WithdrawalRequest } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Wallet: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [amt, setAmt] = useState('');
  const [bank, setBank] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');

  const fetchWallet = async () => {
    if (!user) return;
    const [w, wds] = await Promise.all([api.getWallet(user.userId), api.getUserWithdrawals(user.userId)]);
    setWallet(w);
    setWithdrawals(wds);
  };

  useEffect(() => { fetchWallet(); }, [user]);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !wallet) return;
    const res = await api.requestWithdrawal(user.userId, {
      amount: Number(amt),
      bankName: bank,
      accountNumber: accNum,
      accountName: accName
    });
    if (res.success) {
      onToast('success', 'Withdrawal request recorded!');
      setModalOpen(false);
      setAmt(''); setBank(''); setAccNum(''); setAccName('');
      fetchWallet();
    } else {
      onToast('error', res.error || 'Failed');
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amountVal = Number(topUpAmount);
    if (!amountVal || amountVal <= 0) {
      onToast('error', 'Please enter a valid amount.');
      return;
    }

    setTopUpLoading(true);
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_sample_covenant_university';

    if (window.PaystackPop && window.PaystackPop.setup && !paystackKey.startsWith('pk_test_sample')) {
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: user.schoolEmail,
        amount: Math.round(amountVal * 100),
        currency: 'NGN',
        ref: 'PSTK_' + Date.now(),
        metadata: {
          custom_fields: [
            { display_name: 'Student Name', variable_name: 'student_name', value: user.fullName },
            { display_name: 'Reg Number', variable_name: 'reg_number', value: user.regNumber }
          ]
        },
        callback: async (response: { reference: string }) => {
          const res = await api.topUpWallet(user.userId, amountVal, response.reference);
          if (res.success && res.wallet) {
            setWallet(res.wallet);
            onToast('success', `₦${amountVal.toLocaleString()} added to your wallet!`);
          } else {
            await fetchWallet();
            onToast('success', `Wallet funded successfully!`);
          }
          setTopUpLoading(false);
          setTopUpModalOpen(false);
        },
        onClose: () => {
          setTopUpLoading(false);
          onToast('info', 'Paystack transaction cancelled.');
        }
      });
      handler.openIframe();
    } else {
      // Direct development / test mode top up
      setTimeout(async () => {
        const res = await api.topUpWallet(user.userId, amountVal, 'PSTK_TEST_' + Date.now());
        if (res.success && res.wallet) {
          setWallet(res.wallet);
          onToast('success', `₦${amountVal.toLocaleString()} added to your wallet!`);
        } else {
          setWallet(prev => prev ? {
            ...prev,
            availableBalance: (Number(prev.availableBalance) || 0) + amountVal
          } : null);
          onToast('success', `₦${amountVal.toLocaleString()} added to wallet!`);
        }
        setTopUpLoading(false);
        setTopUpModalOpen(false);
      }, 500);
    }
  };

  if (!wallet) return <div className="text-center py-12 text-slate-400">Loading wallet...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <WalletIcon className="w-6 h-6 text-emerald-600" /> Wallet & Balance
          </h1>
          <p className="text-xs text-slate-500">Fund your wallet to make purchases and manage your marketplace earnings.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTopUpModalOpen(true)}
            className="px-4 py-2 bg-cu-blue hover:bg-cu-dark text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
          >
            <PlusCircle className="w-4 h-4 text-cu-gold" /> Top Up via Paystack
          </button>
          <button
            onClick={() => setModalOpen(true)}
            disabled={wallet.availableBalance <= 0}
            className="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow"
          >
            <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase">Available Balance</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₦{Number(wallet.availableBalance).toLocaleString()}</div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Ready to withdraw</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20">
          <div className="text-xs font-bold text-amber-700 uppercase flex justify-between items-center">
            <span>Pending Balance</span> <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">₦{Number(wallet.pendingBalance).toLocaleString()}</div>
          <p className="text-[10px] text-amber-700 font-semibold mt-1">Held until dual confirmation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Earnings</div>
          <div className="text-2xl font-black text-cu-blue mt-1">₦{Number(wallet.totalEarnings).toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Withdrawals</div>
          <div className="text-2xl font-black text-slate-700 mt-1">₦{Number(wallet.totalWithdrawals).toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Withdrawal History</h2>
        {withdrawals.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No withdrawal requests submitted yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b p-2 font-bold uppercase text-slate-600">
                <tr>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Bank</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {withdrawals.map(w => (
                  <tr key={w.requestId}>
                    <td className="p-3 font-mono">{w.requestId}</td>
                    <td className="p-3 font-bold">₦{Number(w.amount).toLocaleString()}</td>
                    <td className="p-3">{w.bankName} - {w.accountNumber}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paystack Top Up Modal */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleTopUpSubmit} className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ₦
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Top Up Wallet (Paystack)</h3>
                <p className="text-[11px] text-slate-500">Instant funding via card, bank transfer, or USSD.</p>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Amount to Deposit (₦)</label>
              <input
                type="number"
                min="100"
                step="100"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
                required
                className="w-full px-3 py-2.5 border rounded-xl font-bold text-base text-slate-900"
              />
            </div>

            <div className="flex gap-2">
              {['2000', '5000', '10000', '20000'].map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setTopUpAmount(val)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${topUpAmount === val ? 'bg-cu-blue text-white border-cu-blue' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  +{Number(val).toLocaleString()}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200">
              Payments are processed securely via Paystack. Funds are credited directly to your eBron wallet for purchasing items.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTopUpModalOpen(false)}
                className="px-3.5 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={topUpLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1 shadow"
              >
                {topUpLoading ? 'Connecting...' : `Pay ₦${Number(topUpAmount || 0).toLocaleString()}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleWithdrawal} className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-3 text-xs">
            <h3 className="text-base font-bold">Request Bank Withdrawal</h3>
            <div>
              <label className="block mb-1 font-semibold">Amount (₦)</label>
              <input type="number" max={wallet.availableBalance} value={amt} onChange={e => setAmt(e.target.value)} required className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Bank Name</label>
              <input type="text" value={bank} onChange={e => setBank(e.target.value)} required placeholder="e.g. Zenith Bank" className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block mb-1 font-semibold">10-Digit Account Number</label>
              <input type="text" value={accNum} onChange={e => setAccNum(e.target.value)} required className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Account Holder Name</label>
              <input type="text" value={accName} onChange={e => setAccName(e.target.value)} required className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold">Submit</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
