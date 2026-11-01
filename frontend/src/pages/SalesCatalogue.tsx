import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, PlusCircle, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

export const SalesCatalogue: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user) return;
    const all = await api.getProducts({ sellerId: user.userId, includeDeleted: true });
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const toggleAvail = async (id: string) => {
    if (!user) return;
    await api.toggleProductAvailability(user.userId, id);
    fetchItems();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-cu-blue" /> Sales Catalogue
        </h1>
        <button onClick={() => navigate('/sell/add')} className="px-4 py-2 bg-cu-gold text-cu-blue rounded-xl font-bold text-xs flex items-center gap-1">
          <PlusCircle className="w-4 h-4" /> Add Item
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading catalogue...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No items in catalogue" description="Upload items you want to sell." actionText="Add Item" onAction={() => navigate('/sell/add')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.productId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-2">
              <img src={p.primaryImageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-cu-blue">₦{Number(p.price).toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.availability === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {p.availability}
                </span>
              </div>
              <h3 className="font-bold text-sm truncate">{p.name}</h3>
              <div className="pt-2 border-t flex justify-between text-xs">
                <button type="button" onClick={() => toggleAvail(p.productId)} className="text-slate-600 font-semibold flex items-center gap-1">
                  {p.availability === 'available' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-emerald-600" />} Toggle Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
