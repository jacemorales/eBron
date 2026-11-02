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
  Calendar,
  BarChart3,
  MessageSquare,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Product, User, WithdrawalRequest } from '../types';

export const AdminDashboard: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'deleted' | 'users' | 'withdrawals'>('analytics');
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
      onToast('error', 'Failed to load admin records from Google Sheets.');
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
      onToast('success', 'Product soft-deleted and removed from public marketplace.');
      refreshData();
    }
  };

  const handleRestore = async (productId: string) => {
    const res = await api.restoreProduct(productId);
    if (res.success) {
      onToast('success', 'Product successfully restored to active marketplace listings.');
      refreshData();
    }
  };

  const handleToggleUser = async (userId: string) => {
    const res = await api.toggleUserSuspension(userId);
    if (res.success) {
      onToast('info', `Student account status updated.`);
      refreshData();
    }
  };

  const handleProcessWithdrawal = async (requestId: string, decision: 'processed' | 'rejected') => {
    const notes = prompt(`Enter administrator verification notes for this ${decision} payout:`);
    const res = await api.processWithdrawal(requestId, decision, notes || '');
    if (res.success) {
      onToast('success', `Withdrawal marked as ${decision}!`);
      refreshData();
    }
  };

  if (loading || !analytics) {
    return <div className="text-center py-20 text-slate-400">Loading administrator console from Google Sheets...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" /> Administrator Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            eBron Management & Real-Time Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Powered by live Google Sheets records. All statistics reflect actual student records without fabrication.
          </p>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          <button
            type="button"
            onClick={() => setTimeframe('daily')}
            className={`px-3 py-1.5 rounded-xl transition ${timeframe === 'daily' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Daily (24h)
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1.5 rounded-xl transition ${timeframe === 'weekly' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Weekly (7d)
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 rounded-xl transition ${timeframe === 'monthly' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Monthly (30d)
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 rounded-xl transition ${timeframe === 'all' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'analytics' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart3 className="w-4 h-4" /> Comprehensive Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'products' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <ShoppingBag className="w-4 h-4" /> Active Listings ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deleted')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'deleted' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Trash2 className="w-4 h-4" /> Deleted Products ({deletedProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'users' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Users className="w-4 h-4" /> Student Users ({usersList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'withdrawals' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <DollarSign className="w-4 h-4" /> Withdrawals ({withdrawals.length})
        </button>
      </div>

      {/* TAB 1: DEDICATED ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Section A: User Analytics */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-cu-blue" /> A. User Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Users</div>
                <div className="text-xl font-black text-slate-900 mt-1">{analytics.platform.totalUsers}</div>
                <div className="text-[10px] text-slate-500">Registered students</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Active Users</div>
                <div className="text-xl font-black text-emerald-600 mt-1">{analytics.platform.activeUsers}</div>
                <div className="text-[10px] text-slate-500">Good standing</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Period Registrations</div>
                <div className="text-xl font-black text-cu-blue mt-1">{analytics.users.newRegistrations}</div>
                <div className="text-[10px] text-slate-500">In selected filter</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Active Buyers</div>
                <div className="text-xl font-black text-slate-900 mt-1">{analytics.users.activeBuyers}</div>
                <div className="text-[10px] text-slate-500">Placed orders</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Active Sellers</div>
                <div className="text-xl font-black text-slate-900 mt-1">{analytics.users.activeSellers}</div>
                <div className="text-[10px] text-slate-500">Listed products</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Buyer & Seller</div>
                <div className="text-xl font-black text-cu-gold mt-1">{analytics.users.bothBuyerAndSeller}</div>
                <div className="text-[10px] text-slate-500">Dual participation</div>
              </div>
            </div>
          </div>

          {/* Section B: Product Analytics */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cu-gold" /> B. Product Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Uploaded</div>
                <div className="text-xl font-black text-slate-900 mt-1">{analytics.products.totalUploaded}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Available on Marketplace</div>
                <div className="text-xl font-black text-emerald-600 mt-1">{analytics.products.available}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Sold Products</div>
                <div className="text-xl font-black text-cu-blue mt-1">{analytics.products.sold}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Deleted / Hidden Products</div>
                <div className="text-xl font-black text-red-600 mt-1">{analytics.products.deleted}</div>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-2">Products by Category</div>
              {Object.keys(analytics.products.byCategory).length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">No category records in this timeframe.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(analytics.products.byCategory).map(([cat, count]: [string, any]) => (
                    <div key={cat} className="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center">
                      <span className="text-slate-600 truncate">{cat}</span>
                      <span className="font-extrabold text-cu-blue bg-white px-2 py-0.5 rounded shadow-xs">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section C: Sales & Transaction Analytics */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> C. Sales & Transaction Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Orders Placed</div>
                <div className="text-xl font-black text-slate-900 mt-1">{analytics.sales.totalOrders}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Completed Transactions</div>
                <div className="text-xl font-black text-emerald-600 mt-1">{analytics.sales.completedOrders}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Pending Transactions</div>
                <div className="text-xl font-black text-amber-600 mt-1">{analytics.sales.pendingOrders}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Disputed Transactions</div>
                <div className="text-xl font-black text-red-600 mt-1">{analytics.sales.disputedOrders}</div>
              </div>
            </div>
          </div>

          {/* Section D: Revenue & Financial Analytics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" /> D. Revenue & Financial Analytics
              </h2>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                Simulated Sandbox Mode (Zero Actual Currency Charges)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Simulated Transaction Volume</div>
                <div className="text-xl font-black text-cu-blue mt-1">
                  ₦{Number(analytics.financial.simulatedVolume || analytics.sales.totalVolume).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">Test mode order total</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20">
                <div className="text-[10px] font-bold uppercase text-amber-700">Pending Balance in Wallets</div>
                <div className="text-xl font-black text-amber-900 mt-1">
                  ₦{Number(analytics.financial.totalPendingFunds).toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-700">Awaiting two-step confirmation</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Available Balance in Wallets</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  ₦{Number(analytics.financial.totalAvailableBalances).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-700">Eligible for bank withdrawal</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Withdrawals Processed</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  ₦{Number(analytics.financial.totalWithdrawalsProcessed).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">{analytics.financial.totalWithdrawalRequestsCount} total requests</div>
              </div>
            </div>
          </div>

          {/* Section E: Engagement Analytics */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cu-blue" /> E. Engagement Analytics
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Chat Messages</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{analytics.engagement.totalMessages}</div>
                </div>
                <MessageSquare className="w-6 h-6 text-blue-500 opacity-60" />
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Saved Items (Wishlists)</div>
                  <div className="text-xl font-black text-cu-gold mt-1">{analytics.engagement.totalSavedItems}</div>
                </div>
                <ShoppingBag className="w-6 h-6 text-cu-gold opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE PRODUCTS (Soft Delete Action) */}
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

      {/* TAB 3: DELETED PRODUCTS (Restoration) */}
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

      {/* TAB 4: USERS MANAGEMENT */}
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

      {/* TAB 5: WITHDRAWALS MANAGEMENT */}
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
