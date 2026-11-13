import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy Wallet route redirector:
 * Redirects legacy /sell/wallet visitors to the dedicated /sell/sales-balance page.
 */
export const Wallet: React.FC<{ onToast?: any }> = () => {
  return <Navigate to="/sell/sales-balance" replace />;
};
