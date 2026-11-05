import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS_SCHEMA } from '../Setup.js';
import { validateRegistrationData } from '../Auth.js';
import { validateProductData, validateProductReport } from '../Products.js';
import { validateOrderCreation, processOrderConfirmation } from '../Orders.js';
import {
  createInitialBuyerWallet,
  topUpBuyerWallet,
  deductBuyerWallet,
  createInitialSalesBalance,
  creditSellerPendingSale,
  releaseSellerPendingToAvailable,
  requestSalesWithdrawal
} from '../Wallet.js';

test('database schema includes separated wallets, transactions and notifications', () => {
  assert.ok(SHEETS_SCHEMA.Users);
  assert.ok(SHEETS_SCHEMA.Products);
  assert.ok(SHEETS_SCHEMA.Wallets);
  assert.ok(SHEETS_SCHEMA.WalletTransactions);
  assert.ok(SHEETS_SCHEMA.SalesBalances);
  assert.ok(SHEETS_SCHEMA.SalesTransactions);
  assert.ok(SHEETS_SCHEMA.Notifications);
  assert.ok(SHEETS_SCHEMA.NotificationSubscriptions);
  assert.ok(SHEETS_SCHEMA.Reports);
  assert.ok(SHEETS_SCHEMA.Products.includes('stockNumber'));
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
      bankName: 'GTBank',
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

  // Now withdrawal should succeed
  const withdrawalResult = requestSalesWithdrawal(salesBalance, {
    amount: 3000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Seller Name'
  });
  salesBalance = withdrawalResult.salesBalance;
  assert.equal(salesBalance.availableBalance, 2000);
  assert.equal(salesBalance.totalWithdrawals, 3000);
  assert.equal(withdrawalResult.withdrawalRequest.amount, 3000);
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
