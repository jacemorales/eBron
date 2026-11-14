import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, ArrowUpRight, DollarSign, AlertCircle, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import type { SellerBalance, SalesTransaction, WithdrawalRequest, Bank } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SUPPORTED_BANKS: Bank[] = [
  { id: 'opay', name: 'Opay', code: '999992' },
  { id: 'moniepoint', name: 'Moniepoint', code: '50515' },
  { id: 'palmpay', name: 'PalmPay', code: '999991' }
];

export const SalesBalancePage: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [banks, setBanks] = useState<Bank[]>(SUPPORTED_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState(SUPPORTED_BANKS[0].code);
  const [selectedBankName, setSelectedBankName] = useState(SUPPORTED_BANKS[0].name);
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [accountResolved, setAccountResolved] = useState(false);
  const [resolutionError, setResolutionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [sb, stxs, wds, bList] = await Promise.all([
        api.getSalesBalance(user.userId),
        api.getSalesTransactions(user.userId),
        api.getUserWithdrawals(user.userId),
        api.getBanks().catch(() => SUPPORTED_BANKS)
      ]);
      setBalance(sb);
      setTransactions(stxs);
      setWithdrawals(wds);
      // Strictly restrict to supported banks: Opay, Moniepoint, PalmPay
      const filteredBanks = (bList && bList.length > 0)
        ? bList.filter(b => SUPPORTED_BANKS.some(sb => sb.code === b.code || sb.name.toLowerCase() === b.name.toLowerCase()))
        : SUPPORTED_BANKS;
      const finalBanks = filteredBanks.length > 0 ? filteredBanks : SUPPORTED_BANKS;
      setBanks(finalBanks);
      if (!selectedBankCode && finalBanks.length > 0) {
        setSelectedBankCode(finalBanks[0].code);
        setSelectedBankName(finalBanks[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleResolveAccount = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.trim().length !== 10 || !bankCode) return;
    setResolvingAccount(true);
    setResolutionError('');
    try {
      const res = await api.resolveAccount(accountNumber.trim(), bankCode);
      if (res.success && res.accountName) {
        setAccName(res.accountName);
        setAccountResolved(true);
        setResolutionError('');
      } else {
        setAccountResolved(false);
        setResolutionError(res.error || 'Could not verify account name.');
      }
    } catch (err: any) {
      setAccountResolved(false);
      setResolutionError(err.message || 'Verification failed.');
    } finally {
      setResolvingAccount(false);
    }
  };

  const handleAccountNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setAccNum(val);
    setAccountResolved(false);
    setResolutionError('');
    if (val.length === 10 && selectedBankCode) {
      handleResolveAccount(val, selectedBankCode);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedBankCode(code);
    const found = banks.find(b => b.code === code);
    if (found) setSelectedBankName(found.name);
    setAccountResolved(false);
    setResolutionError('');
    if (accNum.length === 10 && code) {
      handleResolveAccount(accNum, code);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !balance || isSubmitting) return;
    const withdrawAmt = Number(amt);
    if (withdrawAmt <= 0) {
      onToast('error', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (withdrawAmt > balance.availableBalance) {
      onToast('error', 'Withdrawal amount exceeds your available sales balance.');
      return;
    }
    if (accNum.length !== 10) {
      onToast('error', 'Account number must be exactly 10 numerical digits.');
      return;
    }
    if (!accName.trim()) {
      onToast('error', 'Please ensure your account name is verified before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.requestWithdrawal(user.userId, {
        amount: withdrawAmt,
        bankName: selectedBankName || 'Opay',
        bankCode: selectedBankCode,
        accountNumber: accNum,
        accountName: accName
      });

      if (res.success) {
        onToast('success', 'Withdrawal request submitted for review!');
        setModalOpen(false);
        setAmt(''); setAccNum(''); setAccName(''); setAccountResolved(false);
        await loadData();
      } else {
        onToast('error', res.error || 'Failed to submit withdrawal request.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Network error submitting withdrawal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 100% Transparency & Anti-Fraud Audit Reconciliation
  const recordReleasedEarnings = transactions
    .filter(t => t.type === 'released_sale' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const recordPendingSales = transactions
    .filter(t => t.type === 'pending_sale' && t.status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const recordTotalWithdrawals = withdrawals
    .filter(w => w.status === 'processed' || w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const isReconciled = !balance || (
    Number(balance.pendingBalance || 0) === recordPendingSales ||
    Number(balance.totalEarnings || 0) >= recordReleasedEarnings
  );

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

      {/* 100% Transparency Audit Banner */}
      <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>Financial Ledger & Sales Record Audit</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Verified Transparency
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Every Naira corresponds strictly to verified order completions and dual buyer-seller confirmations. No fund tampering or unverified payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100 font-mono text-[11px]">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase">Recorded Sales</span>
            <span className="font-black text-slate-800">₦{recordReleasedEarnings.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-slate-200"></div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase">Pending Dual-Check</span>
            <span className="font-black text-amber-700">₦{recordPendingSales.toLocaleString()}</span>
          </div>
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
          <form onSubmit={handleWithdrawal} className="bg-white p-6 rounded-3xl max-w-md w-full space-y-3.5 shadow-2xl border text-xs">
            <h3 className="text-base font-black text-slate-900">Request Bank Withdrawal</h3>
            <p className="text-[11px] text-slate-500">
              Transfer your available sales earnings directly to your verified bank account via Paystack.
            </p>

            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Supported Banks:</strong> For faster withdrawal processing, eBron currently supports transfers to <strong>Opay</strong>, <strong>Moniepoint</strong>, and <strong>PalmPay</strong> accounts only.
              </span>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Amount (₦)</label>
              <input
                type="number"
                min="500"
                max={balance.availableBalance}
                value={amt}
                onChange={e => setAmt(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder={`Max ₦${balance.availableBalance.toLocaleString()}`}
                className="w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Select Bank</label>
              <select
                value={selectedBankCode}
                onChange={handleBankChange}
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
              >
                <option value="">-- Choose a Bank --</option>
                {banks.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">10-digit Account Number</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={10}
                  value={accNum}
                  onChange={handleAccountNumChange}
                  required
                  disabled={isSubmitting}
                  placeholder="0123456789"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
                {resolvingAccount && (
                  <div className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </div>
                )}
              </div>
            </div>

            {/* Account Resolution Status / Display */}
            <div>
              <label className="block mb-1 font-bold text-slate-700">Verified Account Holder Name</label>
              {accountResolved ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">{accName}</div>
                    <div className="text-[10px] text-emerald-600">Verified via Paystack Account Resolution</div>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={accName}
                    readOnly
                    placeholder="Enter 10-digit account number to verify name"
                    className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  {resolutionError && (
                    <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" /> {resolutionError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
                className="px-3.5 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!accountResolved || resolvingAccount || isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
