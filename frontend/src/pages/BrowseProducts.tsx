import React, { useState, useEffect } from 'react';
import { Search, Store } from 'lucide-react';
import type { Product, ProductCategory } from '../types';
import { api } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/EmptyState';

const CATEGORIES: ('All' | ProductCategory)[] = [
  'All',
  'Textbooks & Academic',
  'Electronics & Gadgets',
  'Fashion & Apparel',
  'Hostel & Room Essentials',
  'Snacks & Food Provisions',
  'Health & Personal Care',
  'Sports & Fitness',
  'Other Services'
];

export const BrowseProducts: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | ProductCategory>('All');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        category: category === 'All' ? undefined : category,
        search: search.trim() || undefined
      });
      setProducts(data);
    } catch (e) {
      console.error(e);
      onToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Marketplace Banner (No "escrow" word, updated transaction confirmation message) */}
      <div className="bg-gradient-to-r from-cu-blue via-cu-dark to-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 bg-cu-gold/20 text-cu-gold border border-cu-gold/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Covenant University Marketplace
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          eBron Student Marketplace
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          Buy and sell with confidence through our secure, two-step transaction confirmation system.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search textbooks, devices, hostel items..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-cu-blue"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={fetchProducts}
          className="px-5 py-2 bg-cu-blue hover:bg-cu-dark text-white rounded-xl text-sm font-bold shadow-sm transition"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading products...</div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="There are currently no items listed matching your selection."
          icon={<Store className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => <ProductCard key={p.productId} product={p} onToast={onToast} />)}
        </div>
      )}
    </div>
  );
};
