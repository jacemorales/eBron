import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, X, Loader2 } from 'lucide-react';
import type { Order } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

const CANCELLATION_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Item taking too long to be delivered',
  'Seller unresponsive',
  'Other'
];

export const PendingPurchases: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  // Cancellation modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelStep, setCancelStep] = useState<'confirm' | 'form' | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelExplanation, setCancelExplanation] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const all = await api.getBuyerOrders(user.userId);
    setOrders(all.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'refunded'));
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const handleConfirm = async (orderId: string) => {
    if (!user || confirmingOrderId) return;
    setConfirmingOrderId(orderId);
    try {
      const res = await api.confirmOrder(orderId, 'buyer', user.userId);
      if (res.success) {
        onToast('success', res.message || 'Receipt confirmed!');
        await fetchOrders();
      } else {
        onToast('error', res.error || 'Failed to confirm receipt.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error confirming receipt.');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const openCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setCancelStep('confirm');
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelExplanation('');
  };

  const closeCancelModal = () => {
    setSelectedOrder(null);
    setCancelStep(null);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelExplanation('');
  };

  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmittingCancel(true);
    try {
      const res = await api.requestOrderCancellation(
        selectedOrder.orderId,
        'buyer',
        cancelReason,
        cancelExplanation.trim()
      );
      if (res.success) {
        onToast('success', 'Cancellation request submitted for admin review. Order is now Refund Pending Approval.');
        closeCancelModal();
        fetchOrders();
      } else {
        onToast('error', res.error || 'Failed to submit cancellation request.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error submitting cancellation.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
        <Clock className="w-6 h-6 text-amber-600" /> Pending Purchases
      </h1>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState title="No pending purchases" description="You have no purchases awaiting receipt." />
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isRefundPending = order.status === 'refund_pending_approval';

            return (
              <div key={order.orderId} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-3">
                  <img src={order.productImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{order.productName}</h3>
                      {order.quantity && order.quantity > 1 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                          Qty: {order.quantity}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">Seller: {order.sellerName} • Ref: {order.orderReference}</div>
                    <div className="text-xs font-bold text-cu-blue mt-1">₦{Number(order.amount).toLocaleString()}</div>

                    {isRefundPending && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Refund Pending Approval
                        {order.cancellationReason && (
                          <span className="text-amber-600 font-normal ml-1">({order.cancellationReason})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {!isRefundPending && !order.buyerConfirmedAt && (
                    <button
                      type="button"
                      disabled={confirmingOrderId === order.orderId}
                      onClick={() => handleConfirm(order.orderId)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                    >
                      {confirmingOrderId === order.orderId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Confirm I Received Item
                        </>
                      )}
                    </button>
                  )}

                  {!isRefundPending && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(order)}
                      className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {selectedOrder && cancelStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={closeCancelModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {cancelStep === 'confirm' ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cancel Purchase Order?</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Do you really want to request cancellation for <strong>{selectedOrder.productName}</strong> (₦{Number(selectedOrder.amount).toLocaleString()})?
                  </p>
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Note: Submitting this request sends it for admin approval. Once approved, the full amount will be credited back to your buyer wallet.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCancelModal}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Keep Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelStep('form')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                  >
                    Proceed with Cancellation
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitCancellation} className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cancellation Reason</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please tell us why you are cancelling this order.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                    <select
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    >
                      {CANCELLATION_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Additional Explanation <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={cancelExplanation}
                      onChange={e => setCancelExplanation(e.target.value)}
                      placeholder="Provide any details that will help admin review your request..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep('confirm')}
                    disabled={submittingCancel}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCancel}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {submittingCancel ? 'Submitting...' : 'Submit Cancellation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

