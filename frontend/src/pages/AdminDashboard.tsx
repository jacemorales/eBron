import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Trash2,
  RotateCcw,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Product, User, Order, WithdrawalRequest } from '../types';

export const AdminDashboard: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'deleted' | 'users' | 'withdrawals'>('overview');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [analytics, setAnalytics] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [stats, allProds, users, wds] = await Promise.all([
        api.getAdminAnalytics(timeframe),
        api.getProducts({ includeDeleted: true }),
        api.getAllUsers(),
        api.getAllWithdrawals()
      ]);
      setAnalytics(stats);
      setProducts(allProds.filter(p => p.status !== 'deleted'));
      setDeletedProducts(allProds.filter(p => p.status === 'deleted'));
      setUsersList(users);
      setWithdrawals(wds);
    } catch (e) {
      console.error(e);
      onToast('error', 'Failed to load admin records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [timeframe]);

  const handleSoftDelete = async (productId: string) => {
    if (!user) return;
    const res = await api.softDeleteProduct(productId, user.userId);
    if (res.success) {
      onToast('success', 'Product soft-deleted and hidden from marketplace.');
      refreshData();
    }
  };

  const handleRestore = async (productId: string) => {
    const res = await api.restoreProduct(productId);
    if (res.success) {
      onToast('success', 'Product restored to active marketplace.');
      refreshData();
    }
  };

  const handleToggleUser = async (userId: string) => {
    const res = await api.toggleUserSuspension(userId);
    if (res.success) {
      onToast('info', `User status updated to ${res.user?.status}.`);
      refreshData();
    }
  };

  const handleProcessWithdrawal = async (requestId: string, decision: 'processed' | 'rejected') => {
    const notes = prompt(`Enter admin notes for this ${decision} payout:`);
    const res = await api.processWithdrawal(requestId, decision, notes || '');
    if (res.success) {
      onToast('success', `Withdrawal ${decision}!`);
      refreshData();
    }
  };

  if (loading || !analytics) {
    return <div className="text-center py-16 text-slate-400">Loading administrator controls...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" /> Covenant University Administration
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">eBron Management Console</h1>
        </div>

        {/* Timeframe Filter for real analytics */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          <button
            type="button"
            onClick={() => setTimeframe('daily')}
            className={`px-3 py-1.5 rounded-lg transition ${timeframe === 'daily' ? 'bg-white text-cu-blue shadow' : 'text-slate-600'}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1.5 rounded-lg transition ${timeframe === 'weekly' ? 'bg-white text-cu-blue shadow' : 'text-slate-600'}`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 rounded-lg transition ${timeframe === 'monthly' ? 'bg-white text-cu-blue shadow' : 'text-slate-600'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 rounded-lg transition ${timeframe === 'all' ? 'bg-white text-cu-blue shadow' : 'text-slate-600'}`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition ${activeTab === 'overview' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Analytics Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-3 transition ${activeTab === 'products' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Active Listings ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deleted')}
          className={`pb-3 transition ${activeTab === 'deleted' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Deleted Products ({deletedProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition ${activeTab === 'users' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Students ({usersList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-3 transition ${activeTab === 'withdrawals' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Withdrawals ({withdrawals.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards strictly calculated from real records */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Total Users</span> <Users className="w-4 h-4 text-cu-blue" />
              </div>
              <div className="text-2xl font-black text-slate-900">{analytics.platform.totalUsers}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">{analytics.platform.activeUsers} Active Accounts</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Products Uploaded</span> <ShoppingBag className="w-4 h-4 text-cu-gold" />
              </div>
              <div className="text-2xl font-black text-slate-900">{analytics.products.totalUploaded}</div>
              <div className="text-[11px] text-slate-500">{analytics.products.available} Available • {analytics.products.sold} Sold</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Orders Completed</span> <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{analytics.sales.completedOrders}</div>
              <div className="text-[11px] text-slate-500">Vol: ₦{Number(analytics.sales.completedVolume).toLocaleString()}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Escrow Pending Funds</span> <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-900">₦{Number(analytics.financial.totalPendingFunds).toLocaleString()}</div>
              <div className="text-[11px] text-amber-700 font-semibold">Held pending dual confirmation</div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Categories Breakdown</h3>
              {Object.keys(analytics.products.byCategory).length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">No category data for this timeframe.</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {Object.entries(analytics.products.byCategory).map(([cat, count]: [string, any]) => (
                    <div key={cat} className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-bold text-cu-blue bg-blue-50 px-2 py-0.5 rounded">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Financial & Withdrawal Overview</h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Available Balances in Wallets:</span>
                  <span className="font-bold">₦{Number(analytics.financial.totalAvailableBalances).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Pending Escrow Balances:</span>
                  <span className="font-bold text-amber-700">₦{Number(analytics.financial.totalPendingFunds).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Total Withdrawals Processed:</span>
                  <span className="font-bold text-emerald-600">₦{Number(analytics.financial.totalWithdrawalsProcessed).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Pending Withdrawal Requests:</span>
                  <span className="font-bold">{analytics.financial.totalWithdrawalRequestsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Products Management (Soft-Delete) */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Price</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No active products listed.</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.productId}>
                    <td className="p-3 flex items-center gap-2">
                      <img src={p.primaryImageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                      <span className="font-bold text-slate-900">{p.name}</span>
                    </td>
                    <td className="p-3">{p.sellerName}</td>
                    <td className="p-3 font-bold text-cu-blue">₦{Number(p.price).toLocaleString()}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{p.availability}</span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSoftDelete(p.productId)}
                        className="text-red-600 hover:text-red-800 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Soft Delete / Hide
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Deleted Products (Restoration) */}
      {activeTab === 'deleted' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Price</th>
                <th className="p-3">Deleted Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {deletedProducts.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No soft-deleted products.</td></tr>
              ) : (
                deletedProducts.map(p => (
                  <tr key={p.productId}>
                    <td className="p-3 flex items-center gap-2">
                      <img src={p.primaryImageUrl} alt="" className="w-8 h-8 rounded object-cover opacity-60" />
                      <span className="font-bold text-slate-700 line-through">{p.name}</span>
                    </td>
                    <td className="p-3">{p.sellerName}</td>
                    <td className="p-3">₦{Number(p.price).toLocaleString()}</td>
                    <td className="p-3 text-slate-400">{p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRestore(p.productId)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore to Marketplace
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">Email (@stu.cu.edu.ng)</th>
                <th className="p-3">Hall & Room</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {usersList.map(u => (
                <tr key={u.userId}>
                  <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                  <td className="p-3 font-mono text-[11px]">{u.schoolEmail}</td>
                  <td className="p-3">{u.hallOfResidence} Hall, Room {u.roomNumber}</td>
                  <td className="p-3 font-bold text-cu-blue uppercase text-[10px]">{u.role}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleUser(u.userId)}
                        className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                          u.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {u.status === 'active' ? <><UserX className="w-3.5 h-3.5" /> Suspend</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Withdrawals Management */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Bank Details</th>
                <th className="p-3">Status</th>
                <th className="p-3">Process</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {withdrawals.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No withdrawal requests.</td></tr>
              ) : (
                withdrawals.map(w => (
                  <tr key={w.requestId}>
                    <td className="p-3">
                      <div className="font-bold">{w.userName}</div>
                      <div className="text-[10px] text-slate-400">{w.userEmail}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">₦{Number(w.amount).toLocaleString()}</td>
                    <td className="p-3">
                      <div>{w.bankName} - {w.accountNumber}</div>
                      <div className="text-[10px] text-slate-400">{w.accountName}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        w.status === 'processed' ? 'bg-emerald-100 text-emerald-800' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {w.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleProcessWithdrawal(w.requestId, 'processed')}
                            className="bg-emerald-600 text-white px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve & Mark Processed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProcessWithdrawal(w.requestId, 'rejected')}
                            className="bg-red-50 text-red-700 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
