import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS_SCHEMA } from '../Setup.js';
import { validateRegistrationData } from '../Auth.js';
import { validateProductData, validateProductReport } from '../Products.js';
import { validateOrderCreation, processOrderConfirmation } from '../Orders.js';
import { topUpAvailableBalance, deductAvailableBalance } from '../Wallet.js';

test('database schema is valid', () => {
  assert.ok(SHEETS_SCHEMA.Users);
  assert.ok(SHEETS_SCHEMA.Products);
  assert.ok(SHEETS_SCHEMA.Wallets);
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

test('wallet top up and deduction functions work correctly', () => {
  let wallet = { userId: 'u1', availableBalance: 1000 };
  wallet = topUpAvailableBalance(wallet, 5000);
  assert.equal(wallet.availableBalance, 6000);

  wallet = deductAvailableBalance(wallet, 2500);
  assert.equal(wallet.availableBalance, 3500);

  assert.throws(() => {
    deductAvailableBalance(wallet, 10000);
  }, /Insufficient wallet balance/);
});

test('order creation validates sufficient wallet balance', () => {
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
