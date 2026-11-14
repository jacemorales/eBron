export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
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

export function creditBuyerRefund(wallet, amount, orderReference, description = 'Refund for cancelled order') {
  const num = Number(amount);
  if (num <= 0) throw new Error('Refund amount must be positive.');

  const updatedWallet = {
    ...wallet,
    availableBalance: Number((Number(wallet.availableBalance || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const transaction = {
    transactionId: 'wtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: wallet.userId,
    type: 'refund_credit',
    amount: num,
    reference: orderReference || 'REFUND_' + Date.now(),
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

export const SUPPORTED_WITHDRAWAL_BANKS = [
  { id: 'opay', name: 'Opay', code: '999992' },
  { id: 'moniepoint', name: 'Moniepoint', code: '50515' },
  { id: 'palmpay', name: 'PalmPay', code: '999991' }
];

export function validateWithdrawalBankAndAccount(bankCodeOrName, accountNumber) {
  const errors = [];
  const target = String(bankCodeOrName || '').trim().toLowerCase();
  const bank = SUPPORTED_WITHDRAWAL_BANKS.find(b =>
    b.code.toLowerCase() === target ||
    b.name.toLowerCase() === target ||
    b.id.toLowerCase() === target
  );
  if (!bank) {
    errors.push('Please select one of our supported banks for faster withdrawal processing (Opay, Moniepoint, PalmPay).');
  }

  const acc = String(accountNumber || '').trim();
  if (!/^\d{10}$/.test(acc)) {
    errors.push('Account number must be exactly 10 numerical digits.');
  }

  return { valid: errors.length === 0, errors, bank };
}

export function requestSalesWithdrawal(salesBalance, { amount, bankName, bankCode = '', accountNumber, accountName }) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Withdrawal amount must be a positive number.');
  }
  if (Number(salesBalance.availableBalance || 0) < num) {
    throw new Error('Insufficient available sales balance. Pending sales cannot be withdrawn.');
  }
  if (!bankName || !accountNumber || !accountName) {
    throw new Error('Complete bank details (bank name, account number, account name) are required.');
  }

  const bankVal = validateWithdrawalBankAndAccount(bankCode || bankName, accountNumber);
  if (!bankVal.valid) {
    throw new Error(bankVal.errors[0]);
  }

  // Deduct from available balance to lock the funds and prevent double-withdrawal, track requested total withdrawals
  const updatedBalance = {
    ...salesBalance,
    availableBalance: Number((Number(salesBalance.availableBalance || 0) - num).toFixed(2)),
    totalWithdrawals: Number((Number(salesBalance.totalWithdrawals || 0) + num).toFixed(2)),
    updatedAt: new Date().toISOString()
  };

  const reqId = 'wdr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const reference = 'WD-' + Math.floor(100000 + Math.random() * 900000);

  const withdrawalRequest = {
    requestId: reqId,
    userId: salesBalance.userId,
    amount: num,
    bankName: bankVal.bank.name,
    bankCode: bankVal.bank.code,
    accountNumber: String(accountNumber).trim(),
    accountName,
    status: WITHDRAWAL_STATUS.PENDING,
    reference,
    paystackRecipientCode: null,
    paystackTransferCode: null,
    paystackStatus: null,
    adminNotes: '',
    processedAt: null,
    createdAt: new Date().toISOString()
  };

  return { salesBalance: updatedBalance, withdrawalRequest };
}

export function processWithdrawalTransfer(firstArg, secondArg, thirdArg = {}, fourthArg = null) {
  let withdrawalRequest;
  let decision;
  let paystackResult = {};
  let salesBalance = null;

  if (secondArg && typeof secondArg === 'object' && (secondArg.requestId || secondArg.reference)) {
    // Signature: (salesBalance, withdrawalRequest, decision, paystackResult/error)
    salesBalance = firstArg;
    withdrawalRequest = secondArg;
    decision = thirdArg;
    if (typeof fourthArg === 'string') {
      paystackResult = { error: fourthArg, adminNotes: fourthArg };
    } else if (fourthArg && typeof fourthArg === 'object') {
      paystackResult = fourthArg;
    }
  } else {
    // Signature: (withdrawalRequest, decision, paystackResult, salesBalance)
    withdrawalRequest = firstArg;
    decision = secondArg;
    if (typeof thirdArg === 'string') {
      paystackResult = { error: thirdArg, adminNotes: thirdArg };
    } else if (thirdArg && typeof thirdArg === 'object') {
      paystackResult = thirdArg;
    }
    salesBalance = fourthArg;
  }

  if (!withdrawalRequest) throw new Error('Withdrawal request not found.');
  if (withdrawalRequest.status === WITHDRAWAL_STATUS.SUCCESSFUL || withdrawalRequest.status === WITHDRAWAL_STATUS.PROCESSED) {
    throw new Error('Withdrawal has already been successfully processed.');
  }

  const now = new Date().toISOString();
  const amt = Number(withdrawalRequest.amount);

  const isSuccess = decision === 'successful' || decision === 'completed' || ((decision === 'approve' || decision === 'process') && paystackResult?.success);
  const isFailed = decision === 'failed' || decision === 'fail' || ((decision === 'approve' || decision === 'process') && paystackResult && paystackResult.success === false);
  const isRejected = decision === 'reject' || decision === 'rejected';

  if (isSuccess) {
    let updatedSalesBalance = salesBalance;
    if (salesBalance) {
      updatedSalesBalance = {
        ...salesBalance,
        updatedAt: now
      };
    }

    const updatedRequest = {
      ...withdrawalRequest,
      status: WITHDRAWAL_STATUS.SUCCESSFUL,
      paystackRecipientCode: paystackResult.recipientCode || withdrawalRequest.paystackRecipientCode,
      paystackTransferCode: paystackResult.transferCode || withdrawalRequest.paystackTransferCode,
      paystackStatus: paystackResult.transferStatus || 'success',
      adminNotes: paystackResult.message || paystackResult.adminNotes || 'Transfer completed successfully via Paystack',
      processedAt: now
    };

    const transaction = {
      transactionId: 'stx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sellerId: withdrawalRequest.userId,
      orderId: '',
      orderReference: withdrawalRequest.reference || withdrawalRequest.requestId,
      amount: amt,
      type: 'withdrawal',
      status: 'completed',
      createdAt: now
    };

    return {
      withdrawalRequest: updatedRequest,
      salesBalance: updatedSalesBalance,
      transaction,
      status: WITHDRAWAL_STATUS.SUCCESSFUL
    };
  }

  if (isFailed) {
    let updatedSalesBalance = salesBalance;
    if (salesBalance) {
      // Restore available sales balance and reverse requested total withdrawals so funds are not lost
      updatedSalesBalance = {
        ...salesBalance,
        availableBalance: Number((Number(salesBalance.availableBalance || 0) + amt).toFixed(2)),
        totalWithdrawals: Math.max(0, Number((Number(salesBalance.totalWithdrawals || 0) - amt).toFixed(2))),
        updatedAt: now
      };
    }

    const updatedRequest = {
      ...withdrawalRequest,
      status: WITHDRAWAL_STATUS.FAILED,
      paystackStatus: 'failed',
      adminNotes: paystackResult?.error || paystackResult?.adminNotes || 'Paystack transfer initiation failed. Funds restored to available balance.',
      processedAt: now
    };

    return {
      withdrawalRequest: updatedRequest,
      salesBalance: updatedSalesBalance,
      status: WITHDRAWAL_STATUS.FAILED,
      error: paystackResult?.error || 'Paystack transfer failed.'
    };
  }

  if (isRejected) {
    let updatedSalesBalance = salesBalance;
    if (salesBalance) {
      // Restore available balance and reverse requested total withdrawals upon admin rejection
      updatedSalesBalance = {
        ...salesBalance,
        availableBalance: Number((Number(salesBalance.availableBalance || 0) + amt).toFixed(2)),
        totalWithdrawals: Math.max(0, Number((Number(salesBalance.totalWithdrawals || 0) - amt).toFixed(2))),
        updatedAt: now
      };
    }

    const updatedRequest = {
      ...withdrawalRequest,
      status: WITHDRAWAL_STATUS.REJECTED,
      adminNotes: paystackResult?.adminNotes || paystackResult?.error || 'Withdrawal request rejected by administrator. Balance restored.',
      processedAt: now
    };

    return {
      withdrawalRequest: updatedRequest,
      salesBalance: updatedSalesBalance,
      status: WITHDRAWAL_STATUS.REJECTED
    };
  }

  throw new Error(`Unknown withdrawal decision: ${decision}`);
}

export function recordFinancialTransaction(existingTransactions = [], txData = {}) {
  const now = new Date().toISOString();
  const txList = [...existingTransactions];
  const ref = txData.reference;
  const existingIndex = txList.findIndex(t => t.reference === ref || (txData.transactionId && t.transactionId === txData.transactionId));

  const statusEntry = {
    status: txData.eBronStatus || txData.status || 'pending',
    eBronStatus: txData.eBronStatus || txData.status || 'pending',
    paystackStatus: txData.paystackStatus || 'none',
    timestamp: now,
    details: txData.details || txData.errorMessage || ''
  };

  if (existingIndex !== -1) {
    const existing = txList[existingIndex];
    let history = [];
    if (typeof existing.statusHistory === 'string') {
      try { history = JSON.parse(existing.statusHistory); } catch (e) { history = []; }
    } else if (Array.isArray(existing.statusHistory)) {
      history = [...existing.statusHistory];
    }
    history.push(statusEntry);

    const updated = {
      ...existing,
      eBronStatus: txData.eBronStatus || existing.eBronStatus,
      paystackStatus: txData.paystackStatus || existing.paystackStatus,
      statusHistory: history,
      updatedAt: now,
      verificationDetails: txData.verificationDetails !== undefined ? txData.verificationDetails : existing.verificationDetails,
      errorMessage: txData.errorMessage !== undefined ? txData.errorMessage : existing.errorMessage
    };
    txList[existingIndex] = updated;
    return { transactions: txList, transaction: updated, isNew: false };
  } else {
    const newTx = {
      transactionId: txData.transactionId || ('tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      reference: ref,
      userId: txData.userId || '',
      buyerId: txData.buyerId || '',
      sellerId: txData.sellerId || '',
      productId: txData.productId || '',
      orderId: txData.orderId || '',
      type: txData.type,
      amount: Number(txData.amount) || 0,
      paymentMethod: txData.paymentMethod || 'wallet',
      paymentProvider: txData.paymentProvider || 'ebron',
      eBronStatus: txData.eBronStatus || 'pending',
      paystackStatus: txData.paystackStatus || 'none',
      statusHistory: [statusEntry],
      createdAt: now,
      updatedAt: now,
      verificationDetails: txData.verificationDetails || null,
      errorMessage: txData.errorMessage || ''
    };
    txList.push(newTx);
    return { transactions: txList, transaction: newTx, isNew: true };
  }
}

export function reconcileTransaction(transactions = [], wallets = [], reference) {
  const txIndex = transactions.findIndex(t => t.reference === reference);
  if (txIndex === -1) throw new Error('Transaction record not found for reconciliation.');
  const tx = transactions[txIndex];

  if (tx.eBronStatus === 'completed') {
    return { transactions, wallets, message: 'Transaction is already completed.', reconciled: false };
  }

  // Credit user wallet safely without re-charging
  const now = new Date().toISOString();
  const walletIndex = wallets.findIndex(w => w.userId === tx.userId);
  let updatedWallets = [...wallets];
  let creditedWallet = null;

  if (walletIndex !== -1) {
    const curW = wallets[walletIndex];
    creditedWallet = {
      ...curW,
      availableBalance: Number((Number(curW.availableBalance || 0) + Number(tx.amount)).toFixed(2)),
      updatedAt: now
    };
    updatedWallets[walletIndex] = creditedWallet;
  } else {
    creditedWallet = {
      walletId: 'wal_' + tx.userId,
      userId: tx.userId,
      availableBalance: Number(Number(tx.amount).toFixed(2)),
      updatedAt: now
    };
    updatedWallets.push(creditedWallet);
  }

  // Update transaction status history
  const statusHistory = Array.isArray(tx.statusHistory) ? [...tx.statusHistory] : (typeof tx.statusHistory === 'string' ? JSON.parse(tx.statusHistory) : []);
  statusHistory.push({
    status: 'completed',
    eBronStatus: 'completed',
    paystackStatus: tx.paystackStatus || 'success',
    timestamp: now,
    details: 'Reconciled by administrator: missing wallet credit completed.'
  });

  const updatedTx = {
    ...tx,
    eBronStatus: 'completed',
    statusHistory,
    updatedAt: now,
    errorMessage: ''
  };

  const updatedTransactions = [...transactions];
  updatedTransactions[txIndex] = updatedTx;

  return {
    transactions: updatedTransactions,
    wallets: updatedWallets,
    transaction: updatedTx,
    wallet: creditedWallet,
    reconciled: true
  };
}

export function bulkProcessWithdrawals(withdrawalRequests = [], decision = 'approve', salesBalancesMap = {}, paystackResultsMap = {}) {
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  for (const req of withdrawalRequests) {
    if (req.status !== WITHDRAWAL_STATUS.PENDING) {
      results.skipped.push({ requestId: req.requestId, reason: `Status is ${req.status}, must be pending.` });
      continue;
    }

    const sBalance = salesBalancesMap[req.userId] || null;
    const paystackRes = paystackResultsMap[req.requestId] || { success: decision === 'approve' };

    try {
      const processed = processWithdrawalTransfer(req, decision, paystackRes, sBalance);
      if (processed.status === WITHDRAWAL_STATUS.SUCCESSFUL) {
        results.successful.push(processed);
      } else if (processed.status === WITHDRAWAL_STATUS.FAILED) {
        results.failed.push(processed);
      } else if (processed.status === WITHDRAWAL_STATUS.REJECTED) {
        results.successful.push(processed);
      }
    } catch (err) {
      results.failed.push({ requestId: req.requestId, error: err.message });
    }
  }

  return results;
}

