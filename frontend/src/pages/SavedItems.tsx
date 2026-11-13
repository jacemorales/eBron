import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import type { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/EmptyState';

export const SavedItems: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.getSavedItems(user.userId).then(p => { setProducts(p); setLoading(false); });
    }
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
        <Bookmark className="w-6 h-6 text-cu-gold fill-cu-gold" />
        <span>Saved Items</span>
      </h1>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No saved items" description="You have not saved any items yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => (
            <ProductCard key={p.productId} product={p} onSavedChange={(id, s) => { if (!s) setProducts(prev => prev.filter(x => x.productId !== id)); }} onToast={onToast} />
          ))}
        </div>
      )}
    </div>
  );
};
