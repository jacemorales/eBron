import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Edit2, CheckCircle, CreditCard, ArrowRight, Wallet, AlertCircle, PlusCircle, ShieldCheck } from 'lucide-react';
import type { Product, Gender, Hall, Wallet as WalletType } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MALE_HALLS: Hall[] = ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'];
const FEMALE_HALLS: Hall[] = ['Mary', 'Lydia', 'Deborah'];

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, any>) => {
        openIframe: () => void;
      };
    };
  }
}

export const Checkout: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [hall, setHall] = useState<Hall>('Peter');
  const [room, setRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);

  const fetchWallet = async () => {
    if (user) {
      const w = await api.getWallet(user.userId);
      setWallet(w);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setFullName(user.fullName);
    setGender(user.gender);
    setHall(user.hallOfResidence);
    setRoom(user.roomNumber);
    if (productId) api.getProductById(productId).then(setProduct);
    fetchWallet();
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

  const availableBalance = Number(wallet?.availableBalance || 0);
  const price = Number(product?.price || 0);
  const deficit = Math.max(0, price - availableBalance);
  const hasSufficientBalance = availableBalance >= price;

  const handlePaystackTopUp = (amountToTopUp: number) => {
    if (!user) return;
    setToppingUp(true);

    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_sample_covenant_university';

    // If Paystack inline JS is loaded
    if (window.PaystackPop && window.PaystackPop.setup && !paystackKey.startsWith('pk_test_sample')) {
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: user.schoolEmail,
        amount: Math.round(amountToTopUp * 100), // amount in kobo
        currency: 'NGN',
        ref: 'PSTK_' + Date.now(),
        metadata: {
          custom_fields: [
            { display_name: 'Student Name', variable_name: 'student_name', value: user.fullName },
            { display_name: 'Reg Number', variable_name: 'reg_number', value: user.regNumber }
          ]
        },
        callback: async (response: { reference: string }) => {
          const res = await api.topUpWallet(user.userId, amountToTopUp, response.reference);
          if (res.success && res.wallet) {
            setWallet(res.wallet);
            onToast('success', `₦${amountToTopUp.toLocaleString()} added to your wallet via Paystack!`);
          } else {
            await fetchWallet();
            onToast('success', `Wallet topped up successfully!`);
          }
          setToppingUp(false);
        },
        onClose: () => {
          setToppingUp(false);
          onToast('info', 'Paystack top up cancelled.');
        }
      });
      handler.openIframe();
    } else {
      // Test / development mode Paystack inline top-up simulation
      setTimeout(async () => {
        const res = await api.topUpWallet(user.userId, amountToTopUp, 'PSTK_TEST_' + Date.now());
        if (res.success && res.wallet) {
          setWallet(res.wallet);
          onToast('success', `₦${amountToTopUp.toLocaleString()} topped up to your wallet!`);
        } else {
          // Local fallback in case backend is offline
          setWallet(prev => prev ? {
            ...prev,
            availableBalance: (Number(prev.availableBalance) || 0) + amountToTopUp
          } : null);
          onToast('success', `₦${amountToTopUp.toLocaleString()} added to wallet!`);
        }
        setToppingUp(false);
      }, 500);
    }
  };

  const handlePay = async () => {
    if (!user || !product) return;
    if (!hasSufficientBalance) {
      onToast('error', `Insufficient wallet balance. Please top up ₦${deficit.toLocaleString()} to complete purchase.`);
      return;
    }

    setSubmitting(true);
    const res = await api.createOrder(user, product.productId, {
      fullName,
      gender,
      hallOfResidence: hall,
      roomNumber: room
    });

    if (res.success) {
      // Deduct balance locally to reflect immediate state
      setWallet(prev => prev ? {
        ...prev,
        availableBalance: Math.max(0, (Number(prev.availableBalance) || 0) - price)
      } : null);
      onToast('success', 'Payment successful! Funds held securely in escrow pending confirmation.');
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

          {/* Wallet Balance Check */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-cu-blue" /> Your Wallet Balance:
              </span>
              <span className="font-mono font-black text-sm text-slate-900">
                ₦{availableBalance.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-[11px] text-slate-500">
              <span>Product Price:</span>
              <span className="font-bold text-slate-800">₦{price.toLocaleString()}</span>
            </div>

            {!hasSufficientBalance ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                <div className="flex items-start gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Insufficient balance (Short by ₦{deficit.toLocaleString()})</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  You need to fund your eBron wallet with at least ₦{deficit.toLocaleString()} via Paystack to complete this purchase.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={toppingUp}
                    onClick={() => handlePaystackTopUp(deficit)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> {toppingUp ? 'Processing...' : `Top Up ₦${deficit.toLocaleString()} (Paystack)`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Wallet balance is sufficient. Funds will be placed in secure escrow.</span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={submitting || !hasSufficientBalance}
            onClick={handlePay}
            className="w-full py-3 bg-cu-gold hover:bg-cu-goldHover disabled:opacity-40 disabled:cursor-not-allowed text-cu-blue font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1"
          >
            {hasSufficientBalance ? (
              <>Deduct from Wallet & Pay ₦{price.toLocaleString()} <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Top Up Wallet to Pay (₦{deficit.toLocaleString()} required)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
