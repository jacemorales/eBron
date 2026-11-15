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
  ArrowUpRight,
  Loader2,
  RefreshCw,
  CheckCheck,
  History
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  Product,
  User,
  WithdrawalRequest,
  ProductReport,
  ReportStatus,
  WalletTransaction,
  SalesTransaction,
  Order,
  AccountAppeal,
  FinancialTransaction,
  BulkWithdrawalSummary,
  StatusHistoryItem,
  Feedback,
  FeedbackStatus
} from '../types';

export const AdminDashboard: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'products' | 'deleted' | 'users' | 'withdrawals' | 'transactions' | 'feedback'>('analytics');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [analytics, setAnalytics] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [reports, setReports] = useState<ProductReport[]>([]);
  const [refundRequests, setRefundRequests] = useState<Order[]>([]);
  const [appeals, setAppeals] = useState<AccountAppeal[]>([]);

  // Ledger & Reconciliation
  const [transactionsLedger, setTransactionsLedger] = useState<FinancialTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<FinancialTransaction[]>([]);
  const [selectedLedgerTx, setSelectedLedgerTx] = useState<FinancialTransaction | null>(null);
  const [reconcilingRef, setReconcilingRef] = useState<string | null>(null);

  // Bulk Withdrawal State
  const [bulkWithdrawalModalOpen, setBulkWithdrawalModalOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<BulkWithdrawalSummary | null>(null);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');

  // Withdrawal approval — payment method selection modal state.
  const [approvalTarget, setApprovalTarget] = useState<WithdrawalRequest | null>(null);
  const [approvalStep, setApprovalStep] = useState<'method' | 'manual' | 'manual_confirm' | 'manual_failed' | null>(null);
  const [manualFailureReason, setManualFailureReason] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);

  const [txView, setTxView] = useState<'wallet' | 'sales' | 'refunds' | 'ledger' | 'reconciliation'>('wallet');
  const [reportFilterCat, setReportFilterCat] = useState('All');
  const [reportFilterStatus, setReportFilterStatus] = useState('All');
  const [reportSearch, setReportSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Appeal Modal State
  const [selectedAppeal, setSelectedAppeal] = useState<AccountAppeal | null>(null);
  const [appealNotes, setAppealNotes] = useState('');
  const [appealActionLoading, setAppealActionLoading] = useState(false);

  // Refund Modal State
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<Order | null>(null);
  const [refundActionType, setRefundActionType] = useState<'approved' | 'rejected' | null>(null);
  const [refundNotes, setRefundNotes] = useState('');
  const [refundActionLoading, setRefundActionLoading] = useState(false);

  // User Feedback State
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackFilterType, setFeedbackFilterType] = useState('All');
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState('All');
  const [feedbackFilterDate, setFeedbackFilterDate] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [feedbackNotesDraft, setFeedbackNotesDraft] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [stats, allProds, users, wds, allReps, wTxs, sTxs, rRequests, allAppeals, ledger, recons, fbList] = await Promise.all([
        api.getAdminAnalytics(timeframe),
        api.getProducts({ includeDeleted: true }),
        api.getAllUsers(),
        api.getAllWithdrawals(),
        api.getReports({ timeframe }),
        api.getAllWalletTransactions(),
        api.getAllSalesTransactions(),
        api.getRefundRequests(),
        api.getAppeals(),
        api.getTransactionsLedger().catch(() => []),
        api.getReconciliations().catch(() => []),
        api.getAllFeedback().catch(() => [])
      ]);
      setAnalytics(stats);
      setProducts(allProds.filter(p => p.status !== 'deleted'));
      setDeletedProducts(allProds.filter(p => p.status === 'deleted'));
      setUsersList(users);
      setWithdrawals(wds);
      setReports(allReps);
      setWalletTransactions(wTxs);
      setSalesTransactions(sTxs);
      setRefundRequests(rRequests);
      setAppeals(allAppeals);
      setTransactionsLedger(ledger);
      setReconciliations(recons);
      setFeedbackList(fbList);
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

  const handleDeactivateUser = async (userId: string, targetStatus: 'deactivated' | 'active') => {
    const actionLabel = targetStatus === 'deactivated' ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} this student account?`)) return;
    const res = await api.deactivateUser(userId, targetStatus);
    if (res.success) {
      onToast('success', `Student account has been ${targetStatus === 'deactivated' ? 'deactivated' : 'reactivated'}.`);
      refreshData();
    } else {
      onToast('error', res.error || `Failed to ${actionLabel} account.`);
    }
  };

  const handleOpenAppeal = (appeal: AccountAppeal) => {
    setSelectedAppeal(appeal);
    setAppealNotes('');
  };

  const handleProcessAppeal = async (decision: 'approved' | 'rejected') => {
    if (!selectedAppeal || !user) return;
    setAppealActionLoading(true);
    try {
      const res = await api.processAccountAppeal(selectedAppeal.appealId, decision, user.userId, appealNotes.trim());
      if (res.success) {
        onToast('success', `Appeal ${decision} successfully.`);
        setSelectedAppeal(null);
        setAppealNotes('');
        refreshData();
      } else {
        onToast('error', res.error || `Failed to process appeal.`);
      }
    } catch (e: any) {
      onToast('error', e.message || 'Error processing appeal.');
    } finally {
      setAppealActionLoading(false);
    }
  };

  const handleOpenRefundModal = (order: Order, type: 'approved' | 'rejected') => {
    setSelectedRefundOrder(order);
    setRefundActionType(type);
    setRefundNotes('');
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundOrder || !refundActionType) return;
    if (refundActionType === 'rejected' && !refundNotes.trim()) {
      onToast('error', 'Please provide an explanation for rejecting this refund.');
      return;
    }
    setRefundActionLoading(true);
    try {
      const res = await api.processRefund(selectedRefundOrder.orderId, refundActionType, refundNotes.trim());
      if (res.success) {
        onToast('success', `Refund request has been ${refundActionType}.`);
        setSelectedRefundOrder(null);
        setRefundActionType(null);
        setRefundNotes('');
        refreshData();
      } else {
        onToast('error', res.error || `Failed to process refund.`);
      }
    } catch (e: any) {
      onToast('error', e.message || 'Error processing refund.');
    } finally {
      setRefundActionLoading(false);
    }
  };

  const handleOpenFeedback = (fb: Feedback) => {
    setSelectedFeedback(fb);
    setFeedbackNotesDraft(fb.adminNotes || '');
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: FeedbackStatus, adminNotes?: string) => {
    const res = await api.updateFeedbackStatus(feedbackId, status, adminNotes);
    if (res.success) {
      onToast('success', `Feedback marked as ${status}.`);
      setFeedbackList(prev => prev.map(f => f.feedbackId === feedbackId
        ? { ...f, status, adminNotes: adminNotes !== undefined ? adminNotes : f.adminNotes }
        : f));
      if (selectedFeedback && selectedFeedback.feedbackId === feedbackId) {
        setSelectedFeedback({ ...selectedFeedback, status, adminNotes: adminNotes !== undefined ? adminNotes : selectedFeedback.adminNotes });
      }
      refreshData();
    } else {
      onToast('error', res.error || 'Failed to update feedback.');
    }
  };

  const handleSaveFeedbackNotes = async () => {
    if (!selectedFeedback) return;
    setFeedbackSaving(true);
    try {
      const res = await api.updateFeedbackStatus(selectedFeedback.feedbackId, selectedFeedback.status, feedbackNotesDraft);
      if (res.success) {
        onToast('success', 'Administrator notes saved.');
        setSelectedFeedback({ ...selectedFeedback, adminNotes: feedbackNotesDraft });
        refreshData();
      } else {
        onToast('error', res.error || 'Failed to save notes.');
      }
    } finally {
      setFeedbackSaving(false);
    }
  };

  const openApprovalModal = (w: WithdrawalRequest) => {
    setApprovalTarget(w);
    setApprovalStep('method');
    setManualFailureReason('');
  };

  const closeApprovalModal = () => {
    setApprovalTarget(null);
    setApprovalStep(null);
    setManualFailureReason('');
  };

  // Execute a Paystack transfer for the selected request (existing secure integration).
  const runPaystackApproval = async () => {
    if (!approvalTarget || approvalBusy) return;
    const target = approvalTarget;
    const confirmApprove = window.confirm(
      `Approve and pay out via Paystack Transfer?\n\n` +
      `Request: ${target.reference || target.requestId}\n` +
      `Amount: ₦${Number(target.amount || 0).toLocaleString()}\n` +
      `Bank: ${target.bankName || ''} (${target.accountNumber || ''})\n\n` +
      `This initiates a real Paystack transfer and cannot be undone.`
    );
    if (!confirmApprove) return;
    setApprovalBusy(true);
    try {
      const res = await api.processWithdrawal(target.requestId, 'approved', '', user?.userId || '', 'paystack');
      if (res.success) {
        onToast('success', res.message || 'Paystack transfer initiated successfully!');
        closeApprovalModal();
        await refreshData();
      } else {
        onToast('error', res.error || 'Failed to process Paystack withdrawal.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error processing Paystack withdrawal.');
    } finally {
      setApprovalBusy(false);
    }
  };

  // Admin explicitly confirms a manual bank transfer was actually completed.
  const runManualConfirm = async () => {
    if (!approvalTarget || approvalBusy) return;
    setApprovalBusy(true);
    try {
      const res = await api.processWithdrawal(
        approvalTarget.requestId,
        'approved',
        'Manual bank transfer completed by administrator.',
        user?.userId || '',
        'manual_bank_transfer',
        'confirmed'
      );
      if (res.success) {
        onToast('success', res.message || 'Manual bank transfer recorded. Withdrawal marked successful.');
        closeApprovalModal();
        await refreshData();
      } else {
        onToast('error', res.error || 'Failed to record manual transfer.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error recording manual transfer.');
    } finally {
      setApprovalBusy(false);
    }
  };

  // Admin reports that the manual transfer failed (a reason is mandatory).
  const runManualFailure = async () => {
    if (!approvalTarget || approvalBusy) return;
    const reason = manualFailureReason.trim();
    if (!reason) {
      onToast('error', 'Please explain why the manual transfer failed.');
      return;
    }
    setApprovalBusy(true);
    try {
      const res = await api.processWithdrawal(
        approvalTarget.requestId,
        'approved',
        '',
        user?.userId || '',
        'manual_bank_transfer',
        'failed',
        reason
      );
      if (res.success) {
        onToast('success', res.message || 'Manual transfer marked as failed and reserved funds released.');
        closeApprovalModal();
        await refreshData();
      } else {
        onToast('error', res.error || 'Failed to mark transfer as failed.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error recording manual failure.');
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleProcessWithdrawal = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (processingWithdrawalId || bulkProcessing) return;
    // Approvals now route through the payment-method selection modal.
    if (decision === 'approved') {
      const target = withdrawals.find(w => w.requestId === requestId);
      if (target) openApprovalModal(target);
      return;
    }
    const notes = prompt('Enter reason/explanation for rejecting this withdrawal:');
    if (notes === null) return;
    setProcessingWithdrawalId(requestId);
    try {
      const res = await api.processWithdrawal(requestId, decision, notes || '', user?.userId || '');
      if (res.success) {
        onToast('success', 'Withdrawal request rejected.');
        await refreshData();
      } else {
        onToast('error', res.error || `Failed to process withdrawal.`);
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error processing withdrawal.');
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const handleBulkApproveWithdrawals = async () => {
    if (bulkProcessing) return;
    setBulkProcessing(true);
    try {
      const res = await api.bulkProcessWithdrawals(undefined, user?.userId || '');
      if (res.success && res.summary) {
        setBulkSummary(res.summary);
        onToast('success', res.message || `Bulk payout completed: ${res.summary.successful} approved, ${res.summary.failed} failed.`);
        await refreshData();
      } else {
        onToast('error', res.error || 'Failed to execute bulk withdrawal payouts.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error during bulk payout execution.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleReconcile = async (reference: string) => {
    if (reconcilingRef) return;
    const confirmReconcile = window.confirm(`Reconcile transaction ${reference}? This will verify the Paystack payment and credit the user's wallet without re-charging.`);
    if (!confirmReconcile) return;
    setReconcilingRef(reference);
    try {
      const res = await api.reconcileTransaction(reference);
      if (res.success) {
        onToast('success', res.message || `Transaction ${reference} reconciled successfully!`);
        await refreshData();
      } else {
        onToast('error', res.error || 'Failed to reconcile transaction.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error reconciling transaction.');
    } finally {
      setReconcilingRef(null);
    }
  };

  const userNameById = (id: string) => usersList.find(u => u.userId === id)?.fullName || id;

  const withdrawalStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: 'Pending Approval',
      processing: 'Processing',
      successful: 'Successful',
      processed: 'Successful',
      approved: 'Approved',
      rejected: 'Rejected',
      failed: 'Failed',
      reversed: 'Reversed',
      cancelled: 'Cancelled'
    };
    return map[status] || status;
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const statusOk = withdrawalFilterStatus === 'all'
      || w.status === withdrawalFilterStatus
      || (withdrawalFilterStatus === 'pending' && w.status === 'pending');
    const q = withdrawalSearch.trim().toLowerCase();
    const searchOk = !q
      || String(w.userName || '').toLowerCase().includes(q)
      || String(w.userRegNumber || '').toLowerCase().includes(q)
      || String(w.reference || '').toLowerCase().includes(q)
      || String(w.requestId || '').toLowerCase().includes(q);
    return statusOk && searchOk;
  });

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
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 flex items-center gap-1.5 transition ${activeTab === 'transactions' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <CreditCard className="w-4 h-4" /> Transactions ({walletTransactions.length + salesTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === 'feedback' ? 'text-cu-blue border-b-2 border-cu-blue' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MessageSquare className="w-4 h-4 text-cu-gold" /> User Feedback ({feedbackList.filter(f => f.status === 'New').length} New)
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
            <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
              <table className="w-full min-w-[900px] text-left text-xs">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full min-w-[720px] text-left text-xs">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full min-w-[640px] text-left text-xs">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full min-w-[820px] text-left text-xs">
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
              {usersList.map(u => {
                const userAppeal = appeals.find(a => a.userId === u.userId && a.status === 'pending');
                const isDeactivated = u.status === 'deactivated' || u.status === 'suspended';

                return (
                  <tr key={u.userId}>
                    <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-3 font-mono text-[11px]">{u.schoolEmail}</td>
                    <td className="p-3">{u.hallOfResidence} Hall, Room {u.roomNumber}</td>
                    <td className="p-3 font-bold text-cu-blue uppercase text-[10px]">{u.role}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        u.status === 'deactivated' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {userAppeal && (
                          <button
                            type="button"
                            onClick={() => handleOpenAppeal(userAppeal)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" /> View Appeal
                            <span className="ml-0.5 px-1.5 py-0.2 bg-white text-amber-800 rounded-full text-[9px] font-black">Pending</span>
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateUser(u.userId, isDeactivated ? 'active' : 'deactivated')}
                            className={`text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                              !isDeactivated ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {!isDeactivated ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: WITHDRAWALS MANAGEMENT (Paystack Payouts) */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" /> Seller Withdrawal Payouts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Requests: <strong>{withdrawals.length}</strong> • Pending Approval: <strong className="text-amber-600">{withdrawals.filter(w => w.status === 'pending').length}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkWithdrawalModalOpen(true)}
                disabled={bulkProcessing || withdrawals.filter(w => w.status === 'pending').length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {bulkProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing Payouts...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" /> Approve All Pending ({withdrawals.filter(w => w.status === 'pending').length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={withdrawalFilterStatus}
                  onChange={(e) => setWithdrawalFilterStatus(e.target.value)}
                  className="border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cu-blue"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="processing">Processing</option>
                  <option value="successful">Successful</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                  <option value="reversed">Reversed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                Showing {filteredWithdrawals.length} of {withdrawals.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={withdrawalSearch}
                onChange={(e) => setWithdrawalSearch(e.target.value)}
                placeholder="Search user, name, reference or request ID"
                className="border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-cu-blue"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Bank Details</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Process</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredWithdrawals.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-400">No withdrawal requests match the current filters.</td></tr>
                ) : (
                  filteredWithdrawals.map(w => (
                    <tr key={w.requestId}>
                      <td className="p-3 font-mono text-[11px] text-slate-600">{w.requestId}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{w.userName}</div>
                        <div className="text-[10px] text-slate-500">{w.userRegNumber || '—'}</div>
                        <div className="text-[10px] text-slate-400">{w.userEmail}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">₦{Number(w.amount).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{w.bankName} {w.bankCode ? <span className="font-mono text-slate-500 font-normal">({w.bankCode})</span> : ''}</div>
                        <div className="font-mono text-slate-600">{w.accountNumber}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{w.accountName}</div>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">
                        <div>{new Date(w.createdAt || '').toLocaleString() || '—'}</div>
                        {w.completedAt && (
                          <div className="text-[10px] text-emerald-600 font-bold">Done: {new Date(w.completedAt).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{w.reference || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.status === 'processed' || w.status === 'successful' ? 'bg-emerald-100 text-emerald-800' :
                          w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          w.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                          w.status === 'reversed' ? 'bg-purple-100 text-purple-800' :
                          w.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                          w.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {withdrawalStatusLabel(w.status)}
                        </span>
                        {w.paymentMethod && (
                          <div className="mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              w.paymentMethod === 'manual_bank_transfer' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {w.paymentMethod === 'manual_bank_transfer' ? 'Manual Transfer' : 'Paystack'}
                            </span>
                          </div>
                        )}
                        {w.paystackTransferCode && (
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">Code: {w.paystackTransferCode}</div>
                        )}
                        {w.manualConfirmedBy && (
                          <div className="text-[9px] text-indigo-600 mt-0.5">Confirmed by: {userNameById(w.manualConfirmedBy)}</div>
                        )}
                        {w.status === 'rejected' && w.rejectionReason && (
                          <div className="text-[10px] text-red-500 mt-0.5">Reason: {w.rejectionReason}</div>
                        )}
                        {(w.status === 'failed' || w.status === 'cancelled') && w.failureReason && (
                          <div className="text-[10px] text-rose-500 mt-0.5">Reason: {w.failureReason}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {(w.status === 'pending' || w.status === 'failed') && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={processingWithdrawalId === w.requestId || bulkProcessing}
                              onClick={() => handleProcessWithdrawal(w.requestId, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              {processingWithdrawalId === w.requestId ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3" /> Approve
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={processingWithdrawalId === w.requestId || bulkProcessing}
                              onClick={() => handleProcessWithdrawal(w.requestId, 'rejected')}
                              className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 px-2.5 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                        {w.status === 'processing' && (
                          <span className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> In progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: WALLET, SALES & REFUNDS TRANSACTIONS MONITOR */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cu-blue" /> Financial & Refund Management
            </h2>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setTxView('wallet')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${txView === 'wallet' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" /> Wallet ({walletTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setTxView('sales')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${txView === 'sales' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Sales ({salesTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setTxView('refunds')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${txView === 'refunds' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Refunds ({refundRequests.filter(r => r.status === 'refund_pending_approval').length})
              </button>
              <button
                type="button"
                onClick={() => setTxView('ledger')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${txView === 'ledger' ? 'bg-white text-cu-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <History className="w-3.5 h-3.5 text-blue-600" /> Central Ledger ({transactionsLedger.length})
              </button>
              <button
                type="button"
                onClick={() => setTxView('reconciliation')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${txView === 'reconciliation' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" /> Reconciliation ({reconciliations.length})
              </button>
            </div>
          </div>

          {txView === 'refunds' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Order Ref & Product</th>
                    <th className="p-3">Requester</th>
                    <th className="p-3">Buyer & Seller</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reason & Explanation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {refundRequests.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400">No refund requests recorded.</td></tr>
                  ) : (
                    refundRequests.map(order => {
                      const isPending = order.status === 'refund_pending_approval';
                      return (
                        <tr key={order.orderId}>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{order.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">Ref: {order.orderReference}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.cancellationRequestedBy === 'buyer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {order.cancellationRequestedBy || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div>Buyer: <strong>{order.buyerName}</strong></div>
                            <div className="text-slate-500">Seller: <strong>{order.sellerName}</strong></div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">₦{Number(order.amount).toLocaleString()}</td>
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-800">{order.cancellationReason || 'No reason specified'}</div>
                            {order.cancellationExplanation && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{order.cancellationExplanation}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'refund_pending_approval' ? 'bg-amber-100 text-amber-800' :
                              order.status === 'refunded' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            {isPending ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRefundModal(order, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <CheckCircle className="w-3 h-3" /> Approve Refund
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRefundModal(order, 'rejected')}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                                >
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : txView === 'wallet' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {walletTransactions.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400">No wallet transactions recorded yet.</td></tr>
                  ) : (
                    walletTransactions.map(tx => (
                      <tr key={tx.transactionId}>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{tx.transactionId}</td>
                        <td className="p-3">
                          <div className="font-bold">{userNameById(tx.userId)}</div>
                          <div className="text-[10px] text-slate-400">{tx.userId}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'topup' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {tx.type === 'topup' ? 'Top-up' : 'Purchase'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">₦{Number(tx.amount).toLocaleString()}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{tx.reference}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.status === 'successful' ? 'bg-emerald-100 text-emerald-800' : tx.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : txView === 'sales' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Seller</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Order Ref</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {salesTransactions.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400">No sales transactions recorded yet.</td></tr>
                  ) : (
                    salesTransactions.map(tx => (
                      <tr key={tx.transactionId}>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{tx.transactionId}</td>
                        <td className="p-3">
                          <div className="font-bold">{userNameById(tx.sellerId)}</div>
                          <div className="text-[10px] text-slate-400">{tx.sellerId}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.type === 'released_sale' ? 'bg-emerald-100 text-emerald-800' :
                            tx.type === 'withdrawal' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">₦{Number(tx.amount).toLocaleString()}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{tx.orderReference || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : tx.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : txView === 'ledger' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Reference / TxID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Method / Provider</th>
                    <th className="p-3">eBron Status</th>
                    <th className="p-3">Paystack Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactionsLedger.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center text-slate-400">No transactions recorded in central ledger yet.</td></tr>
                  ) : (
                    transactionsLedger.map(tx => {
                      let historyCount = 0;
                      if (Array.isArray(tx.statusHistory)) {
                        historyCount = tx.statusHistory.length;
                      } else if (typeof tx.statusHistory === 'string') {
                        try { historyCount = JSON.parse(tx.statusHistory).length; } catch (e) { historyCount = 1; }
                      }
                      return (
                        <tr key={tx.transactionId || tx.reference}>
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-800">{tx.reference || '-'}</div>
                            <div className="font-mono text-[10px] text-slate-400">{tx.transactionId}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {tx.type ? tx.type.replace('_', ' ') : 'transaction'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{userNameById(tx.userId)}</div>
                            <div className="text-[10px] text-slate-400">{tx.userId}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">₦{Number(tx.amount || 0).toLocaleString()}</td>
                          <td className="p-3 capitalize text-slate-600">{tx.paymentMethod || 'wallet'} ({tx.paymentProvider || 'ebron'})</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.eBronStatus === 'completed' || tx.eBronStatus === 'success' ? 'bg-emerald-100 text-emerald-800' :
                              tx.eBronStatus === 'requires_reconciliation' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                              tx.eBronStatus === 'failed' || tx.eBronStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tx.eBronStatus || 'pending'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.paystackStatus === 'success' || tx.paystackStatus === 'successful' ? 'bg-emerald-100 text-emerald-800' :
                              tx.paystackStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {tx.paystackStatus || 'none'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setSelectedLedgerTx(tx)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <History className="w-3 h-3 text-blue-600" /> History ({historyCount})
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Automated Payment Tracking & Reconciliation</div>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Transactions listed below are flagged where Paystack payment succeeded, but eBron processing encountered an issue.
                    Clicking <strong>Reconcile Transaction</strong> verifies Paystack status server-side and safely credits the student's wallet without charging them again.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Paystack Status</th>
                      <th className="p-3">eBron Status</th>
                      <th className="p-3">Issue / Error</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reconciliations.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                        No transactions require reconciliation. All payments are healthy and reconciled!
                      </td></tr>
                    ) : (
                      reconciliations.map(tx => (
                        <tr key={tx.reference}>
                          <td className="p-3 font-mono font-bold text-slate-800">{tx.reference}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{userNameById(tx.userId)}</div>
                            <div className="text-[10px] text-slate-400">{tx.userId}</div>
                          </td>
                          <td className="p-3 capitalize">{tx.type}</td>
                          <td className="p-3 font-bold text-slate-900">₦{Number(tx.amount || 0).toLocaleString()}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {tx.paystackStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                              {tx.eBronStatus}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-rose-600 max-w-xs truncate">{tx.errorMessage || 'eBron fulfillment interrupted'}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              disabled={reconcilingRef === tx.reference}
                              onClick={() => handleReconcile(tx.reference)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              {reconcilingRef === tx.reference ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Reconciling...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" /> Reconcile Transaction
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: USER FEEDBACK MANAGEMENT */}
      {activeTab === 'feedback' && (() => {
        const totalFeedback = feedbackList.length;
        const newCount = feedbackList.filter(f => f.status === 'New').length;
        const reviewCount = feedbackList.filter(f => f.status === 'Under Review').length;
        const resolvedCount = feedbackList.filter(f => f.status === 'Resolved').length;

        const now = Date.now();
        const dateCutoff = feedbackFilterDate === 'today' ? now - 24 * 60 * 60 * 1000
          : feedbackFilterDate === '7d' ? now - 7 * 24 * 60 * 60 * 1000
          : feedbackFilterDate === '30d' ? now - 30 * 24 * 60 * 60 * 1000
          : 0;

        const filtered = feedbackList.filter(f => {
          if (feedbackFilterType !== 'All' && f.type !== feedbackFilterType) return false;
          if (feedbackFilterStatus !== 'All' && f.status !== feedbackFilterStatus) return false;
          if (dateCutoff && new Date(f.createdAt).getTime() < dateCutoff) return false;
          if (feedbackSearch.trim()) {
            const q = feedbackSearch.toLowerCase();
            const hay = `${f.feedbackId} ${f.userName} ${f.userEmail || ''} ${f.subject} ${f.message}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Feedback</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalFeedback}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase">New</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{newCount}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Under Review</span>
                <div className="text-2xl font-black text-blue-900 mt-1">{reviewCount}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Resolved</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">{resolvedCount}</div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={feedbackSearch}
                  onChange={e => setFeedbackSearch(e.target.value)}
                  placeholder="Search by user, subject, message, or feedback ID..."
                  className="w-full px-3 py-1.5 border rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={feedbackFilterType}
                  onChange={e => setFeedbackFilterType(e.target.value)}
                  className="px-3 py-1.5 border rounded-xl bg-white text-xs"
                >
                  <option value="All">All Types</option>
                  <option value="Issue/Problem">Issue/Problem</option>
                  <option value="Suggestion">Suggestion</option>
                  <option value="Positive Feedback">Positive Feedback</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
                <select
                  value={feedbackFilterStatus}
                  onChange={e => setFeedbackFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border rounded-xl bg-white text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <select
                  value={feedbackFilterDate}
                  onChange={e => setFeedbackFilterDate(e.target.value as any)}
                  className="px-3 py-1.5 border rounded-xl bg-white text-xs"
                >
                  <option value="all">All Time</option>
                  <option value="today">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 border-b">
                  <tr>
                    <th className="p-3">Feedback ID</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">No feedback matches the selected filters.</td></tr>
                  ) : (
                    filtered.map(f => (
                      <tr key={f.feedbackId} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-500">{f.feedbackId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{f.userName || f.userId}</div>
                          <div className="text-[10px] text-slate-400">{f.userEmail || f.userId}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                            f.type === 'Issue/Problem' ? 'bg-red-50 text-red-700 border border-red-200' :
                            f.type === 'Suggestion' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            f.type === 'Positive Feedback' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {f.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 max-w-[160px] truncate" title={f.subject}>{f.subject}</td>
                        <td className="p-3 max-w-xs">
                          <div className="text-slate-600 line-clamp-2" title={f.message}>{f.message}</div>
                          {f.adminNotes && (
                            <div className="text-[10px] text-blue-700 bg-blue-50 p-1 rounded mt-1">
                              <strong>Note:</strong> {f.adminNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : '-'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                            f.status === 'New' ? 'bg-amber-100 text-amber-800' :
                            f.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenFeedback(f)}
                              className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[10px] font-bold"
                            >
                              Open
                            </button>
                            {f.status !== 'Under Review' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(f.feedbackId, 'Under Review', f.adminNotes)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold"
                              >
                                Review
                              </button>
                            )}
                            {f.status !== 'Resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(f.feedbackId, 'Resolved', f.adminNotes)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                              >
                                Resolve
                              </button>
                            )}
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

      {/* Feedback Detail Modal (Admin only - includes internal notes) */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cu-gold" />
                <h3 className="text-base font-extrabold text-slate-900">User Feedback Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Feedback ID:</span><span className="font-mono text-slate-800">{selectedFeedback.feedbackId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">User:</span><span className="font-bold text-slate-900">{selectedFeedback.userName || selectedFeedback.userId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email / ID:</span><span className="text-slate-700">{selectedFeedback.userEmail || selectedFeedback.userId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="font-semibold text-slate-800">{selectedFeedback.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Submitted:</span><span className="text-slate-700">{selectedFeedback.createdAt ? new Date(selectedFeedback.createdAt).toLocaleString() : '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Last Updated:</span><span className="text-slate-700">{selectedFeedback.updatedAt ? new Date(selectedFeedback.updatedAt).toLocaleString() : '-'}</span></div>
            </div>

            <div className="text-xs">
              <div className="font-bold text-slate-700 mb-1">Subject</div>
              <div className="text-slate-900 font-semibold">{selectedFeedback.subject || '-'}</div>
            </div>

            <div className="text-xs">
              <div className="font-bold text-slate-700 mb-1">Message</div>
              <div className="text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-48 overflow-y-auto">{selectedFeedback.message}</div>
            </div>

            <div className="text-xs">
              <div className="font-bold text-slate-700 mb-1.5">Set Status</div>
              <div className="flex gap-2">
                {(['New', 'Under Review', 'Resolved'] as FeedbackStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleUpdateFeedbackStatus(selectedFeedback.feedbackId, s, feedbackNotesDraft)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                      selectedFeedback.status === s ? 'bg-cu-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Internal Administrator Notes (only visible to admins)</label>
              <textarea
                rows={3}
                value={feedbackNotesDraft}
                onChange={e => setFeedbackNotesDraft(e.target.value)}
                placeholder="Add internal notes about this feedback..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cu-blue"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveFeedbackNotes}
                disabled={feedbackSaving}
                className="flex-1 py-2.5 px-4 bg-cu-blue hover:bg-cu-blue/90 text-white rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-50"
              >
                {feedbackSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Review Modal (Inside Admin Dashboard Users Area) */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-slate-900">Review Student Appeal</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{selectedAppeal.fullName || selectedAppeal.userName || 'Student'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">{selectedAppeal.schoolEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Matric Number:</span>
                <span className="font-mono text-slate-800">{selectedAppeal.matricNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted:</span>
                <span className="text-slate-700">{new Date(selectedAppeal.submittedAt || selectedAppeal.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Appeal Explanation</label>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {selectedAppeal.explanation}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Administrator Notes / Reason <span className="text-slate-400 font-normal">(optional for reactivate, recommended for reject)</span>
              </label>
              <textarea
                rows={2}
                value={appealNotes}
                onChange={e => setAppealNotes(e.target.value)}
                placeholder="Enter feedback or internal note for this decision..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cu-blue"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleProcessAppeal('approved')}
                disabled={appealActionLoading}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Reactivate Account
              </button>
              <button
                type="button"
                onClick={() => handleProcessAppeal('rejected')}
                disabled={appealActionLoading}
                className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject Appeal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Approval/Rejection Modal */}
      {selectedRefundOrder && refundActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleProcessRefundSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className={`w-5 h-5 ${refundActionType === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`} />
                <h3 className="text-base font-extrabold text-slate-900">
                  {refundActionType === 'approved' ? 'Approve Refund Request' : 'Reject Refund Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedRefundOrder(null); setRefundActionType(null); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-bold text-slate-900">{selectedRefundOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Ref:</span>
                <span className="font-mono text-slate-800">{selectedRefundOrder.orderReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-cu-blue">₦{Number(selectedRefundOrder.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requester:</span>
                <span className="font-semibold uppercase text-slate-800">{selectedRefundOrder.cancellationRequestedBy || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="font-semibold text-slate-800">{selectedRefundOrder.cancellationReason || 'N/A'}</span>
              </div>
              {selectedRefundOrder.cancellationExplanation && (
                <div className="mt-1 pt-1 border-t text-slate-600 text-[11px]">
                  <strong>Explanation:</strong> {selectedRefundOrder.cancellationExplanation}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {refundActionType === 'approved' ? 'Internal Administrator Notes (Optional)' : 'Reason for Rejection *'}
              </label>
              <textarea
                rows={3}
                required={refundActionType === 'rejected'}
                value={refundNotes}
                onChange={e => setRefundNotes(e.target.value)}
                placeholder={refundActionType === 'approved' ? 'Add any notes for records...' : 'Explain clearly why the cancellation request is rejected...'}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cu-blue"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setSelectedRefundOrder(null); setRefundActionType(null); }}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundActionLoading}
                className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors disabled:opacity-50 ${
                  refundActionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {refundActionLoading ? 'Processing...' : refundActionType === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Withdrawal Approval — Payment Method Selection Modal */}
      {approvalTarget && approvalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => { if (!approvalBusy) closeApprovalModal(); }}
              disabled={approvalBusy}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Step 1: choose method */}
            {approvalStep === 'method' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Approve Withdrawal — Choose Payment Method
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Request <strong>{approvalTarget.reference || approvalTarget.requestId}</strong> • ₦{Number(approvalTarget.amount).toLocaleString()} • {approvalTarget.bankName} ({approvalTarget.accountNumber})
                  </p>
                </div>
                <p className="text-xs text-slate-600">You must choose how this withdrawal will be paid out. The method cannot be switched once processing begins.</p>
                <div className="grid gap-3">
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={runPaystackApproval}
                    className="w-full text-left p-4 rounded-2xl border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 font-black text-sky-800 text-sm">
                      <CreditCard className="w-4 h-4" /> Paystack Transfer
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Automated secure transfer through the existing Paystack integration. Marked successful only after Paystack confirms.</p>
                  </button>
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => setApprovalStep('manual')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 font-black text-indigo-800 text-sm">
                      <Store className="w-4 h-4" /> Manual Bank Transfer
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Transfer the funds to the user's bank yourself, then confirm the outcome here.</p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: manual transfer details & actions */}
            {approvalStep === 'manual' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Manual Bank Transfer</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Transfer the amount to the account below, then record the outcome.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">User's Full Name</span><span className="font-bold text-slate-900 text-right">{approvalTarget.userName || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Amount</span><span className="font-black text-slate-900">₦{Number(approvalTarget.amount).toLocaleString()}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Bank Name</span><span className="font-bold text-slate-900 text-right">{approvalTarget.bankName || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Account Number</span><span className="font-mono font-bold text-slate-900 text-right">{approvalTarget.accountNumber || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Account Name</span><span className="font-bold text-slate-900 text-right">{approvalTarget.accountName || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Withdrawal Reference</span><span className="font-mono text-slate-700 text-right">{approvalTarget.reference || approvalTarget.requestId}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500 font-semibold">Request Date</span><span className="text-slate-700 text-right">{approvalTarget.createdAt ? new Date(approvalTarget.createdAt).toLocaleString() : '—'}</span></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => setApprovalStep('manual_confirm')}
                    className="flex-1 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> I Have Transferred
                  </button>
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => { setManualFailureReason(''); setApprovalStep('manual_failed'); }}
                    className="flex-1 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" /> Transfer Failed
                  </button>
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => setApprovalStep('method')}
                    className="px-3.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 2a: confirm the transfer actually completed */}
            {approvalStep === 'manual_confirm' && (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Confirm Transfer Completed</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Confirm that you have actually completed a bank transfer of <strong>₦{Number(approvalTarget.amount).toLocaleString()}</strong> to {approvalTarget.bankName} ({approvalTarget.accountNumber}).
                  </p>
                  <p className="text-xs text-slate-500 mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    This will mark the withdrawal <strong>Successful</strong>, finalize the reserved balance deduction, and notify the user. Only confirm if the money has genuinely left your account.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => setApprovalStep('manual')}
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={runManualConfirm}
                    className="flex-1 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {approvalBusy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Confirm Transfer Completed'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2b: record the failure */}
            {approvalStep === 'manual_failed' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Transfer Failed</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Explain why the transfer could not be completed. This reason is saved to the withdrawal record and shared with the user.
                  </p>
                </div>
                <textarea
                  rows={4}
                  value={manualFailureReason}
                  onChange={(e) => setManualFailureReason(e.target.value)}
                  disabled={approvalBusy}
                  placeholder="e.g. Account name mismatch, bank network failure, invalid account number..."
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
                />
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  Marking as Failed releases the reserved amount back to the user's available sales balance so they can request again.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={approvalBusy}
                    onClick={() => setApprovalStep('manual')}
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={approvalBusy || !manualFailureReason.trim()}
                    onClick={runManualFailure}
                    className="flex-1 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {approvalBusy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Record Failure'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Withdrawal Approval Modal */}
      {bulkWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <CheckCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-extrabold text-slate-900">Approve All Pending Withdrawals</h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to approve all <strong>{withdrawals.filter(w => w.status === 'pending').length}</strong> pending withdrawal requests?
            </p>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <div><strong>Total Pending Payouts:</strong> {withdrawals.filter(w => w.status === 'pending').length} requests</div>
              <div><strong>Total Sum:</strong> ₦{withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + Number(w.amount || 0), 0).toLocaleString()}</div>
              <div className="text-[11px] text-emerald-700 pt-1">
                Each transfer will execute independently through Paystack. If an individual transfer fails, the amount remains reserved for that request (never lost) and can be safely retried later.
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() => setBulkWithdrawalModalOpen(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={async () => {
                  setBulkWithdrawalModalOpen(false);
                  await handleBulkApproveWithdrawals();
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  'Confirm & Payout All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Withdrawal Execution Summary Dialog */}
      {bulkSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Bulk Withdrawal Results</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkSummary(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-100">
                <div className="font-extrabold text-base text-slate-900">{bulkSummary.total}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                <div className="font-extrabold text-base text-emerald-600">{bulkSummary.successful}</div>
                <div className="text-[10px] font-bold uppercase">Success</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800">
                <div className="font-extrabold text-base text-rose-600">{bulkSummary.failed}</div>
                <div className="text-[10px] font-bold uppercase">Failed</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <div className="font-extrabold text-base text-amber-600">{bulkSummary.skipped}</div>
                <div className="text-[10px] font-bold uppercase">Skipped</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 bg-slate-50 text-xs">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase">Transaction Details</h4>
              {bulkSummary.details.length === 0 ? (
                <div className="text-slate-400 text-center py-4">No detailed items.</div>
              ) : (
                bulkSummary.details.map((item, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-600 truncate">{item.reference || item.requestId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'successful' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'skipped' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setBulkSummary(null)}
              className="w-full py-2.5 bg-cu-blue hover:bg-cu-blue/90 text-white rounded-xl text-xs font-bold shadow transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Central Ledger Status History Modal */}
      {selectedLedgerTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cu-blue" />
                <h3 className="text-base font-extrabold text-slate-900">Ledger Status History</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerTx(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-slate-900">{selectedLedgerTx.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">₦{Number(selectedLedgerTx.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current eBron Status:</span>
                <span className="font-bold uppercase text-cu-blue">{selectedLedgerTx.eBronStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paystack Status:</span>
                <span className="font-bold uppercase text-slate-700">{selectedLedgerTx.paystackStatus}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Chronological Status Transitions</h4>
              {(() => {
                let history: StatusHistoryItem[] = [];
                if (Array.isArray(selectedLedgerTx.statusHistory)) {
                  history = selectedLedgerTx.statusHistory;
                } else if (typeof selectedLedgerTx.statusHistory === 'string') {
                  try { history = JSON.parse(selectedLedgerTx.statusHistory); } catch (e) { history = []; }
                }

                if (history.length === 0) {
                  return <div className="text-slate-400 py-4 text-center">No transition history recorded for this transaction.</div>;
                }

                return (
                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-3 my-2">
                    {history.map((h, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cu-blue ring-4 ring-white" />
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase text-[11px] text-slate-900">{h.status || h.eBronStatus}</span>
                            <span className="text-[10px] text-slate-400">{h.timestamp ? new Date(h.timestamp).toLocaleString() : '-'}</span>
                          </div>
                          {(h.reason || h.details) && (
                            <div className="text-[11px] text-slate-600 mt-1">{h.reason || h.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => setSelectedLedgerTx(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
