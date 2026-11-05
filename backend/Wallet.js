/**
 * Financial operations separating Buyer Spending Wallet and Seller Sales Balance
 */

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSED: 'processed'
};

// ---------------- BUYER WALLET (SPENDING ONLY) ---------------- //

export function createInitialBuyerWallet(userId) {
  return {
    walletId: 'wal_' + userId,
    userId,
    availableBalance: 0,
    updatedAt: new Date().toISOString()
  };
}

export function topUpBuyerWallet(wallet, amount, reference, description = 'Paystack Wallet Top-up') {
  const num = Number(amount);
  if (num <= 0) throw new Error('Top up amount must be positive.');

  const updatedWallet = {
    ...wallet,
    availableBalance: Number((Number(wallet.availableBalance || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const transaction = {
    transactionId: 'wtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: wallet.userId,
    type: 'topup',
    amount: num,
    reference: reference || 'PSTK_' + Date.now(),
    status: 'successful',
    description,
    createdAt: new Date().toISOString()
  };

  return { wallet: updatedWallet, transaction };
}

export function deductBuyerWallet(wallet, amount, orderReference) {
  const num = Number(amount);
  if (Number(wallet.availableBalance || 0) < num) {
    const deficit = Number((num - Number(wallet.availableBalance || 0)).toFixed(2));
    throw new Error(`Insufficient wallet balance. You need ₦${deficit.toLocaleString()} more. Please top up your wallet.`);
  }

  const updatedWallet = {
    ...wallet,
    availableBalance: Number((Number(wallet.availableBalance || 0) - num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const transaction = {
    transactionId: 'wtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: wallet.userId,
    type: 'purchase_deduction',
    amount: num,
    reference: orderReference || 'ORD_DED_' + Date.now(),
    status: 'successful',
    description: `Purchase deduction for order ${orderReference || ''}`,
    createdAt: new Date().toISOString()
  };

  return { wallet: updatedWallet, transaction };
}

// ---------------- SELLER SALES BALANCE (EARNINGS ONLY) ---------------- //

export function createInitialSalesBalance(userId) {
  return {
    salesBalanceId: 'sb_' + userId,
    userId,
    availableBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    updatedAt: new Date().toISOString()
  };
}

export function creditSellerPendingSale(salesBalance, amount, orderId, orderReference) {
  const num = Number(amount);
  const updatedBalance = {
    ...salesBalance,
    pendingBalance: Number((Number(salesBalance.pendingBalance || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const transaction = {
    transactionId: 'stx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sellerId: salesBalance.userId,
    orderId,
    orderReference,
    amount: num,
    type: 'pending_sale',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  return { salesBalance: updatedBalance, transaction };
}

export function releaseSellerPendingToAvailable(salesBalance, amount, orderId, orderReference) {
  const num = Number(amount);
  const currentPending = Number(salesBalance.pendingBalance || 0);
  const releaseAmt = Math.min(currentPending, num);

  const updatedBalance = {
    ...salesBalance,
    pendingBalance: Number((currentPending - releaseAmt).toFixed(2)),
    availableBalance: Number((Number(salesBalance.availableBalance || 0) + releaseAmt).toFixed(2)),
    totalEarnings: Number((Number(salesBalance.totalEarnings || 0) + releaseAmt).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const transaction = {
    transactionId: 'stx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sellerId: salesBalance.userId,
    orderId,
    orderReference,
    amount: releaseAmt,
    type: 'released_sale',
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  return { salesBalance: updatedBalance, transaction };
}

export function requestSalesWithdrawal(salesBalance, { amount, bankName, accountNumber, accountName }) {
  const num = Number(amount);
  if (Number(salesBalance.availableBalance || 0) < num) {
    throw new Error('Insufficient available sales balance. Pending sales cannot be withdrawn.');
  }

  const updatedBalance = {
    ...salesBalance,
    availableBalance: Number((Number(salesBalance.availableBalance || 0) - num).toFixed(2)),
    totalWithdrawals: Number((Number(salesBalance.totalWithdrawals || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const withdrawalRequest = {
    requestId: 'wdr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: salesBalance.userId,
    amount: num,
    bankName,
    accountNumber,
    accountName,
    status: WITHDRAWAL_STATUS.PENDING,
    adminNotes: '',
    processedAt: null,
    createdAt: new Date().toISOString()
  };

  return { salesBalance: updatedBalance, withdrawalRequest };
}
