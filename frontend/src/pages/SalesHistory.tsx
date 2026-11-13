import React, { useState, useEffect } from 'react';
import { History, CheckCircle2 } from 'lucide-react';
import type { Order } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

export const SalesHistory: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.getSellerOrders(user.userId).then(all => {
        setOrders(all.filter(o => o.status === 'completed'));
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
        <History className="w-6 h-6 text-emerald-600" /> Sales History
      </h1>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState title="No completed sales" description="Completed sales with released payouts will show here." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-600 border-b">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Amount Received</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orders.map(o => (
                <tr key={o.orderId}>
                  <td className="p-3 font-bold">{o.productName} ({o.orderReference})</td>
                  <td className="p-3">{o.buyerName}</td>
                  <td className="p-3 font-bold text-emerald-600">₦{Number(o.amount).toLocaleString()}</td>
                  <td className="p-3 text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Released to Wallet
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
