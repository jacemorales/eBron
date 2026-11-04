import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Star, X } from 'lucide-react';
import type { ProductCategory, ProductCondition } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES: ProductCategory[] = [
  'Textbooks & Academic',
  'Electronics & Gadgets',
  'Fashion & Apparel',
  'Hostel & Room Essentials',
  'Snacks & Food Provisions',
  'Health & Personal Care',
  'Sports & Fitness',
  'Other Services'
];

export const AddItem: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Textbooks & Academic');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('Fairly Used');
  const [stockNumber, setStockNumber] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setImages(prev => [...prev, event.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (images.length === 0) { onToast('error', 'Upload at least one image'); return; }

    setSubmitting(true);
    const res = await api.createProduct(user, {
      name,
      description,
      category,
      price: Number(price),
      condition,
      stockNumber: stockNumber.trim() || undefined,
      images,
      primaryIndex
    });
    if (res.success) {
      onToast('success', 'Product listed successfully!');
      navigate('/sell/catalogue');
    } else {
      onToast('error', res.error || 'Failed to list');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">List an Item for Sale</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-xs">
        <div>
          <label className="block font-bold mb-1">Product Title</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Calculus Textbook" className="w-full px-3 py-2 border rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="New">New</option>
              <option value="Fairly Used">Fairly Used</option>
              <option value="Used">Used</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Price (₦)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="5000" className="w-full px-3 py-2 border rounded-xl font-bold" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-bold">Stock Number (Optional)</label>
            <span className="text-[10px] text-slate-400 font-semibold">Optional reference</span>
          </div>
          <input
            type="text"
            value={stockNumber}
            onChange={e => setStockNumber(e.target.value)}
            placeholder="e.g. STK-1004 or SKU-A02"
            className="w-full px-3 py-2 border rounded-xl font-mono text-xs focus:border-cu-blue"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Enter a unique inventory or stock reference code if you use one. Leave blank if not applicable.
          </p>
        </div>

        <div>
          <label className="block font-bold mb-1">Description</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Condition, edition, accessories..." className="w-full px-3 py-2 border rounded-xl" />
        </div>

        <div>
          <label className="block font-bold mb-1">Images ({images.length} added)</label>
          <div className="border border-dashed p-4 rounded-xl text-center">
            <UploadCloud className="w-6 h-6 mx-auto mb-1 text-slate-400" />
            <label className="text-cu-blue font-bold cursor-pointer">
              Choose files
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <div className="mt-2 flex gap-2 max-w-sm mx-auto">
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Or paste image URL" className="flex-1 px-2 py-1 border rounded text-[11px]" />
              <button type="button" onClick={() => { if (urlInput.trim()) { setImages(prev => [...prev, urlInput.trim()]); setUrlInput(''); } }} className="px-2 py-1 bg-slate-200 rounded font-bold">Add</button>
            </div>
          </div>

          {images.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((img, i) => (
                <div key={i} className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${primaryIndex === i ? 'border-cu-gold' : 'border-slate-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPrimaryIndex(i)} className="absolute top-0.5 left-0.5 p-0.5 bg-black/60 text-white rounded">
                    <Star className="w-3 h-3 fill-cu-gold text-cu-gold" />
                  </button>
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} className="w-full py-3 bg-cu-gold hover:bg-cu-goldHover text-cu-blue font-black rounded-xl text-xs shadow-md">
          {submitting ? 'Listing...' : 'Publish Item to CU Marketplace'}
        </button>
      </form>
    </div>
  );
};
