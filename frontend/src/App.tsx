import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BrowseProducts } from './pages/BrowseProducts';
import { ProductDetails } from './pages/ProductDetails';
import { SavedItems } from './pages/SavedItems';
import { Checkout } from './pages/Checkout';
import { PendingPurchases } from './pages/PendingPurchases';
import { PurchaseHistory } from './pages/PurchaseHistory';
import { AddItem } from './pages/AddItem';
import { SalesCatalogue } from './pages/SalesCatalogue';
import { PendingSales } from './pages/PendingSales';
import { SalesHistory } from './pages/SalesHistory';
import { BuyerWalletPage } from './pages/BuyerWallet';
import { SalesBalancePage } from './pages/SalesBalance';
import { Wallet } from './pages/Wallet';
import { Messages } from './pages/Messages';
import { Guidelines } from './pages/Guidelines';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';

export const AppContent: React.FC = () => {
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

  const showToast = (type: any, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-3.5 rounded-2xl border text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
          toast.type === 'error' ? 'bg-red-50 text-red-900 border-red-300' :
          'bg-blue-50 text-blue-900 border-blue-300'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="flex-1">
        <Routes>
          {/* Public accessible routes */}
          <Route path="/" element={<BrowseProducts onToast={showToast} />} />
          <Route path="/product/:id" element={<ProductDetails onToast={showToast} />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/login" element={<Login onToast={showToast} />} />
          <Route path="/register" element={<Register onToast={showToast} />} />

          {/* Protected routes guarded against unauthenticated access */}
          <Route path="/profile" element={<ProtectedRoute><Profile onToast={showToast} /></ProtectedRoute>} />
          <Route path="/buy/saved" element={<ProtectedRoute><SavedItems onToast={showToast} /></ProtectedRoute>} />
          <Route path="/buy/wallets" element={<ProtectedRoute><BuyerWalletPage onToast={showToast} /></ProtectedRoute>} />
          <Route path="/checkout/:productId" element={<ProtectedRoute><Checkout onToast={showToast} /></ProtectedRoute>} />
          <Route path="/buy/pending" element={<ProtectedRoute><PendingPurchases onToast={showToast} /></ProtectedRoute>} />
          <Route path="/buy/history" element={<ProtectedRoute><PurchaseHistory onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/add" element={<ProtectedRoute><AddItem onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/catalogue" element={<ProtectedRoute><SalesCatalogue onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/pending" element={<ProtectedRoute><PendingSales onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/history" element={<ProtectedRoute><SalesHistory onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/sales-balance" element={<ProtectedRoute><SalesBalancePage onToast={showToast} /></ProtectedRoute>} />
          <Route path="/sell/wallet" element={<ProtectedRoute><Wallet onToast={showToast} /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages onToast={showToast} /></ProtectedRoute>} />

          {/* Admin protected route */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard onToast={showToast} /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};
export default App;
