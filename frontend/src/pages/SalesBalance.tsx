import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, ArrowUpRight, DollarSign, AlertCircle } from 'lucide-react';
import type { SellerBalance, SalesTransaction, WithdrawalRequest } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SalesBalancePage: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [bank, setBank] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [sb, stxs, wds] = await Promise.all([
        api.getSalesBalance(user.userId),
        api.getSalesTransactions(user.userId),
        api.getUserWithdrawals(user.userId)
      ]);
      setBalance(sb);
      setTransactions(stxs);
      setWithdrawals(wds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !balance) return;
    const withdrawAmt = Number(amt);
    if (withdrawAmt <= 0) {
      onToast('error', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (withdrawAmt > balance.availableBalance) {
      onToast('error', 'Withdrawal amount exceeds your available sales balance.');
      return;
    }

    const res = await api.requestWithdrawal(user.userId, {
      amount: withdrawAmt,
      bankName: bank,
      accountNumber: accNum,
      accountName: accName
    });

    if (res.success) {
      onToast('success', 'Withdrawal request submitted for review!');
      setModalOpen(false);
      setAmt(''); setBank(''); setAccNum(''); setAccName('');
      loadData();
    } else {
      onToast('error', res.error || 'Failed to submit withdrawal request.');
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading sales balance...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-600" /> Seller Sales Balance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor earnings from sold products, track pending balances, and withdraw available funds.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!balance || balance.availableBalance <= 0}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
        >
          <ArrowUpRight className="w-4 h-4" /> Request Bank Withdrawal
        </button>
      </div>

      {/* Financial Disclaimer */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2.5">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <span className="font-bold">Sales Income Only:</span> Funds in your Sales Balance cannot be used to purchase products. To buy items, please fund your spending wallet under <b>Buy Products &gt; Wallets</b>.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Available Sales Balance</div>
          <div className="text-2xl font-black text-slate-900">₦{Number(balance?.availableBalance || 0).toLocaleString()}</div>
          <p className="text-[10px] text-emerald-600 font-bold">Ready to withdraw to your bank</p>
        </div>

        <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-amber-800 uppercase flex justify-between items-center">
            <span>Pending Sales Balance</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">₦{Number(balance?.pendingBalance || 0).toLocaleString()}</div>
          <p className="text-[10px] text-amber-700 font-semibold">Held until dual confirmation</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Sales Earnings</div>
          <div className="text-2xl font-black text-cu-blue">₦{Number(balance?.totalEarnings || 0).toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 font-medium">All completed marketplace sales</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Withdrawals</div>
          <div className="text-2xl font-black text-slate-700">₦{Number(balance?.totalWithdrawals || 0).toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 font-medium">Processed or requested payouts</p>
        </div>
      </div>

      {/* Sales Transactions & Income History */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-slate-900">Sales Income History</h2>
        {transactions.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No sales income recorded yet. Items you sell will appear here.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500 text-[11px]">
                <tr>
                  <th className="p-3.5">Activity</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map(stx => (
                  <tr key={stx.transactionId} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">
                      {stx.type === 'pending_sale' ? 'Sale Awaiting Confirmation' :
                       stx.type === 'released_sale' ? 'Confirmed Sale Proceeds' : 'Withdrawal Request'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{stx.orderReference || '-'}</td>
                    <td className="p-3.5 font-black text-slate-900">₦{Number(stx.amount).toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        stx.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        stx.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {stx.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {stx.createdAt ? new Date(stx.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-slate-900">Bank Withdrawal History</h2>
        {withdrawals.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No withdrawal requests submitted yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500 text-[11px]">
                <tr>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Destination Bank</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {withdrawals.map(w => (
                  <tr key={w.requestId} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono text-slate-500">{w.requestId}</td>
                    <td className="p-3.5 font-black text-slate-900">₦{Number(w.amount).toLocaleString()}</td>
                    <td className="p-3.5 text-slate-700">{w.bankName} - {w.accountNumber} ({w.accountName})</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        w.status === 'processed' ? 'bg-emerald-100 text-emerald-800' :
                        w.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bank Withdrawal Request Modal */}
      {modalOpen && balance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleWithdrawal} className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3.5 shadow-2xl border text-xs">
            <h3 className="text-base font-black text-slate-900">Request Bank Withdrawal</h3>
            <p className="text-[11px] text-slate-500">
              Transfer your available sales earnings to your Nigerian bank account.
            </p>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Amount (₦)</label>
              <input
                type="number"
                min="500"
                max={balance.availableBalance}
                value={amt}
                onChange={e => setAmt(e.target.value)}
                required
                placeholder={`Max ₦${balance.availableBalance.toLocaleString()}`}
                className="w-full px-3.5 py-2.5 border rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Bank Name</label>
              <input
                type="text"
                value={bank}
                onChange={e => setBank(e.target.value)}
                required
                placeholder="e.g. Zenith Bank, GTBank"
                className="w-full px-3.5 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">10-Digit Account Number</label>
              <input
                type="text"
                value={accNum}
                onChange={e => setAccNum(e.target.value)}
                required
                placeholder="0123456789"
                className="w-full px-3.5 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Account Holder Name</label>
              <input
                type="text"
                value={accName}
                onChange={e => setAccName(e.target.value)}
                required
                placeholder="Full Name as registered with bank"
                className="w-full px-3.5 py-2.5 border rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
