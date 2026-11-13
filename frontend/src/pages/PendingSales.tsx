import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import type { Order } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

export const PendingSales: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    if (!user) return;
    const all = await api.getSellerOrders(user.userId);
    setOrders(all.filter(o => o.status !== 'completed' && o.status !== 'cancelled'));
    setLoading(false);
  };

  useEffect(() => { fetchSales(); }, [user]);

  const handleHandover = async (id: string) => {
    if (!user) return;
    const res = await api.confirmOrder(id, 'seller', user.userId);
    if (res.success) {
      onToast('success', res.message || 'Handover confirmed!');
      fetchSales();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
        <Clock className="w-6 h-6 text-amber-600" /> Pending Sales (Deliveries)
      </h1>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState title="No pending sales" description="You have no items waiting to be delivered." />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.orderId} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-3">
                <img src={order.productImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{order.productName}</h3>
                  <div className="text-xs text-slate-500">Buyer: <strong>{order.buyerName}</strong> • Ref: {order.orderReference}</div>
                  <div className="text-xs text-cu-blue font-bold">Deliver to: {order.deliveryHall} Hall, Room {order.deliveryRoom}</div>
                </div>
              </div>

              {!order.sellerConfirmedAt && (
                <button
                  type="button"
                  onClick={() => handleHandover(order.orderId)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm Handover to Buyer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
