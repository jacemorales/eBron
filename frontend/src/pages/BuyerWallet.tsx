import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, PlusCircle, ArrowDownLeft, ArrowUpRight, ShieldCheck, ShoppingCart } from 'lucide-react';
import type { BuyerWallet, WalletTransaction } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TopUpModal } from '../components/TopUpModal';

export const BuyerWalletPage: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<BuyerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [w, txs] = await Promise.all([
        api.getWallet(user.userId),
        api.getWalletTransactions(user.userId)
      ]);
      setWallet(w);
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading buyer wallet...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <WalletIcon className="w-7 h-7 text-emerald-600" /> Buyer Spending Wallet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your personal shopping account. Funds here are exclusively used to purchase products on eBron.
          </p>
        </div>
        <button
          onClick={() => setTopUpOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" /> Top Up Wallet
        </button>
      </div>

      {/* Notice on separation */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <span className="font-bold">Spending Account Policy:</span> Money in this wallet is used exclusively for buying items and cannot be withdrawn. Seller sales earnings are tracked separately under <b>Sell Products &gt; Sales Balance</b>.
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-cu-blue to-cu-dark text-white p-6 rounded-3xl shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-cu-gold">Available Spending Balance</div>
          <div className="text-3xl sm:text-4xl font-black">₦{Number(wallet?.availableBalance || 0).toLocaleString()}</div>
          <p className="text-xs text-slate-300">
            Available immediately for purchasing any listed item on the CU marketplace.
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-cu-gold/10 pointer-events-none"></div>
      </div>

      {/* Transactions & History */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-600" /> Wallet Activity & Top-Up History
        </h2>

        {transactions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No wallet top-ups or purchase deductions yet. Click "Top Up Wallet" to fund your spending balance.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500 text-[11px]">
                  <tr>
                    <th className="p-3.5">Activity</th>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map(tx => (
                    <tr key={tx.transactionId} className="hover:bg-slate-50/50">
                      <td className="p-3.5 flex items-center gap-2">
                        {tx.type === 'topup' ? (
                          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <ArrowDownLeft className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                            <ArrowUpRight className="w-4 h-4" />
                          </span>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">
                            {tx.type === 'topup' ? 'Wallet Top-up' : 'Purchase Payment'}
                          </div>
                          <div className="text-[10px] text-slate-400">{tx.description}</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{tx.reference}</td>
                      <td className={`p-3.5 font-black ${tx.type === 'topup' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {tx.type === 'topup' ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === 'successful' ? 'bg-emerald-100 text-emerald-800' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Unified Top-Up Modal */}
      <TopUpModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(freshWallet) => {
          setWallet(freshWallet);
          loadData();
        }}
        onToast={onToast}
      />
    </div>
  );
};
