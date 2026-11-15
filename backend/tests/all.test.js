import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS_SCHEMA } from '../Setup.js';
import { validateRegistrationData, checkAccountActive, validateAppeal, USER_STATUS } from '../Auth.js';
import {
  validateProductData,
  validateProductReport,
  initializeProductStock,
  decrementProductStock,
  restoreProductStock,
  filterProducts
} from '../Products.js';
import {
  ORDER_STATUS,
  validateOrderCreation,
  createOrderRecord,
  requestOrderCancellation,
  processRefundApproval,
  processOrderConfirmation
} from '../Orders.js';
import {
  createInitialBuyerWallet,
  topUpBuyerWallet,
  deductBuyerWallet,
  creditBuyerRefund,
  createInitialSalesBalance,
  creditSellerPendingSale,
  releaseSellerPendingToAvailable,
  requestSalesWithdrawal,
  processWithdrawalTransfer,
  cancelWithdrawalRequest,
  processManualWithdrawal,
  SUPPORTED_WITHDRAWAL_BANKS,
  WITHDRAWAL_PAYMENT_METHOD,
  validateWithdrawalBankAndAccount,
  recordFinancialTransaction,
  reconcileTransaction,
  bulkProcessWithdrawals
} from '../Wallet.js';

test('database schema includes separated wallets, merged chat/notification tables, and central ledger', () => {
  assert.ok(SHEETS_SCHEMA.Users);
  assert.ok(SHEETS_SCHEMA.Products);
  assert.ok(SHEETS_SCHEMA.Wallets);
  assert.ok(SHEETS_SCHEMA.WalletTransactions);
  assert.ok(SHEETS_SCHEMA.SalesBalances);
  assert.ok(SHEETS_SCHEMA.SalesTransactions);
  assert.ok(SHEETS_SCHEMA.Reports);

  // Conversations merged into Messages; subscriptions merged into Notifications.
  assert.ok(SHEETS_SCHEMA.Messages);
  assert.ok(SHEETS_SCHEMA.Messages.includes('conversationId'));
  assert.ok(SHEETS_SCHEMA.Messages.includes('messageId'));
  assert.ok(SHEETS_SCHEMA.Messages.includes('buyerId'));
  assert.ok(SHEETS_SCHEMA.Notifications);
  assert.ok(SHEETS_SCHEMA.Notifications.includes('notificationId'));
  assert.ok(SHEETS_SCHEMA.Notifications.includes('endpoint'));

  // Retired sheets must no longer exist.
  assert.equal(SHEETS_SCHEMA.Conversations, undefined);
  assert.equal(SHEETS_SCHEMA.NotificationSubscriptions, undefined);

  // Central Financial Ledger Transactions sheet
  assert.ok(SHEETS_SCHEMA.Transactions);
  assert.ok(SHEETS_SCHEMA.Transactions.includes('statusHistory'));
  assert.ok(SHEETS_SCHEMA.Transactions.includes('eBronStatus'));
  assert.ok(SHEETS_SCHEMA.Transactions.includes('paystackStatus'));

  assert.ok(SHEETS_SCHEMA.Products.includes('stockNumber'));

  // Withdrawal reservation model: SalesBalances tracks reserved funds separately.
  assert.ok(SHEETS_SCHEMA.SalesBalances.includes('reservedBalance'));

  // Dedicated withdrawal record captures the full admin-approval + Paystack lifecycle.
  assert.ok(SHEETS_SCHEMA.WithdrawalRequests);
  [
    'requestId', 'userId', 'userName', 'userRegNumber', 'amount', 'bankName', 'bankCode',
    'accountNumber', 'status', 'reference', 'paystackRecipientCode', 'paystackTransferCode',
    'paymentMethod', 'manualConfirmedBy', 'manualConfirmedAt', 'failureReason',
    'adminId', 'rejectionReason', 'processedAt', 'completedAt', 'createdAt', 'updatedAt'
  ].forEach(col => assert.ok(SHEETS_SCHEMA.WithdrawalRequests.includes(col), `WithdrawalRequests missing ${col}`));
});

test('auth validates CU email', () => {
  const res = validateRegistrationData({
    fullName: 'Michael Morgan',
    regNumber: '2401234',
    matricNumber: '24jk123456',
    schoolEmail: 'email@stu.cu.edu.ng',
    gender: 'Male',
    hallOfResidence: 'Peter',
    roomNumber: 'A102',
    password: 'password123'
  });
  assert.equal(res.valid, true);
});

test('buyer wallet top up and purchase deduction work correctly', () => {
  let buyerWallet = createInitialBuyerWallet('u1');
  assert.equal(buyerWallet.availableBalance, 0);

  const topUpResult = topUpBuyerWallet(buyerWallet, 10000, 'PSTK_123');
  buyerWallet = topUpResult.wallet;
  assert.equal(buyerWallet.availableBalance, 10000);
  assert.equal(topUpResult.transaction.type, 'topup');
  assert.equal(topUpResult.transaction.amount, 10000);

  const deductResult = deductBuyerWallet(buyerWallet, 3500, 'EBR-1001');
  buyerWallet = deductResult.wallet;
  assert.equal(buyerWallet.availableBalance, 6500);
  assert.equal(deductResult.transaction.type, 'purchase_deduction');
  assert.equal(deductResult.transaction.amount, 3500);

  assert.throws(() => {
    deductBuyerWallet(buyerWallet, 8000, 'EBR-1002');
  }, /Insufficient wallet balance/);
});

test('seller sales balance separates pending and available earnings', () => {
  let salesBalance = createInitialSalesBalance('seller_1');
  assert.equal(salesBalance.availableBalance, 0);
  assert.equal(salesBalance.pendingBalance, 0);

  // Credit pending sale upon purchase
  const pendingResult = creditSellerPendingSale(salesBalance, 5000, 'ord_1', 'EBR-1001');
  salesBalance = pendingResult.salesBalance;
  assert.equal(salesBalance.pendingBalance, 5000);
  assert.equal(salesBalance.availableBalance, 0);

  // Attempting withdrawal from pending should fail
  assert.throws(() => {
    requestSalesWithdrawal(salesBalance, {
      amount: 2000,
      bankName: 'Opay',
      bankCode: '999992',
      accountNumber: '0123456789',
      accountName: 'Seller Name'
    });
  }, /Insufficient available sales balance/);

  // Release pending to available upon dual confirmation
  const releaseResult = releaseSellerPendingToAvailable(salesBalance, 5000, 'ord_1', 'EBR-1001');
  salesBalance = releaseResult.salesBalance;
  assert.equal(salesBalance.pendingBalance, 0);
  assert.equal(salesBalance.availableBalance, 5000);
  assert.equal(salesBalance.totalEarnings, 5000);

  // Now withdrawal should succeed and RESERVE the funds (pending approval; not yet withdrawn)
  const withdrawalResult = requestSalesWithdrawal(salesBalance, {
    amount: 3000,
    bankName: 'Opay',
    bankCode: '999992',
    accountNumber: '0123456789'
  });
  salesBalance = withdrawalResult.salesBalance;
  assert.equal(salesBalance.availableBalance, 2000);
  assert.equal(salesBalance.reservedBalance, 3000);
  assert.equal(salesBalance.totalWithdrawals, 0);
  assert.equal(withdrawalResult.withdrawalRequest.amount, 3000);
  assert.equal(withdrawalResult.withdrawalRequest.status, 'pending');
});

test('order creation requires sufficient buyer wallet balance', () => {
  const buyer = { userId: 'u1', fullName: 'Michael Morgan' };
  const product = { productId: 'p1', price: 15000, availability: 'available', sellerId: 'u2' };
  const delivery = { fullName: 'Michael', gender: 'Male', hallOfResidence: 'Peter', roomNumber: 'B1' };
  const lowWallet = { availableBalance: 5000 };

  const lowRes = validateOrderCreation(buyer, product, delivery, lowWallet);
  assert.equal(lowRes.valid, false);
  assert.match(lowRes.errors[0], /Insufficient wallet balance/);

  const sufficientWallet = { availableBalance: 20000 };
  const goodRes = validateOrderCreation(buyer, product, delivery, sufficientWallet);
  assert.equal(goodRes.valid, true);
});

test('product report validation enforces restrictions and categories', () => {
  const user = { userId: 'u1', fullName: 'Michael Morgan', schoolEmail: 'email@stu.cu.edu.ng' };
  const sellerProduct = { productId: 'p1', sellerId: 'u1', name: 'My Own Textbook' };

  // Cannot report own product
  const ownRes = validateProductReport(user, sellerProduct, 'Scammer or fraudulent seller', 'Suspicious seller');
  assert.equal(ownRes.valid, false);
  assert.match(ownRes.errors[0], /cannot report your own product/);

  // Can report someone else's product with valid category & explanation
  const otherProduct = { productId: 'p2', sellerId: 'u2', name: 'MacBook Pro' };
  const validRes = validateProductReport(user, otherProduct, 'Fake or counterfeit product', 'Serial number does not match original apple verification.');
  assert.equal(validRes.valid, true);

  // Duplicate prevention
  const existingReports = [{ productId: 'p2', reporterId: 'u1', status: 'pending' }];
  const dupRes = validateProductReport(user, otherProduct, 'Potentially stolen product', 'Stolen item report', existingReports);
  assert.equal(dupRes.valid, false);
  assert.match(dupRes.errors[0], /already submitted a report/);
});

test('buyer and seller cancellation requests transition order to refund_pending_approval and prevent conflicts', () => {
  const buyer = { userId: 'b1', fullName: 'Buyer One' };
  const seller = { userId: 's1', fullName: 'Seller One' };
  const product = { productId: 'p1', name: 'Desk Fan', price: 4000, sellerId: 's1', availableStock: 2 };
  const delivery = { fullName: 'Buyer One', gender: 'Male', hallOfResidence: 'Peter', roomNumber: '101' };

  // Create order
  const order = createOrderRecord(buyer, product, delivery, 1);
  assert.equal(order.status, ORDER_STATUS.PENDING);
  assert.equal(order.cancellationRequested, false);

  // Buyer requests cancellation
  const buyerCancelOrder = requestOrderCancellation(order, 'buyer', 'Changed my mind', 'Bought another item');
  assert.equal(buyerCancelOrder.status, ORDER_STATUS.REFUND_PENDING_APPROVAL);
  assert.equal(buyerCancelOrder.cancellationRequested, true);
  assert.equal(buyerCancelOrder.cancellationRequestedBy, 'buyer');
  assert.equal(buyerCancelOrder.cancellationReason, 'Changed my mind');

  // Attempting duplicate cancellation should fail
  assert.throws(() => {
    requestOrderCancellation(buyerCancelOrder, 'seller', 'Out of stock');
  }, /Cancellation request is already pending/);

  // Attempting to confirm receipt while refund is pending should fail
  assert.throws(() => {
    processOrderConfirmation(buyerCancelOrder, 'buyer', 'b1');
  }, /Cannot confirm order while refund request is pending/);
});

test('admin refund approval credits buyer wallet, reverses seller pending balance, and restores stock', () => {
  let buyerWallet = createInitialBuyerWallet('b1');
  buyerWallet = topUpBuyerWallet(buyerWallet, 10000, 'REF_1').wallet;
  // Deduct 4000 for purchase
  buyerWallet = deductBuyerWallet(buyerWallet, 4000, 'ORD_100').wallet;
  assert.equal(buyerWallet.availableBalance, 6000);

  let salesBalance = createInitialSalesBalance('s1');
  salesBalance = creditSellerPendingSale(salesBalance, 4000, 'ORD_100', 'REF_100').salesBalance;
  assert.equal(salesBalance.pendingBalance, 4000);

  let product = initializeProductStock({ productId: 'p1', price: 4000 }, 3);
  product = decrementProductStock(product, 1);
  assert.equal(product.availableStock, 2);
  assert.equal(product.soldQuantity, 1);

  const order = {
    orderId: 'ORD_100',
    orderReference: 'REF_100',
    buyerId: 'b1',
    sellerId: 's1',
    productId: 'p1',
    amount: 4000,
    quantity: 1,
    status: ORDER_STATUS.REFUND_PENDING_APPROVAL
  };

  // Admin approves refund
  const refundResult = processRefundApproval(order, 'approved', 'Approved by admin');
  assert.equal(refundResult.order.status, ORDER_STATUS.REFUNDED);
  assert.equal(refundResult.order.refundStatus, 'approved');

  // Credit buyer wallet
  const creditResult = creditBuyerRefund(buyerWallet, order.amount, order.orderId, order.orderReference);
  buyerWallet = creditResult.wallet;
  assert.equal(buyerWallet.availableBalance, 10000);
  assert.equal(creditResult.transaction.type, 'refund_credit');

  // Reverse seller pending balance
  salesBalance.pendingBalance = Math.max(0, salesBalance.pendingBalance - order.amount);
  assert.equal(salesBalance.pendingBalance, 0);

  // Restore product stock
  product = restoreProductStock(product, order.quantity);
  assert.equal(product.availableStock, 3);
  assert.equal(product.soldQuantity, 0);

  // Prevent duplicate refund approval
  assert.throws(() => {
    processRefundApproval(refundResult.order, 'approved', 'Trying duplicate');
  }, /already been processed/);
});

test('admin refund rejection restores order to active state with explanation', () => {
  const order = {
    orderId: 'ORD_200',
    orderReference: 'REF_200',
    buyerId: 'b1',
    sellerId: 's1',
    amount: 5000,
    status: ORDER_STATUS.REFUND_PENDING_APPROVAL,
    cancellationRequested: true
  };

  const rejectResult = processRefundApproval(order, 'rejected', 'Seller already dispatched the item.');
  assert.equal(rejectResult.order.status, ORDER_STATUS.PROCESSING);
  assert.equal(rejectResult.order.refundStatus, 'rejected');
  assert.equal(rejectResult.order.refundDecision, 'rejected');
  assert.equal(rejectResult.order.refundAdminNotes, 'Seller already dispatched the item.');
  assert.equal(rejectResult.order.cancellationRequested, false);
});

test('stock tracking initializes quantity, decrements on purchase, and prevents overselling', () => {
  // Defaults to 1 if unspecified
  const defaultProduct = initializeProductStock({ productId: 'p_def' });
  assert.equal(defaultProduct.initialStock, 1);
  assert.equal(defaultProduct.availableStock, 1);
  assert.equal(defaultProduct.soldQuantity, 0);
  assert.equal(defaultProduct.stockStatus, 'in_stock');

  // Multi-stock product
  let product = initializeProductStock({ productId: 'p_multi' }, 3);
  assert.equal(product.initialStock, 3);
  assert.equal(product.availableStock, 3);

  // Purchase 2 units
  product = decrementProductStock(product, 2);
  assert.equal(product.availableStock, 1);
  assert.equal(product.soldQuantity, 2);
  assert.equal(product.stockStatus, 'in_stock');

  // Attempting to buy 2 more should fail (overselling protection)
  assert.throws(() => {
    decrementProductStock(product, 2);
  }, /Insufficient stock/);

  // Buy final 1 unit
  product = decrementProductStock(product, 1);
  assert.equal(product.availableStock, 0);
  assert.equal(product.soldQuantity, 3);
  assert.equal(product.stockStatus, 'sold_out');
});

test('marketplace filtering excludes sold-out and unavailable products from public browse and includes legacy active products', () => {
  const products = [
    { productId: 'p1', availability: 'available', stockStatus: 'in_stock', availableStock: 2, status: 'active' },
    { productId: 'p2', availability: 'available', stockStatus: 'sold_out', availableStock: 0, status: 'active' },
    { productId: 'p3', availability: 'unavailable', stockStatus: 'in_stock', availableStock: 1, status: 'active' },
    { productId: 'p4', availability: 'available', stockStatus: 'in_stock', availableStock: 1, status: 'deleted' },
    // Legacy product where stockStatus, availableStock, initialStock are empty strings
    { productId: 'p5', availability: 'available', stockStatus: '', availableStock: '', initialStock: '', status: 'active' }
  ];

  const publicBrowse = filterProducts(products, { forPublic: true });
  assert.equal(publicBrowse.length, 2);
  assert.equal(publicBrowse[0].productId, 'p1');
  assert.equal(publicBrowse[1].productId, 'p5');

  // Catalogue/admin can view all non-deleted products
  const adminBrowse = filterProducts(products, { forPublic: false, includeDeleted: true });
  assert.equal(adminBrowse.length, 5);
});

test('sales withdrawal reserves funds and handles Paystack transfer success, failure, and rejection', () => {
  let salesBalance = createInitialSalesBalance('seller_10');
  salesBalance.availableBalance = 15000;
  salesBalance.totalEarnings = 15000;

  // Request withdrawal of 5000 -> funds reserved (not yet withdrawn)
  const reqRes = requestSalesWithdrawal(salesBalance, {
    amount: 5000,
    bankName: 'Opay',
    bankCode: '999992',
    accountNumber: '0123456789'
  });
  salesBalance = reqRes.salesBalance;
  assert.equal(salesBalance.availableBalance, 10000);
  assert.equal(salesBalance.reservedBalance, 5000);
  assert.equal(salesBalance.totalWithdrawals, 0);
  assert.equal(reqRes.withdrawalRequest.bankCode, '999992');
  assert.equal(reqRes.withdrawalRequest.status, 'pending');

  // Transfer fails: funds remain reserved (never lost) and the request is retryable
  const failTransfer = processWithdrawalTransfer(salesBalance, reqRes.withdrawalRequest, 'failed', 'Network timeout');
  salesBalance = failTransfer.salesBalance;
  assert.equal(salesBalance.availableBalance, 10000);
  assert.equal(salesBalance.reservedBalance, 5000);
  assert.equal(salesBalance.totalWithdrawals, 0);
  assert.equal(failTransfer.withdrawalRequest.status, 'failed');

  // Safe retry of the SAME request succeeds: reservation finalized into withdrawn total
  const retryTransfer = processWithdrawalTransfer(salesBalance, failTransfer.withdrawalRequest, 'successful');
  salesBalance = retryTransfer.salesBalance;
  assert.equal(retryTransfer.withdrawalRequest.status, 'successful');
  assert.equal(salesBalance.availableBalance, 10000);
  assert.equal(salesBalance.reservedBalance, 0);
  assert.equal(salesBalance.totalWithdrawals, 5000);

  // A new request that is rejected releases the reserved amount back to available
  const reqRes2 = requestSalesWithdrawal(salesBalance, {
    amount: 3000,
    bankName: 'PalmPay',
    bankCode: '999991',
    accountNumber: '0987654321'
  });
  salesBalance = reqRes2.salesBalance;
  assert.equal(salesBalance.availableBalance, 7000);
  assert.equal(salesBalance.reservedBalance, 3000);

  const rejectTransfer = processWithdrawalTransfer(salesBalance, reqRes2.withdrawalRequest, 'rejected', 'Bank details incorrect');
  salesBalance = rejectTransfer.salesBalance;
  assert.equal(rejectTransfer.withdrawalRequest.status, 'rejected');
  assert.equal(rejectTransfer.withdrawalRequest.rejectionReason, 'Bank details incorrect');
  assert.equal(salesBalance.availableBalance, 10000);
  assert.equal(salesBalance.reservedBalance, 0);
  assert.equal(salesBalance.totalWithdrawals, 5000);
});

test('withdrawal reservations prevent over-withdrawal and double-spending the same funds', () => {
  let salesBalance = createInitialSalesBalance('seller_res');
  salesBalance.availableBalance = 20000;
  salesBalance.totalEarnings = 20000;

  // First request reserves 8000 -> available drops to 12000
  const r1 = requestSalesWithdrawal(salesBalance, {
    amount: 8000, bankName: 'Opay', bankCode: '999992', accountNumber: '0123456789'
  });
  salesBalance = r1.salesBalance;
  assert.equal(salesBalance.availableBalance, 12000);
  assert.equal(salesBalance.reservedBalance, 8000);

  // A second request exceeding the remaining available balance must fail
  assert.throws(() => {
    requestSalesWithdrawal(salesBalance, {
      amount: 20000, bankName: 'Opay', bankCode: '999992', accountNumber: '0123456789'
    });
  }, /Insufficient available sales balance/);

  // A second request within the remaining available balance succeeds
  const r2 = requestSalesWithdrawal(salesBalance, {
    amount: 12000, bankName: 'Moniepoint', bankCode: '50515', accountNumber: '9876543210'
  });
  salesBalance = r2.salesBalance;
  assert.equal(salesBalance.availableBalance, 0);
  assert.equal(salesBalance.reservedBalance, 20000);

  // Every request gets a unique reference
  assert.notEqual(r1.withdrawalRequest.reference, r2.withdrawalRequest.reference);

  // Finalizing one payout only affects its own reservation
  const done1 = processWithdrawalTransfer(salesBalance, r1.withdrawalRequest, 'successful');
  assert.equal(done1.salesBalance.reservedBalance, 12000);
  assert.equal(done1.salesBalance.totalWithdrawals, 8000);

  // A processed request cannot be processed again
  assert.throws(() => {
    processWithdrawalTransfer(done1.salesBalance, done1.withdrawalRequest, 'successful');
  }, /already been successfully processed/);
});

test('withdrawal bank validation restricts to Opay, Moniepoint, PalmPay and enforces 10 numerical digits', () => {
  // Unsupported bank
  const invalidBank = validateWithdrawalBankAndAccount('GTBank', '0123456789');
  assert.equal(invalidBank.valid, false);
  assert.match(invalidBank.errors[0], /supported banks/);

  // Non 10-digit account number
  const shortAcc = validateWithdrawalBankAndAccount('opay', '12345');
  assert.equal(shortAcc.valid, false);
  assert.match(shortAcc.errors[0], /10 numerical digits/);

  const lettersAcc = validateWithdrawalBankAndAccount('moniepoint', '12345ABCDE');
  assert.equal(lettersAcc.valid, false);
  assert.match(lettersAcc.errors[0], /10 numerical digits/);

  // Valid bank and 10 digits
  const validOpay = validateWithdrawalBankAndAccount('999992', '0123456789');
  assert.equal(validOpay.valid, true);
  assert.equal(validOpay.bank.name, 'Opay');

  const validMoniepoint = validateWithdrawalBankAndAccount('Moniepoint', '9876543210');
  assert.equal(validMoniepoint.valid, true);
  assert.equal(validMoniepoint.bank.name, 'Moniepoint');

  const validPalmPay = validateWithdrawalBankAndAccount('palmpay', '5556667778');
  assert.equal(validPalmPay.valid, true);
  assert.equal(validPalmPay.bank.name, 'PalmPay');
});

test('duplicate sales confirmation does not release funds or credit seller multiple times', () => {
  let salesBalance = createInitialSalesBalance('seller_dual');
  salesBalance = creditSellerPendingSale(salesBalance, 8000, 'ord_99', 'REF_99').salesBalance;
  assert.equal(salesBalance.pendingBalance, 8000);
  assert.equal(salesBalance.availableBalance, 0);

  const order = {
    orderId: 'ord_99',
    orderReference: 'REF_99',
    sellerId: 'seller_dual',
    buyerId: 'buyer_dual',
    amount: 8000,
    sellerConfirmedAt: null,
    buyerConfirmedAt: '2026-11-15T00:00:00.000Z',
    status: ORDER_STATUS.PENDING
  };

  // First seller confirmation: funds released
  const firstConfirmation = processOrderConfirmation(order, 'seller', 'seller_dual');
  assert.equal(firstConfirmation.fundsReleased, true);
  salesBalance = releaseSellerPendingToAvailable(salesBalance, order.amount, order.orderId, order.orderReference).salesBalance;
  assert.equal(salesBalance.availableBalance, 8000);
  assert.equal(salesBalance.pendingBalance, 0);

  // Second seller confirmation attempt (duplicate click): already confirmed, funds NOT released again
  const secondConfirmation = processOrderConfirmation(firstConfirmation.order, 'seller', 'seller_dual');
  assert.equal(secondConfirmation.fundsReleased, false);
  assert.equal(salesBalance.availableBalance, 8000); // Unchanged
});

test('central financial ledger tracks transactions and preserves chronological status history', () => {
  let ledger = [];
  const ref = 'PSTK_TEST_001';

  // Step 1: Initial pending transaction created
  const createRes = recordFinancialTransaction(ledger, {
    reference: ref,
    userId: 'user_ledger_1',
    type: 'topup',
    amount: 5000,
    paymentMethod: 'card',
    paymentProvider: 'paystack',
    eBronStatus: 'pending',
    paystackStatus: 'pending',
    details: 'Initiated top-up via Paystack'
  });
  ledger = createRes.transactions;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].eBronStatus, 'pending');
  assert.equal(ledger[0].statusHistory.length, 1);
  assert.equal(ledger[0].statusHistory[0].status, 'pending');

  // Step 2: Paystack verification succeeds but eBron fulfillment simulated interruption
  const interruptRes = recordFinancialTransaction(ledger, {
    reference: ref,
    eBronStatus: 'requires_reconciliation',
    paystackStatus: 'success',
    errorMessage: 'Interrupted during sheet write'
  });
  ledger = interruptRes.transactions;
  assert.equal(ledger.length, 1); // Preserves same row
  assert.equal(ledger[0].eBronStatus, 'requires_reconciliation');
  assert.equal(ledger[0].paystackStatus, 'success');
  assert.equal(ledger[0].statusHistory.length, 2); // Preserves transition history
  assert.equal(ledger[0].statusHistory[1].status, 'requires_reconciliation');

  // Step 3: Admin reconciliation credits user safely without recharging
  let wallets = [{ userId: 'user_ledger_1', availableBalance: 1000 }];
  const reconcileRes = reconcileTransaction(ledger, wallets, ref);
  assert.equal(reconcileRes.reconciled, true);
  assert.equal(reconcileRes.wallet.availableBalance, 6000); // 1000 + 5000 credited
  ledger = reconcileRes.transactions;
  assert.equal(ledger[0].eBronStatus, 'completed');
  assert.equal(ledger[0].statusHistory.length, 3); // 3 transitions preserved
  assert.equal(ledger[0].statusHistory[2].status, 'completed');
});

test('bulkProcessWithdrawals processes independent withdrawal requests cleanly', () => {
  const req1 = {
    requestId: 'wdr_1',
    userId: 'u_w1',
    amount: 5000,
    status: 'pending',
    bankName: 'Opay',
    bankCode: '999992',
    accountNumber: '1122334455',
    accountName: 'User One'
  };
  const req2 = {
    requestId: 'wdr_2',
    userId: 'u_w2',
    amount: 10000,
    status: 'pending',
    bankName: 'Moniepoint',
    bankCode: '50515',
    accountNumber: '9988776655',
    accountName: 'User Two'
  };
  const req3 = {
    requestId: 'wdr_3',
    userId: 'u_w3',
    amount: 3000,
    status: 'successful', // Already processed
    bankName: 'PalmPay',
    bankCode: '999991',
    accountNumber: '5566778899',
    accountName: 'User Three'
  };

  const requests = [req1, req2, req3];
  const salesBalancesMap = {
    // Funds were already reserved when each request was submitted (available -> reserved).
    u_w1: { userId: 'u_w1', availableBalance: 0, reservedBalance: 5000, totalWithdrawals: 0 },
    u_w2: { userId: 'u_w2', availableBalance: 0, reservedBalance: 10000, totalWithdrawals: 0 }
  };
  const paystackResultsMap = {
    wdr_1: { success: true, recipientCode: 'RCP_1', transferCode: 'TRF_1' },
    wdr_2: { success: false, error: 'Insufficient Paystack balance' }
  };

  const results = bulkProcessWithdrawals(requests, 'approve', salesBalancesMap, paystackResultsMap);
  assert.equal(results.successful.length, 1);
  assert.equal(results.failed.length, 1);
  assert.equal(results.skipped.length, 1);

  // Req 1 succeeded: reservation finalized (reserved released, withdrawn total increased)
  assert.equal(results.successful[0].withdrawalRequest.status, 'successful');
  assert.equal(results.successful[0].salesBalance.reservedBalance, 0);
  assert.equal(results.successful[0].salesBalance.totalWithdrawals, 5000);
  // Req 2 failed: funds remain reserved (never lost)
  assert.equal(results.failed[0].withdrawalRequest.status, 'failed');
  assert.equal(results.failed[0].salesBalance.reservedBalance, 10000);
  assert.equal(results.failed[0].salesBalance.availableBalance, 0);
  // Req 3 was skipped
  assert.equal(results.skipped[0].requestId, 'wdr_3');
});

test('cancelling a withdrawal releases reserved funds exactly once and blocks non-cancellable states', () => {
  let salesBalance = createInitialSalesBalance('seller_cancel');
  salesBalance.availableBalance = 9000;
  salesBalance.totalEarnings = 9000;

  // Request a withdrawal -> funds move available -> reserved
  const reqRes = requestSalesWithdrawal(salesBalance, {
    amount: 4000, bankName: 'Opay', bankCode: '999992', accountNumber: '0123456789'
  });
  salesBalance = reqRes.salesBalance;
  assert.equal(salesBalance.availableBalance, 5000);
  assert.equal(salesBalance.reservedBalance, 4000);

  // Cancel -> reserved released back to available, nothing withdrawn
  const cancelled = cancelWithdrawalRequest(reqRes.withdrawalRequest, salesBalance, 'Changed my mind.');
  assert.equal(cancelled.withdrawalRequest.status, 'cancelled');
  assert.equal(cancelled.withdrawalRequest.failureReason, 'Changed my mind.');
  assert.equal(cancelled.salesBalance.availableBalance, 9000);
  assert.equal(cancelled.salesBalance.reservedBalance, 0);
  assert.equal(cancelled.salesBalance.totalWithdrawals, 0);

  // Cancelling again is idempotent: no second release, no double credit
  const again = cancelWithdrawalRequest(cancelled.withdrawalRequest, cancelled.salesBalance);
  assert.equal(again.alreadyCancelled, true);
  assert.equal(again.salesBalance.availableBalance, 9000);
  assert.equal(again.salesBalance.reservedBalance, 0);

  // A successful payout can never be cancelled
  assert.throws(() => {
    cancelWithdrawalRequest({ ...reqRes.withdrawalRequest, status: 'successful' }, salesBalance);
  }, /already been paid out/);

  // A Paystack attempt already in-flight cannot be cancelled
  assert.throws(() => {
    cancelWithdrawalRequest({ ...reqRes.withdrawalRequest, status: 'processing' }, salesBalance);
  }, /being processed/);

  // A failed request that already produced a transfer code must not be cancelled
  assert.throws(() => {
    cancelWithdrawalRequest(
      { ...reqRes.withdrawalRequest, status: 'failed', paystackTransferCode: 'TRF_LIVE' },
      salesBalance
    );
  }, /being processed/);
});

test('manual bank transfer approval requires explicit admin confirmation and never double-processes', () => {
  // Case 1: admin confirms the manual transfer -> reservation finalized exactly once
  let salesBalance = createInitialSalesBalance('seller_manual');
  salesBalance.availableBalance = 10000;
  salesBalance.totalEarnings = 10000;

  const reqRes = requestSalesWithdrawal(salesBalance, {
    amount: 6000, bankName: 'Moniepoint', bankCode: '50515', accountNumber: '9876543210'
  });
  salesBalance = reqRes.salesBalance;
  assert.equal(salesBalance.availableBalance, 4000);
  assert.equal(salesBalance.reservedBalance, 6000);

  // Manual transfer can never be marked successful without an explicit outcome
  assert.throws(() => {
    processManualWithdrawal(reqRes.withdrawalRequest, salesBalance, {});
  }, /Select a manual transfer outcome/);

  const confirmed = processManualWithdrawal(reqRes.withdrawalRequest, salesBalance, {
    action: 'confirmed', adminId: 'admin_2'
  });
  assert.equal(confirmed.withdrawalRequest.status, 'successful');
  assert.equal(confirmed.withdrawalRequest.paymentMethod, WITHDRAWAL_PAYMENT_METHOD.MANUAL_BANK_TRANSFER);
  assert.equal(confirmed.withdrawalRequest.manualConfirmedBy, 'admin_2');
  assert.ok(confirmed.withdrawalRequest.manualConfirmedAt);
  assert.equal(confirmed.salesBalance.availableBalance, 4000);
  assert.equal(confirmed.salesBalance.reservedBalance, 0);
  assert.equal(confirmed.salesBalance.totalWithdrawals, 6000);

  // Duplicate confirmation must be rejected (no second deduction)
  assert.throws(() => {
    processManualWithdrawal(confirmed.withdrawalRequest, confirmed.salesBalance, { action: 'confirmed', adminId: 'admin_2' });
  }, /already been successfully processed/);
  assert.equal(confirmed.salesBalance.totalWithdrawals, 6000);

  // A closed (cancelled/rejected) request cannot be processed manually
  assert.throws(() => {
    processManualWithdrawal({ ...reqRes.withdrawalRequest, status: 'cancelled' }, salesBalance, { action: 'confirmed' });
  }, /closed and cannot be processed/);

  // Case 2: admin reports the manual transfer as failed -> reservation released, reason saved
  let sb2 = createInitialSalesBalance('seller_manual2');
  sb2.availableBalance = 5000;
  const r2 = requestSalesWithdrawal(sb2, {
    amount: 5000, bankName: 'Opay', bankCode: '999992', accountNumber: '1122334455'
  });
  sb2 = r2.salesBalance;
  assert.equal(sb2.availableBalance, 0);
  assert.equal(sb2.reservedBalance, 5000);

  // A failure report must include an explanation
  assert.throws(() => {
    processManualWithdrawal(r2.withdrawalRequest, sb2, { action: 'failed' });
  }, /failure explanation is required/);

  const failed = processManualWithdrawal(r2.withdrawalRequest, sb2, {
    action: 'failed', adminId: 'admin_1', failureReason: 'Wrong account number'
  });
  assert.equal(failed.withdrawalRequest.status, 'failed');
  assert.equal(failed.withdrawalRequest.paymentMethod, WITHDRAWAL_PAYMENT_METHOD.MANUAL_BANK_TRANSFER);
  assert.equal(failed.withdrawalRequest.failureReason, 'Wrong account number');
  assert.equal(failed.withdrawalRequest.adminId, 'admin_1');
  assert.equal(failed.salesBalance.availableBalance, 5000);
  assert.equal(failed.salesBalance.reservedBalance, 0);
  assert.equal(failed.salesBalance.totalWithdrawals, 0);
});

test('account deactivation restricts user actions and appeal flow handles validation and duplicate checks', () => {
  const activeUser = { userId: 'u_act', status: USER_STATUS.ACTIVE };
  const deactivatedUser = { userId: 'u_deact', status: USER_STATUS.DEACTIVATED };

  assert.equal(checkAccountActive(activeUser).allowed, true);
  const deactCheck = checkAccountActive(deactivatedUser);
  assert.equal(deactCheck.allowed, false);
  assert.match(deactCheck.error, /deactivated/);

  // Appeal validation: minimum explanation length
  const shortAppeal = validateAppeal(deactivatedUser, 'Too short');
  assert.equal(shortAppeal.valid, false);
  assert.match(shortAppeal.errors[0], /at least 10 characters/);

  // Valid appeal
  const validAppeal = validateAppeal(deactivatedUser, 'I understand the policy and request account reactivation.');
  assert.equal(validAppeal.valid, true);

  // Prevent duplicate pending appeals
  const existingAppeals = [{ userId: 'u_deact', status: 'pending' }];
  const dupAppeal = validateAppeal(deactivatedUser, 'Another appeal explanation here.', existingAppeals);
  assert.equal(dupAppeal.valid, false);
  assert.match(dupAppeal.errors[0], /already have a pending appeal/);
});
