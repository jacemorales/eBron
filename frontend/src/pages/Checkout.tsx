import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Edit2, CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import type { Product, Gender, Hall } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MALE_HALLS: Hall[] = ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'];
const FEMALE_HALLS: Hall[] = ['Mary', 'Lydia', 'Deborah'];

export const Checkout: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [hall, setHall] = useState<Hall>('Peter');
  const [room, setRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setFullName(user.fullName);
    setGender(user.gender);
    setHall(user.hallOfResidence);
    setRoom(user.roomNumber);
    if (productId) api.getProductById(productId).then(setProduct);
  }, [user, productId]);

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    if (g === 'Male' && !MALE_HALLS.includes(hall)) setHall('Peter');
    if (g === 'Female' && !FEMALE_HALLS.includes(hall)) setHall('Mary');
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile({ fullName, gender, hallOfResidence: hall, roomNumber: room });
    if (res.success) {
      setEditing(false);
      onToast('success', 'Delivery details updated and synced to account!');
    }
  };

  const handlePay = async () => {
    if (!user || !product) return;
    setSubmitting(true);
    const res = await api.createOrder(user, product.productId, {
      fullName,
      gender,
      hallOfResidence: hall,
      roomNumber: room
    });
    if (res.success) {
      onToast('success', 'Order created with TEST MODE payment!');
      navigate('/buy/pending');
    } else {
      onToast('error', res.error || 'Payment failed');
    }
    setSubmitting(false);
  };

  if (!product || !user) return <div className="text-center py-12 text-slate-400">Loading checkout...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Checkout & Order Confirmation</h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cu-blue" /> Delivery Location (CU Hall)
              </h2>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-cu-blue flex items-center gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveDelivery} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Gender</label>
                    <select value={gender} onChange={e => handleGenderChange(e.target.value as Gender)} className="w-full px-3 py-2 border rounded-lg bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Hall</label>
                    <select value={hall} onChange={e => setHall(e.target.value as Hall)} className="w-full px-3 py-2 border rounded-lg bg-white">
                      {(gender === 'Male' ? MALE_HALLS : FEMALE_HALLS).map(h => <option key={h} value={h}>{h} Hall</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Room Number</label>
                  <input type="text" value={room} onChange={e => setRoom(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="text-[11px] text-slate-500 bg-blue-50 p-2.5 rounded-lg">
                  Notice: Updating your delivery details here also updates your profile.
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-cu-blue text-white rounded-lg font-bold">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">{fullName}</div>
                <div className="text-slate-600">{gender} • {hall} Hall • Room {room}</div>
                <div className="text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Delivery verified
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <h2 className="font-bold text-sm text-slate-800">Order Summary</h2>
          <div className="flex gap-3">
            <img src={product.primaryImageUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
            <div className="text-xs">
              <div className="font-bold text-slate-900">{product.name}</div>
              <div className="text-slate-500">{product.sellerName}</div>
              <div className="font-black text-cu-blue text-sm mt-1">₦{Number(product.price).toLocaleString()}</div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-cu-blue flex justify-between items-center text-xs">
            <span className="font-bold">Test Mode Escrow Payment</span>
            <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-[10px]">TEST MODE</span>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handlePay}
            className="w-full py-3 bg-cu-gold hover:bg-cu-goldHover text-cu-blue font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1"
          >
            Confirm & Pay ₦{Number(product.price).toLocaleString()} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
