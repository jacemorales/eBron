export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSED: 'processed'
};

export function createInitialWallet(userId) {
  return {
    walletId: 'wal_' + userId,
    userId,
    availableBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    updatedAt: new Date().toISOString()
  };
}

export function topUpAvailableBalance(wallet, amount) {
  const num = Number(amount);
  if (num <= 0) throw new Error('Top up amount must be positive.');
  return {
    ...wallet,
    availableBalance: Number((Number(wallet.availableBalance || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
}

export function deductAvailableBalance(wallet, amount) {
  const num = Number(amount);
  if (Number(wallet.availableBalance || 0) < num) throw new Error('Insufficient wallet balance.');
  return {
    ...wallet,
    availableBalance: Number((Number(wallet.availableBalance || 0) - num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
}

export function creditPendingBalance(wallet, amount) {
  const num = Number(amount);
  return {
    ...wallet,
    pendingBalance: Number((wallet.pendingBalance + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
}

export function releasePendingToAvailable(wallet, amount) {
  const num = Number(amount);
  return {
    ...wallet,
    pendingBalance: Number((wallet.pendingBalance - num).toFixed(2)),
    availableBalance: Number((wallet.availableBalance + num).toFixed(2)),
    totalEarnings: Number((wallet.totalEarnings + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
}

export function requestWithdrawal(wallet, { amount, bankName, accountNumber, accountName }) {
  const num = Number(amount);
  if (wallet.availableBalance < num) throw new Error('Insufficient balance.');
  const updatedWallet = {
    ...wallet,
    availableBalance: Number((wallet.availableBalance - num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
  const withdrawalRequest = {
    requestId: 'wdr_' + Date.now(),
    userId: wallet.userId,
    amount: num,
    bankName,
    accountNumber,
    accountName,
    status: WITHDRAWAL_STATUS.PENDING,
    adminNotes: '',
    processedAt: null,
    createdAt: new Date().toISOString()
  };
  return { wallet: updatedWallet, withdrawalRequest };
}
