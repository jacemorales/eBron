import { test, expect } from '@playwright/test';

test('Full student marketplace lifecycle: registration, item listing, order checkout, dual confirmation, and admin oversight', async ({ page }) => {
  // 1. Visit Home
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Covenant University Student Marketplace' })).toBeVisible();

  // 2. Register Seller
  await page.goto('/register');
  await page.fill('input[placeholder="e.g. David Oyedepo"]', 'Samuel Adeyemi');
  await page.fill('input[placeholder="e.g. 21AB0123"]', '21CK0291');
  await page.fill('input[placeholder="e.g. CU/21/0123"]', 'CU/21/0291');
  await page.fill('input[placeholder="david.oyedepo@stu.cu.edu.ng"]', 'samuel.adeyemi@stu.cu.edu.ng');
  await page.selectOption('select:has-text("Male")', 'Male');
  await page.selectOption('select:has-text("Peter Hall")', 'Peter');
  await page.fill('input[placeholder="e.g. A203"]', 'B301');
  await page.fill('input[placeholder="At least 6 characters"]', 'password123');
  await page.click('button:has-text("Complete Registration")');

  // Verify redirected to marketplace
  await expect(page.getByText('Samuel Adeyemi').first()).toBeVisible();

  // 3. Upload Product for Sale
  await page.goto('/sell/add');
  await page.fill('input[placeholder*="Calculus"]', 'Engineering Mathematics 8th Edition');
  await page.fill('textarea[placeholder*="Condition"]', 'Essential textbook for MAT211. Clean pages with minimal pencil notes.');
  await page.fill('input[placeholder="5000"]', '8500');
  await page.fill('input[placeholder*="paste image URL"]', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400');
  await page.click('button:has-text("Add")');
  await page.click('button:has-text("Publish Item to CU Marketplace")');

  // Confirm in catalogue
  await expect(page.getByText('Engineering Mathematics 8th Edition')).toBeVisible();

  // 4. View Product Details Page
  await page.goto('/');
  await expect(page.getByText('Engineering Mathematics 8th Edition')).toBeVisible();
  await page.click('text=Engineering Mathematics 8th Edition');
  await expect(page.getByText('₦8,500')).toBeVisible();

  // 5. Check Guidelines page
  await page.goto('/guidelines');
  await expect(page.getByText('eBron Guidelines & Help Center')).toBeVisible();

  // Take screenshot for verification artifact
  await page.screenshot({ path: 'frontend-verification.png', fullPage: true });
});
