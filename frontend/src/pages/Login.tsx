import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const res = await login(email, password);
    if (res.success) {
      onToast('success', 'Logged in successfully!');
      navigate(redirectPath);
    } else {
      const err = res.error || 'Login failed. Please verify credentials or network connection.';
      setErrorMsg(err);
      onToast('error', err);
    }
    setSubmitting(false);
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
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
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
    </div>
  );
};
