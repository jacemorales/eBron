import React from 'react';
import { BookOpen, ShoppingBag, Store, ShieldCheck } from 'lucide-react';

export const Guidelines: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">eBron Guidelines & Help Center</h1>
        <p className="text-slate-500 text-sm">Covenant University Student Marketplace Policy & Escrow Guide</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-cu-blue">
            <ShoppingBag className="w-5 h-5 text-cu-gold" /> Buyer Guidelines
          </h2>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li>Search and filter verified items from Covenant University students.</li>
            <li>Initiate chats with sellers to inspect or negotiate prior to payment.</li>
            <li>Confirm your hall and room number during checkout.</li>
            <li>Inspect the item in person before confirming receipt in Pending Purchases.</li>
            <li>Report any issue before confirming receipt to pause release of funds.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-cu-blue">
            <Store className="w-5 h-5 text-cu-gold" /> Seller Guidelines
          </h2>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li>Upload real photos of your textbooks, devices, and hostel appliances.</li>
            <li>Be responsive to chat requests from buyers.</li>
            <li>Deliver the item to the buyer's hall and confirm handover in Pending Sales.</li>
            <li>Funds become Available for withdrawal immediately once the buyer confirms receipt.</li>
            <li>Submit bank withdrawal requests anytime from your Wallet.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
