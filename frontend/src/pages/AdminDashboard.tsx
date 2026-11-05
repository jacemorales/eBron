import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  AlertTriangle,
  Flag,
  ExternalLink,
  Tag,
  Check,
  Search,
  Filter,
  Wallet,
  Store,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Product, User, WithdrawalRequest, ProductReport, ReportStatus } from '../types';

export const AdminDashboard: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'products' | 'deleted' | 'users' | 'withdrawals'>('analytics');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [analytics, setAnalytics] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [reports, setReports] = useState<ProductReport[]>([]);
  const [reportFilterCat, setReportFilterCat] = useState('All');
  const [reportFilterStatus, setReportFilterStatus] = useState('All');
  const [reportSearch, setReportSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [stats, allProds, users, wds, allReps] = await Promise.all([
        api.getAdminAnalytics(timeframe),
        api.getProducts({ includeDeleted: true }),
        api.getAllUsers(),
        api.getAllWithdrawals(),
        api.getReports({ timeframe })
      ]);
      setAnalytics(stats);
      setProducts(allProds.filter(p => p.status !== 'deleted'));
      setDeletedProducts(allProds.filter(p => p.status === 'deleted'));
      setUsersList(users);
      setWithdrawals(wds);
      setReports(allReps);
    } catch (e) {
      console.error(e);
      onToast('error', 'Failed to load platform records.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: ReportStatus) => {
    const adminNotes = prompt(`Enter optional internal administrator notes for this report:`) || undefined;
    const res = await api.updateReportStatus(reportId, status, adminNotes);
    if (res.success) {
      onToast('success', `Report marked as ${status.replace('_', ' ')}.`);
      refreshData();
    } else {
      onToast('error', res.error || 'Failed to update report status.');
    }
  };

  const handleAdminRemoveFromReport = async (productId: string, productName: string) => {
    const reason = prompt(`Reason for removing "${productName}":`) || 'Violates marketplace guidelines';
    if (!user) return;
    const res = await api.removeProductAdmin(productId, user.userId, reason);
    if (res.success) {
      onToast('success', `Product "${productName}" removed from marketplace.`);
      refreshData();
    } else {
      onToast('error', res.error || 'Failed to remove product.');
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
    return <div className="text-center py-20 text-slate-400">Loading administrator console...</div>;
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
            Live marketplace analytics. All statistics reflect actual student records without fabrication.
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
          className={`pb-3 flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === 'analytics' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart3 className="w-4 h-4" /> Comprehensive Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`pb-3 flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === 'reports' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Flag className="w-4 h-4 text-red-600" /> Report Analysis ({reports.filter(r => r.status === 'pending' || r.status === 'under_review').length} Active)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-3 flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === 'products' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
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

          {/* Section D1: Dedicated Buyer Spending Wallet Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> D1. Buyer Spending Wallet Analysis
              </h2>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Buyer Shopping Deposits (Non-withdrawable)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Buyer Wallets Registered</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {analytics.walletAnalysis?.totalBuyerWallets ?? analytics.platform.totalUsers}
                </div>
                <div className="text-[10px] text-slate-400">Student shopping accounts</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Available Spending Capital</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  ₦{Number(analytics.walletAnalysis?.totalAvailableSpendingBalance ?? analytics.financial.totalAvailableBalances).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-700">Available to purchase products</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Top-Up Deposits (Period)</div>
                <div className="text-xl font-black text-cu-blue mt-1">
                  ₦{Number(analytics.walletAnalysis?.totalTopUpVolume ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">{analytics.walletAnalysis?.topUpCount ?? 0} Paystack deposits</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Purchase Payments Deducted</div>
                <div className="text-xl font-black text-purple-700 mt-1">
                  ₦{Number(analytics.walletAnalysis?.totalPurchaseDeductionsVolume ?? analytics.sales.totalVolume).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">{analytics.walletAnalysis?.purchaseDeductionsCount ?? analytics.sales.totalOrders} order deductions</div>
              </div>
            </div>
          </div>

          {/* Section D2: Dedicated Seller Sales Balance & Payout Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-600" /> D2. Seller Sales Balance & Payout Analysis
              </h2>
              <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold border border-purple-200">
                Merchant Earnings & Payout Requests
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200">
                <div className="text-[10px] font-bold uppercase text-amber-800">Pending Sales (Verification)</div>
                <div className="text-xl font-black text-amber-900 mt-1">
                  ₦{Number(analytics.salesBalanceAnalysis?.totalPendingSalesBalance ?? analytics.financial.totalPendingFunds).toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-700">Awaiting dual confirmation</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Available Sales Balance</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  ₦{Number(analytics.salesBalanceAnalysis?.totalAvailableSalesBalance ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-700">Eligible for bank withdrawal</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Lifetime Sales Earnings</div>
                <div className="text-xl font-black text-cu-blue mt-1">
                  ₦{Number(analytics.salesBalanceAnalysis?.totalLifetimeEarnings ?? analytics.sales.completedVolume).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">Confirmed sales revenue</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Withdrawals Processed</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  ₦{Number(analytics.salesBalanceAnalysis?.totalWithdrawalsProcessedAmount ?? analytics.financial.totalWithdrawalsProcessed).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">
                  {analytics.salesBalanceAnalysis?.totalWithdrawalsProcessedCount ?? 0} completed payouts
                </div>
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

      {/* TAB: REPORT ANALYSIS */}
      {activeTab === 'reports' && (() => {
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.status === 'pending').length;
        const underReviewReports = reports.filter(r => r.status === 'under_review').length;
        const resolvedReports = reports.filter(r => r.status === 'resolved').length;
        const dismissedReports = reports.filter(r => r.status === 'dismissed').length;

        // Calculate product report frequencies
        const productReportCounts: Record<string, { count: number; name: string; productId: string; image: string; categories: Record<string, number>; reporters: Set<string> }> = {};
        reports.forEach(r => {
          if (!productReportCounts[r.productId]) {
            productReportCounts[r.productId] = {
              count: 0,
              name: r.productName,
              productId: r.productId,
              image: r.productImage || '',
              categories: {},
              reporters: new Set()
            };
          }
          productReportCounts[r.productId].count++;
          productReportCounts[r.productId].categories[r.category] = (productReportCounts[r.productId].categories[r.category] || 0) + 1;
          if (r.reporterId) productReportCounts[r.productId].reporters.add(r.reporterId);
        });

        const mostReportedProducts = Object.values(productReportCounts).sort((a, b) => b.count - a.count);

        // Filtered list
        const filteredReports = reports.filter(r => {
          if (reportFilterCat !== 'All' && r.category !== reportFilterCat) return false;
          if (reportFilterStatus !== 'All' && r.status !== reportFilterStatus) return false;
          if (reportSearch.trim()) {
            const q = reportSearch.toLowerCase();
            const inName = r.productName.toLowerCase().includes(q);
            const inSeller = (r.sellerName || '').toLowerCase().includes(q);
            const inExp = r.explanation.toLowerCase().includes(q);
            const inStock = (r.productStockNumber || '').toLowerCase().includes(q);
            if (!inName && !inSeller && !inExp && !inStock) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Report Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Reports</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalReports}</div>
                <span className="text-[10px] text-slate-500">Submitted in timeframe</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Pending</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{pendingReports}</div>
                <span className="text-[10px] text-amber-700">Awaiting triage</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Under Review</span>
                <div className="text-2xl font-black text-blue-900 mt-1">{underReviewReports}</div>
                <span className="text-[10px] text-blue-700">Investigation active</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Resolved</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">{resolvedReports}</div>
                <span className="text-[10px] text-emerald-700">Action taken / closed</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Dismissed</span>
                <div className="text-2xl font-black text-slate-700 mt-1">{dismissedReports}</div>
                <span className="text-[10px] text-slate-500">Invalid allegations</span>
              </div>
            </div>

            {/* Most Reported Products Monitoring (Product Report Rate) */}
            {mostReportedProducts.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Product Report Rate & High-Frequency Monitoring
                  </h3>
                  <span className="text-[11px] text-slate-400">Reports represent allegations requiring admin investigation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {mostReportedProducts.slice(0, 3).map(item => (
                    <div key={item.productId} className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${item.count >= 3 ? 'bg-red-50/60 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="space-y-0.5 truncate pr-2">
                        <Link to={`/product/${item.productId}`} className="font-bold text-slate-900 hover:text-cu-blue flex items-center gap-1 truncate">
                          <span>{item.name}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </Link>
                        <div className="text-[11px] text-slate-500">
                          {item.reporters.size} distinct reporter(s)
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-xl text-xs font-black ${item.count >= 3 ? 'bg-red-600 text-white' : 'bg-amber-200 text-amber-900'}`}>
                        {item.count} report{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="Search by product, seller, stock #, or keywords..."
                  className="w-full px-3 py-1.5 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={reportFilterCat}
                  onChange={e => setReportFilterCat(e.target.value)}
                  className="px-3 py-1.5 border rounded-xl bg-white text-xs"
                >
                  <option value="All">All Categories</option>
                  <option value="Scammer or fraudulent seller">Scammer / Fraud</option>
                  <option value="Fake or counterfeit product">Fake / Counterfeit</option>
                  <option value="Potentially stolen product">Potentially Stolen</option>
                  <option value="Misleading product description or images">Misleading Info</option>
                  <option value="Prohibited or inappropriate item">Prohibited / Inappropriate</option>
                  <option value="Suspicious pricing or suspicious activity">Suspicious Activity</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={reportFilterStatus}
                  onChange={e => setReportFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border rounded-xl bg-white text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Report ID</th>
                    <th className="p-3">Reported Product</th>
                    <th className="p-3">Seller</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Explanation</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No product reports match the selected filters or timeframe.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(rep => (
                      <tr key={rep.reportId} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-500">{rep.reportId}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {rep.productImage ? (
                              <img src={rep.productImage} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">📦</div>
                            )}
                            <div>
                              <Link
                                to={`/product/${rep.productId}`}
                                className="font-bold text-slate-900 hover:text-cu-blue hover:underline flex items-center gap-1"
                              >
                                {rep.productName} <ExternalLink className="w-3 h-3 text-slate-400" />
                              </Link>
                              {rep.productStockNumber && (
                                <div className="text-[10px] font-mono text-amber-700 flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5" /> Stock #{rep.productStockNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">{rep.sellerName}</td>
                        <td className="p-3">
                          <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                            {rep.category}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="text-slate-600 line-clamp-2" title={rep.explanation}>
                            {rep.explanation}
                          </div>
                          {rep.adminNotes && (
                            <div className="text-[10px] text-blue-700 bg-blue-50 p-1 rounded mt-1">
                              <strong>Note:</strong> {rep.adminNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                            rep.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            rep.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                            rep.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {rep.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {rep.status !== 'under_review' && rep.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateReportStatus(rep.reportId, 'under_review')}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold"
                              >
                                Review
                              </button>
                            )}
                            {rep.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateReportStatus(rep.reportId, 'resolved')}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                              >
                                Resolve
                              </button>
                            )}
                            {rep.status !== 'dismissed' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateReportStatus(rep.reportId, 'dismissed')}
                                className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-[10px] font-semibold"
                              >
                                Dismiss
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAdminRemoveFromReport(rep.productId, rep.productName)}
                              className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[10px] font-bold flex items-center gap-0.5"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Remove Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
