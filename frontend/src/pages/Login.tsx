import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogIn, AlertCircle, AlertTriangle, Send, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Login: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deactivation & Appeal states
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [deactivatedUserId, setDeactivatedUserId] = useState('');
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealExplanation, setAppealExplanation] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  useEffect(() => {
    if (searchParams.get('deactivated') === 'true') {
      setIsDeactivated(true);
      setErrorMsg('Your account has been deactivated by administration. You may submit an appeal below.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsDeactivated(false);
    setSubmitting(true);
    const res = await login(email, password);
    if (res.success) {
      onToast('success', 'Logged in successfully!');
      navigate(redirectPath);
    } else {
      if (res.isDeactivated) {
        setIsDeactivated(true);
        if (res.user?.userId) setDeactivatedUserId(res.user.userId);
        const err = res.error || 'Your account has been deactivated. You may submit an appeal for reactivation.';
        setErrorMsg(err);
        onToast('error', err);
      } else {
        const err = res.error || 'Login failed. Please verify credentials or network connection.';
        setErrorMsg(err);
        onToast('error', err);
      }
    }
    setSubmitting(false);
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !appealExplanation.trim()) {
      onToast('error', 'Please provide your explanation for the appeal.');
      return;
    }
    if (appealExplanation.trim().length < 10) {
      onToast('error', 'Explanation must be at least 10 characters long.');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const res = await api.submitAccountAppeal(
        deactivatedUserId || 'unknown',
        email.trim().toLowerCase(),
        appealExplanation.trim()
      );
      if (res.success) {
        setAppealSubmitted(true);
        onToast('success', 'Appeal submitted successfully for administrator review!');
      } else {
        onToast('error', res.error || 'Failed to submit appeal.');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Error submitting appeal.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cu-blue text-white flex items-center justify-center font-black text-xl shadow">
            eB
          </div>
          <h1 className="text-2xl font-black text-slate-900">Sign in to eBron</h1>
          <p className="text-xs text-slate-500">Covenant University Student Marketplace</p>
        </div>

        {errorMsg && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in ${
            isDeactivated ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-red-50 border border-red-200 text-red-900'
          }`}>
            {isDeactivated ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1">
              <div className="leading-relaxed">{errorMsg}</div>
              {isDeactivated && (
                <button
                  type="button"
                  onClick={() => { setAppealModalOpen(true); setAppealSubmitted(false); }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Appeal Account Deactivation
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">CU Email Address (@stu.cu.edu.ng)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="email@stu.cu.edu.ng"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-cu-blue"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-cu-blue"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-cu-gold hover:bg-cu-goldHover disabled:opacity-50 text-cu-blue font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4" /> {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t">
          Don't have an account?{' '}
          <Link to={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="text-cu-blue font-bold hover:underline">
            Register as a Student
          </Link>
        </div>
      </div>

      {/* Appeal Submission Modal */}
      {appealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setAppealModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {appealSubmitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Appeal Submitted</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your reactivation appeal has been submitted for administrator review. The administrative team will evaluate your explanation and update your status accordingly.
                </p>
                <button
                  type="button"
                  onClick={() => setAppealModalOpen(false)}
                  className="px-5 py-2.5 bg-cu-blue text-white rounded-xl text-xs font-bold hover:bg-cu-dark transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAppealSubmit} className="space-y-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Appeal Account Deactivation</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Please provide an explanation of why your account should be reactivated by the administration.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CU Email Address</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Explanation & Reason for Reactivation *
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={10}
                      value={appealExplanation}
                      onChange={e => setAppealExplanation(e.target.value)}
                      placeholder="Explain the context or reason why your account deactivation should be reviewed..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400">Minimum 10 characters</span>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAppealModalOpen(false)}
                    disabled={submittingAppeal}
                    className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAppeal}
                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
