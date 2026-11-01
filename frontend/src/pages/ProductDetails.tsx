import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageSquare, ShoppingBag, ChevronLeft, Tag } from 'lucide-react';
import type { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProductDetails: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getProductById(id).then(p => {
      setProduct(p);
      if (p) setSelectedImage(p.primaryImageUrl || p.images[0] || '');
      setLoading(false);
    });
  }, [id]);

  const handleChat = async () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    if (user.userId === product.sellerId) { onToast('info', 'This is your own listing.'); return; }
    const res = await api.startOrGetConversation(user, product.productId);
    if (res.success && res.conversation) navigate(`/messages?conv=${res.conversation.conversationId}`);
  };

  const handleBuy = () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    if (user.userId === product.sellerId) { onToast('error', 'Cannot buy your own product.'); return; }
    navigate(`/checkout/${product.productId}`);
  };

  if (loading || !product) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-cu-blue">
        <ChevronLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
            <img src={selectedImage} alt={product.name} className="w-full h-full object-contain" />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(img)} className={`w-16 h-16 rounded-xl border-2 overflow-hidden ${selectedImage === img ? 'border-cu-blue' : 'border-slate-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-cu-blue font-bold px-2 py-0.5 rounded">{product.category}</span>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">Condition: {product.condition}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{product.name}</h1>
            <div className="text-2xl font-black text-cu-blue">₦{Number(product.price).toLocaleString()}</div>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              Seller: <strong>{product.sellerName || 'CU Student'}</strong> ({product.sellerEmail})
            </div>
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{product.description}</div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleChat}
              className="flex-1 py-3 border-2 border-cu-blue text-cu-blue rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Chat with Seller
            </button>
            <button
              type="button"
              onClick={handleBuy}
              disabled={product.availability !== 'available'}
              className="flex-1 py-3 bg-cu-gold hover:bg-cu-goldHover disabled:opacity-50 text-cu-blue rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <ShoppingBag className="w-4 h-4" /> Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
