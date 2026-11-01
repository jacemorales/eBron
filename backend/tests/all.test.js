import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS_SCHEMA } from '../Setup.js';
import { validateRegistrationData } from '../Auth.js';
import { validateProductData } from '../Products.js';

test('database schema is valid', () => {
  assert.ok(SHEETS_SCHEMA.Users);
  assert.ok(SHEETS_SCHEMA.Products);
});

test('auth validates CU email', () => {
  const res = validateRegistrationData({
    fullName: 'David Oyedepo',
    regNumber: '21AB0123',
    matricNumber: 'CU/21/0123',
    schoolEmail: 'david.oyedepo@stu.cu.edu.ng',
    gender: 'Male',
    hallOfResidence: 'Peter',
    roomNumber: 'A102',
    password: 'password123'
  });
  assert.equal(res.valid, true);
});
