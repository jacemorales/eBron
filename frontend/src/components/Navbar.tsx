import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  BookOpen,
  ShieldAlert,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { api } from '../services/api';

const MobileSectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-black uppercase tracking-wider text-cu-gold px-3 pt-1 pb-0.5">{children}</div>
);

const ACCENT_CLASSES: Record<string, string> = {
  emerald: 'text-emerald-300 font-bold',
  purple: 'text-purple-300 font-bold',
  gold: 'text-cu-gold font-bold',
  amber: 'text-amber-300 font-bold'
};

const MobileNavLink: React.FC<{
  to: string;
  onClick: () => void;
  badge?: number;
  accent?: 'emerald' | 'purple' | 'gold' | 'amber';
  children: React.ReactNode;
}> = ({ to, onClick, badge, accent, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-slate-100 hover:bg-blue-900/50 transition-colors ${accent ? ACCENT_CLASSES[accent] : 'font-medium'}`}
  >
    <span>{children}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">{badge}</span>
    )}
  </Link>
);

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingPurchases, setPendingPurchases] = useState(0);
  const [pendingSales, setPendingSales] = useState(0);

  const buyRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const fetchCounts = async () => {
    if (!user) {
      setUnreadMessages(0);
      setPendingPurchases(0);
      setPendingSales(0);
      return;
    }
    try {
      const [unread, pending] = await Promise.all([
        api.getUnreadCounts(user.userId),
        api.getPendingCounts(user.userId)
      ]);
      setUnreadMessages(unread.unreadMessages);
      setPendingPurchases(pending.pendingPurchases);
      setPendingSales(pending.pendingSales);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Refresh the badges whenever the user navigates (e.g. after confirming an order).
  useEffect(() => {
    fetchCounts();
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (buyRef.current && !buyRef.current.contains(e.target as Node)) setBuyOpen(false);
      if (sellRef.current && !sellRef.current.contains(e.target as Node)) setSellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-cu-blue text-white shadow-md">
      {/* Micro header */}
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

      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-black text-2xl tracking-tight text-white flex items-center">
                <span className="text-cu-gold font-serif italic text-3xl mr-0.5 group-hover:scale-105 transition-transform">e</span>
                <span>Bron</span>
              </span>
              <span className="hidden sm:inline-block ml-1 text-[11px] bg-cu-gold/20 text-cu-gold px-2 py-0.5 rounded-full font-bold border border-cu-gold/40">
                CU Marketplace
              </span>
            </Link>

            {/* Authenticated Navigation Items (HIDDEN from visitors when not signed in) */}
            {user && (
              <nav className="hidden md:flex items-center gap-2">
                {/* Buy Products Menu */}
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
                      <Link to="/buy/wallets" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-black text-emerald-700 flex items-center justify-between">
                        <span>Wallets (Spending)</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </Link>
                      <div className="border-t border-slate-100 my-1"></div>
                      <Link to="/buy/pending" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium flex items-center justify-between">
                        <span>Pending Purchases</span>
                        {pendingPurchases > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">
                            {pendingPurchases}
                          </span>
                        )}
                      </Link>
                      <Link to="/buy/history" onClick={() => setBuyOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Purchase History</Link>
                    </div>
                  )}
                </div>

                {/* Sell Products Menu */}
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
                      <div className="border-t border-slate-100 my-1"></div>
                      <Link to="/sell/pending" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium flex items-center justify-between">
                        <span>Pending Sales</span>
                        {pendingSales > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">
                            {pendingSales}
                          </span>
                        )}
                      </Link>
                      <Link to="/sell/history" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-medium">Sales History</Link>
                      <Link to="/sell/sales-balance" onClick={() => setSellOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100 font-black text-purple-700">Sales Balance</Link>
                    </div>
                  )}
                </div>

                {/* Quick link to Messages with Unread Counter */}
                <Link
                  to="/messages"
                  className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-cu-dark transition"
                >
                  <MessageSquare className="w-4 h-4 text-cu-gold" />
                  <span>Messages</span>
                  {unreadMessages > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </nav>
            )}
          </div>

          {/* User / Authentication Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-2.5 bg-cu-dark px-3.5 py-1.5 rounded-xl border border-blue-800/60 hover:bg-cu-dark/80 transition"
                >
                  <div className="w-7 h-7 rounded-full bg-cu-gold text-cu-blue font-bold flex items-center justify-center text-xs">
                    {user.fullName.charAt(0)}
                  </div>
                  {/* Navbar display: Full Name and Registration Number only (NO hall) */}
                  <div className="text-left">
                    <div className="text-xs font-bold text-white truncate max-w-[140px]">{user.fullName}</div>
                    <div className="text-[10px] text-cu-gold font-mono">{user.regNumber}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                </button>

                {userOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-2xl text-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                    {/* Dropdown profile info: Full Name, School Email, Matriculation Number only (NO hall or room) */}
                    <div className="px-4 py-2.5 border-b border-slate-100 text-xs space-y-0.5">
                      <div className="font-bold text-sm text-cu-blue">{user.fullName}</div>
                      <div className="text-slate-600 truncate">{user.schoolEmail}</div>
                      <div className="text-slate-400 font-mono text-[11px]">Matric: {user.matricNumber}</div>
                    </div>
                    <Link to="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 font-medium">
                      <User className="w-4 h-4 text-slate-500" /> My Profile & Delivery
                    </Link>
                    <Link to="/buy/wallets" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-emerald-700 font-bold">
                      <Wallet className="w-4 h-4 text-emerald-600" /> Buyer Spending Wallet
                    </Link>
                    <Link to="/sell/sales-balance" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-purple-700 font-bold">
                      <Store className="w-4 h-4 text-purple-600" /> Seller Sales Balance
                    </Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm text-slate-200 hover:text-white font-medium">
                  Log in
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm bg-cu-gold text-cu-blue font-bold rounded-xl shadow-md hover:bg-cu-goldHover transition">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden">
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-200">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-cu-dark border-t border-blue-900/60 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-4 text-sm">
            {user ? (
              <div className="flex items-center gap-3 pb-3 border-b border-blue-900/40">
                <div className="w-10 h-10 rounded-full bg-cu-gold text-cu-blue font-black flex items-center justify-center text-base flex-shrink-0">
                  {user.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{user.fullName}</div>
                  <div className="text-cu-gold font-mono text-xs">{user.regNumber}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-blue-900/40">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="py-2.5 text-center bg-blue-900/60 rounded-xl font-semibold">Log In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="py-2.5 text-center bg-cu-gold text-cu-blue font-bold rounded-xl">Register</Link>
              </div>
            )}

            {!user && (
              <div className="space-y-1">
                <MobileSectionLabel>Explore</MobileSectionLabel>
                <MobileNavLink to="/" onClick={() => setMobileOpen(false)}>Browse Marketplace</MobileNavLink>
                <MobileNavLink to="/guidelines" onClick={() => setMobileOpen(false)}>Guidelines & Safety</MobileNavLink>
              </div>
            )}

            {user && (
              <>
                <div className="space-y-1">
                  <MobileSectionLabel>Buy Products</MobileSectionLabel>
                  <MobileNavLink to="/" onClick={() => setMobileOpen(false)}>Browse Marketplace</MobileNavLink>
                  <MobileNavLink to="/buy/saved" onClick={() => setMobileOpen(false)}>Saved Items</MobileNavLink>
                  <MobileNavLink to="/buy/wallets" onClick={() => setMobileOpen(false)} accent="emerald">Wallets (Spending)</MobileNavLink>
                  <MobileNavLink to="/buy/pending" onClick={() => setMobileOpen(false)} badge={pendingPurchases}>Pending Purchases</MobileNavLink>
                  <MobileNavLink to="/buy/history" onClick={() => setMobileOpen(false)}>Purchase History</MobileNavLink>
                </div>

                <div className="space-y-1">
                  <MobileSectionLabel>Sell Products</MobileSectionLabel>
                  <MobileNavLink to="/sell/add" onClick={() => setMobileOpen(false)} accent="gold">Add Item</MobileNavLink>
                  <MobileNavLink to="/sell/catalogue" onClick={() => setMobileOpen(false)}>Sales Catalogue</MobileNavLink>
                  <MobileNavLink to="/sell/pending" onClick={() => setMobileOpen(false)} badge={pendingSales}>Pending Sales</MobileNavLink>
                  <MobileNavLink to="/sell/history" onClick={() => setMobileOpen(false)}>Sales History</MobileNavLink>
                  <MobileNavLink to="/sell/sales-balance" onClick={() => setMobileOpen(false)} accent="purple">Sales Balance</MobileNavLink>
                </div>

                <div className="space-y-1">
                  <MobileSectionLabel>Account</MobileSectionLabel>
                  <MobileNavLink to="/messages" onClick={() => setMobileOpen(false)} badge={unreadMessages}>Messages</MobileNavLink>
                  <MobileNavLink to="/profile" onClick={() => setMobileOpen(false)}>My Profile & Delivery</MobileNavLink>
                  <MobileNavLink to="/guidelines" onClick={() => setMobileOpen(false)}>Guidelines & Safety</MobileNavLink>
                  {user.role === 'admin' && (
                    <MobileNavLink to="/admin" onClick={() => setMobileOpen(false)} accent="amber">Admin Portal</MobileNavLink>
                  )}
                </div>

                <div className="pt-2 border-t border-blue-900/40">
                  <button type="button" onClick={handleLogout} className="w-full text-left py-2.5 px-3 rounded-xl text-red-300 hover:bg-red-500/10 font-semibold flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
