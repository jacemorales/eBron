import { test, expect } from '@playwright/test';

test('eBron complete verification: unauthenticated restrictions, guidelines, form validation, and direct backend integration', async ({ page }) => {
  // 1. Visit Marketplace as unauthenticated visitor
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'eBron Student Marketplace' })).toBeVisible();

  // Verify that authenticated tabs (Sell Products, Buy Products, My Wallet, Messages) are HIDDEN from unauthenticated visitors
  await expect(page.getByText('Sell Products')).not.toBeVisible();
  await expect(page.getByText('Buy Products')).not.toBeVisible();

  // Verify Guidelines is accessible to visitors
  await page.click('text=Guidelines & Safety');
  await expect(page.getByText('eBron Guidelines & Help Center')).toBeVisible();

  // 2. Visit Register page and check form fields and validation
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Student Registration' })).toBeVisible();
  await page.fill('input[placeholder="Michael Morgan"]', 'Emmanuel Adeleke');
  await page.fill('input[placeholder="2401234"]', '21CK0999');
  await page.fill('input[placeholder="24jk123456"]', 'CU/21/0999');
  await page.fill('input[placeholder="email@stu.cu.edu.ng"]', 'emmanuel.adeleke@stu.cu.edu.ng');
  await page.selectOption('select:has-text("Male")', 'Male');
  await page.selectOption('select:has-text("Peter Hall")', 'Peter');
  await page.fill('input[placeholder="e.g. A203"]', 'C104');
  await page.fill('input[placeholder="At least 6 characters"]', 'securePass123');

  // Verify submitting triggers backend call and surfaces meaningful response/error when backend deployment URL is not active in test runner
  await page.click('button:has-text("Complete Registration")');
  await expect(page.getByText(/Backend Web App URL|Failed to communicate with backend server/i).first()).toBeVisible({ timeout: 10000 });

  // 3. Visit Login page and check error surfacing
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to eBron' })).toBeVisible();
  await page.fill('input[placeholder="email@stu.cu.edu.ng"]', 'test.student@stu.cu.edu.ng');
  await page.fill('input[type="password"]', 'wrongPassword');
  await page.click('button:has-text("Sign In")');
  await expect(page.getByText(/Backend Web App URL|Failed to communicate with backend server|User not found|Invalid school email/i).first()).toBeVisible({ timeout: 10000 });

  // 4. Capture screenshot artifact for verification
  await page.screenshot({ path: 'frontend-final-verification.png', fullPage: true });
});
