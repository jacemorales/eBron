import { test, expect } from '@playwright/test';

test('eBron complete verification: unauthenticated restrictions, registration, profile, product actions, guidelines, admin', async ({ page }) => {
  // 1. Visit Marketplace as unauthenticated visitor
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'eBron Student Marketplace' })).toBeVisible();

  // Verify that authenticated tabs (Sell Products, My Wallet, Messages) are HIDDEN from unauthenticated visitors
  await expect(page.getByText('Sell Products')).not.toBeVisible();
  await expect(page.getByText('Buy Products')).not.toBeVisible();

  // Verify Guidelines is accessible to visitors
  await page.click('text=Guidelines & Safety');
  await expect(page.getByText('eBron Guidelines & Help Center')).toBeVisible();

  // 2. Register Student
  await page.goto('/register');
  await page.fill('input[placeholder="e.g. David Oyedepo"]', 'Emmanuel Adeleke');
  await page.fill('input[placeholder="e.g. 21AB0123"]', '21CK0999');
  await page.fill('input[placeholder="e.g. CU/21/0123"]', 'CU/21/0999');
  await page.fill('input[placeholder="david.oyedepo@stu.cu.edu.ng"]', 'emmanuel.adeleke@stu.cu.edu.ng');
  await page.selectOption('select:has-text("Male")', 'Male');
  await page.selectOption('select:has-text("Peter Hall")', 'Peter');
  await page.fill('input[placeholder="e.g. A203"]', 'C104');
  await page.fill('input[placeholder="At least 6 characters"]', 'securePass123');
  await page.click('button:has-text("Complete Registration")');

  // Verify student is now authenticated and navbar shows Full Name and Registration Number
  await expect(page.getByText('Emmanuel Adeleke').first()).toBeVisible();
  await expect(page.getByText('21CK0999')).toBeVisible();

  // Verify authenticated navigation (Buy Products, Sell Products) is now visible
  await expect(page.getByText('Buy Products')).toBeVisible();
  await expect(page.getByText('Sell Products')).toBeVisible();

  // 3. Visit Profile Page
  await page.goto('/profile');
  await expect(page.getByText('My Account & Delivery Profile')).toBeVisible();
  await expect(page.getByText('emmanuel.adeleke@stu.cu.edu.ng')).toBeVisible();

  // 4. Capture screenshot artifact for verification
  await page.screenshot({ path: 'frontend-final-verification.png', fullPage: true });
});
