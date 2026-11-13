import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, MessageSquare, Eye, Tag } from 'lucide-react';
import type { Product } from '../types';
import { ActionMenu } from './ActionMenu';
import type { ActionMenuItem } from './ActionMenu';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProductCard: React.FC<{
  product: Product;
  onSavedChange?: (productId: string, isSaved: boolean) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}> = ({ product, onSavedChange, onToast }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      api.isItemSaved(user.userId, product.productId).then(setIsSaved);
    }
  }, [user, product.productId]);

  const handleToggleSave = async () => {
    // Protected action: unauthenticated users redirect to login
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setSaving(true);
    const res = await api.toggleSaveItem(user.userId, product.productId);
    setIsSaved(res.isSaved);
    setSaving(false);
    if (onSavedChange) onSavedChange(product.productId, res.isSaved);
    if (onToast) onToast('success', res.isSaved ? 'Item saved to your list' : 'Item removed from saved list');
  };

  const handleChat = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (user.userId === product.sellerId) {
      if (onToast) onToast('info', 'This is your own listing.');
      return;
    }
    const res = await api.startOrGetConversation(user, product.productId);
    if (res.success && res.conversation) {
      navigate(`/messages?conv=${res.conversation.conversationId}`);
    } else if (onToast && res.error) {
      onToast('error', res.error);
    }
  };

  const menuItems: ActionMenuItem[] = [
    {
      label: 'View Item',
      icon: <Eye className="w-4 h-4 text-cu-blue" />,
      onClick: () => navigate(`/product/${product.productId}`)
    },
    {
      label: isSaved ? 'Remove from Saved' : 'Save Item',
      icon: <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-cu-gold text-cu-gold' : 'text-slate-500'}`} />,
      onClick: handleToggleSave
    },
    {
      label: 'Chat with Seller',
      icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
      onClick: handleChat
    }
  ];

  return (
    <div
      onClick={() => navigate(`/product/${product.productId}`)}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          <img
            src={product.primaryImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />

          <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
            {product.condition}
          </span>

          {/* Three-dot contextual menu with Save, View, and Chat */}
          <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm hover:shadow transition">
            <ActionMenu items={menuItems} ariaLabel={`Actions for ${product.name}`} />
          </div>

          {product.availability !== 'available' && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-red-600 text-white font-black text-xs uppercase px-3 py-1 rounded-full shadow">
                {product.availability}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <Tag className="w-3 h-3 text-cu-gold" />
            <span className="truncate">{product.category}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-cu-blue transition">{product.name}</h3>
          <div className="text-base font-black text-cu-blue">₦{Number(product.price).toLocaleString()}</div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{product.sellerName || 'CU Student'}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggleSave(); }}
            className="text-xs font-semibold text-cu-blue hover:text-cu-gold flex items-center gap-1"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-cu-gold text-cu-gold' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
