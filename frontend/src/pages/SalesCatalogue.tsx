import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, PlusCircle, Edit2, ToggleLeft, ToggleRight, X, Save, Tag } from 'lucide-react';
import type { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';

export const SalesCatalogue: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStockNumber, setEditStockNumber] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditPrice(String(p.price));
    setEditDesc(p.description);
    setEditStockNumber(p.stockNumber || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingProduct) return;
    setSavingEdit(true);
    const res = await api.updateProduct(user.userId, editingProduct.productId, {
      price: Number(editPrice),
      description: editDesc,
      stockNumber: editStockNumber.trim()
    });
    if (res.success) {
      onToast('success', 'Product updated successfully!');
      setEditingProduct(null);
      fetchItems();
    } else {
      onToast('error', res.error || 'Failed to update product.');
    }
    setSavingEdit(false);
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
              {p.stockNumber && (
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cu-blue" /> Stock #: {p.stockNumber}
                </div>
              )}
              <div className="pt-2 border-t flex justify-between text-xs">
                <button type="button" onClick={() => openEditModal(p)} className="text-cu-blue font-semibold flex items-center gap-1 hover:underline">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Details
                </button>
                <button type="button" onClick={() => toggleAvail(p.productId)} className="text-slate-600 font-semibold flex items-center gap-1">
                  {p.availability === 'available' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-emerald-600" />} Toggle Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 text-xs animate-in fade-in">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-extrabold text-sm text-slate-900">Edit Product Listing</h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Title</label>
              <input type="text" value={editingProduct.name} disabled className="w-full px-3 py-2 border rounded-xl bg-slate-100 text-slate-500 font-medium" />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Price (₦)</label>
              <input
                type="number"
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Stock Number (Optional)</label>
              <input
                type="text"
                value={editStockNumber}
                onChange={e => setEditStockNumber(e.target.value)}
                placeholder="e.g. STK-1004"
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Optional seller stock reference.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 bg-cu-blue hover:bg-cu-dark text-white rounded-xl font-bold flex items-center gap-1 shadow"
              >
                <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
