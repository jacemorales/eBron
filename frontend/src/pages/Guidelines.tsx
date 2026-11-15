import React, { useState } from 'react';
import { ShoppingBag, Store, ShieldCheck, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { FeedbackType } from '../types';

const FEEDBACK_TYPES: FeedbackType[] = [
  'Issue/Problem',
  'Suggestion',
  'Positive Feedback',
  'General Feedback'
];

export const Guidelines: React.FC = () => {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!user) {
      setErrorMsg('You must be signed in to submit feedback.');
      return;
    }
    if (!type) {
      setErrorMsg('Please select a feedback type.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please enter your feedback message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitFeedback(user, type, subject.trim(), message.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'Thank you! Your feedback has been submitted successfully.');
        setType('');
        setSubject('');
        setMessage('');
      } else {
        setErrorMsg(res.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Feedback & Safety Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold flex items-center gap-2 text-cu-blue">
            <MessageSquare className="w-5 h-5 text-cu-gold" /> Share Your Feedback
          </h2>
          <p className="text-xs text-slate-500">
            Help us improve eBron. Report a problem, suggest an improvement, or share a positive experience.
            Your feedback is private and only visible to the eBron administration team.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <span>Your submission is securely stored and never shared with other students.</span>
        </div>

        {!user ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Please sign in to submit feedback.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Feedback Type *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as FeedbackType)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cu-blue font-medium disabled:bg-slate-100"
              >
                <option value="">-- Select a feedback type --</option>
                {FEEDBACK_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={submitting}
                maxLength={120}
                placeholder="A short title describing your feedback"
                className="w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cu-blue disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-700">Message *</label>
              <textarea
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={submitting}
                required
                placeholder="Tell us about your experience, the issue you faced, or your suggestion..."
                className="w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cu-blue disabled:bg-slate-100 resize-y"
              />
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" /> {errorMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-cu-blue hover:bg-cu-blue/90 text-white rounded-xl font-black shadow transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
