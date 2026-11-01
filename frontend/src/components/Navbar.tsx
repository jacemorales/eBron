import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, BookOpen, ShieldAlert, LogOut, ChevronDown, Menu, X, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const buyRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (buyRef.current && !buyRef.current.contains(e.target as Node)) setBuyOpen(false);
      if (sellRef.current && !sellRef.current.contains(e.target as Node)) setSellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-cu-blue text-white shadow-md">
      <div className="bg-cu-dark px-4 py-1.5 text-xs text-slate-300 flex justify-between items-center border-b border-blue-900/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Official Covenant University Student Marketplace</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/guidelines" className="hover:text-cu-gold flex items-center gap-1 transition">
            <BookOpen className="w-3.5 h-3.5" /> Guidelines & Safety
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-cu-gold hover:underline flex items-center gap-1 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" /> Admin Portal
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-cu-gold flex items-center justify-center text-cu-blue font-black text-xl shadow-lg">
                eB
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-white">eBron</span>
                <span className="hidden sm:inline-block ml-1.5 text-xs bg-cu-gold/20 text-cu-gold px-1.5 py-0.5 rounded font-medium border border-cu-gold/30">
                  CU Marketplace
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <div className="relative" ref={buyRef}>
                <button
                  type="button"
                  onClick={() => { setBuyOpen(!buyOpen); setSellOpen(false); }}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <ShoppingBag className="w-4 h-4 text-cu-gold" />
                  <span>Buy Products</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {buyOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-2xl text-slate-800 py-2 z-50">
                    <Link to="/" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Browse Marketplace</Link>
                    <Link to="/buy/saved" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Saved Items</Link>
                    <Link to="/messages" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Messages</Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <Link to="/buy/pending" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Pending Purchases</Link>
                    <Link to="/buy/history" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Purchase History</Link>
                  </div>
                )}
              </div>

              <div className="relative" ref={sellRef}>
                <button
                  type="button"
                  onClick={() => { setSellOpen(!sellOpen); setBuyOpen(false); }}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <Store className="w-4 h-4 text-cu-gold" />
                  <span>Sell Products</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {sellOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-2xl text-slate-800 py-2 z-50">
                    <Link to="/sell/add" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-bold text-cu-blue">Add Item</Link>
                    <Link to="/sell/catalogue" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Sales Catalogue</Link>
                    <Link to="/messages" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Chat Requests</Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <Link to="/sell/pending" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Pending Sales</Link>
                    <Link to="/sell/history" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Sales History</Link>
                    <Link to="/sell/wallet" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-bold text-emerald-700">Balance & Wallet</Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-2 bg-cu-dark px-3 py-1.5 rounded-xl border border-blue-800/60"
                >
                  <div className="w-7 h-7 rounded-full bg-cu-gold text-cu-blue font-bold flex items-center justify-center text-xs">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white truncate max-w-[120px]">{user.fullName}</div>
                    <div className="text-[10px] text-cu-gold">{user.hallOfResidence} Hall</div>
                  </div>
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl text-slate-800 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 text-xs">
                      <div className="font-bold text-cu-blue">{user.fullName}</div>
                      <div className="text-slate-500">{user.schoolEmail}</div>
                      <div className="text-slate-400">Room {user.roomNumber}</div>
                    </div>
                    <Link to="/profile" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100">My Profile</Link>
                    <Link to="/sell/wallet" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 text-emerald-700 font-medium">My Wallet</Link>
                    <button
                      type="button"
                      onClick={() => { setUserOpen(false); logout(); navigate('/login'); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm text-slate-200 hover:text-white font-medium">Log in</Link>
                <Link to="/register" className="px-4 py-2 text-sm bg-cu-gold text-cu-blue font-bold rounded-xl shadow-md">Register</Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-200">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-cu-dark border-t border-blue-900/60 p-4 space-y-3 text-sm">
          {user ? (
            <div className="text-xs text-cu-gold pb-2 border-b border-blue-900/40">
              {user.fullName} ({user.hallOfResidence} Hall, Room {user.roomNumber})
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-blue-900/40">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="py-2 text-center bg-blue-900/60 rounded">Log In</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="py-2 text-center bg-cu-gold text-cu-blue font-bold rounded">Register</Link>
            </div>
          )}
          <Link to="/" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Browse Marketplace</Link>
          <Link to="/buy/saved" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Saved Items</Link>
          <Link to="/buy/pending" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Pending Purchases</Link>
          <Link to="/sell/add" onClick={() => setMobileOpen(false)} className="block py-1 text-cu-gold font-bold">Add Item for Sale</Link>
          <Link to="/sell/catalogue" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Sales Catalogue</Link>
          <Link to="/sell/pending" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Pending Sales</Link>
          <Link to="/sell/wallet" onClick={() => setMobileOpen(false)} className="block py-1 text-emerald-300 font-bold">Wallet & Balance</Link>
          <Link to="/messages" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Messages</Link>
          <Link to="/guidelines" onClick={() => setMobileOpen(false)} className="block py-1 hover:text-cu-gold">Guidelines</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-1 text-amber-300 font-bold">Admin Portal</Link>
          )}
          {user && (
            <button type="button" onClick={() => { setMobileOpen(false); logout(); navigate('/login'); }} className="block py-1 text-red-400">Sign Out</button>
          )}
        </div>
      )}
    </header>
  );
};
