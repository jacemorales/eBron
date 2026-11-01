import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
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
import { Wallet } from './pages/Wallet';
import { Messages } from './pages/Messages';
import { Guidelines } from './pages/Guidelines';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

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
        <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-xl border text-xs shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
          toast.type === 'error' ? 'bg-red-50 text-red-900 border-red-300' :
          'bg-blue-50 text-blue-900 border-blue-300'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<BrowseProducts onToast={showToast} />} />
          <Route path="/product/:id" element={<ProductDetails onToast={showToast} />} />
          <Route path="/buy/saved" element={<SavedItems onToast={showToast} />} />
          <Route path="/checkout/:productId" element={<Checkout onToast={showToast} />} />
          <Route path="/buy/pending" element={<PendingPurchases onToast={showToast} />} />
          <Route path="/buy/history" element={<PurchaseHistory onToast={showToast} />} />
          <Route path="/sell/add" element={<AddItem onToast={showToast} />} />
          <Route path="/sell/catalogue" element={<SalesCatalogue onToast={showToast} />} />
          <Route path="/sell/pending" element={<PendingSales onToast={showToast} />} />
          <Route path="/sell/history" element={<SalesHistory onToast={showToast} />} />
          <Route path="/sell/wallet" element={<Wallet onToast={showToast} />} />
          <Route path="/messages" element={<Messages onToast={showToast} />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/admin" element={<AdminDashboard onToast={showToast} />} />
          <Route path="/login" element={<Login onToast={showToast} />} />
          <Route path="/register" element={<Register onToast={showToast} />} />
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
