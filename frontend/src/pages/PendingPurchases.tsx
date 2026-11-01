import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import type { Order } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

export const PendingPurchases: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    const all = await api.getBuyerOrders(user.userId);
    setOrders(all.filter(o => o.status !== 'completed' && o.status !== 'cancelled'));
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const handleConfirm = async (orderId: string) => {
    if (!user) return;
    const res = await api.confirmOrder(orderId, 'buyer', user.userId);
    if (res.success) {
      onToast('success', res.message || 'Receipt confirmed!');
      fetchOrders();
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
          {orders.map(order => (
            <div key={order.orderId} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-3">
                <img src={order.productImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{order.productName}</h3>
                  <div className="text-xs text-slate-500">Seller: {order.sellerName} • Ref: {order.orderReference}</div>
                  <div className="text-xs font-bold text-cu-blue mt-1">₦{Number(order.amount).toLocaleString()}</div>
                </div>
              </div>

              {!order.buyerConfirmedAt && (
                <button
                  type="button"
                  onClick={() => handleConfirm(order.orderId)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm I Received Item
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
