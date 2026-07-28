import { test, expect } from '@playwright/test';

test.describe('Admin login flow', () => {
  test('admin page loads login form', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page).toHaveTitle(/Admin/i);
  });

  test('shows login form elements', async ({ page }) => {
    await page.goto('/admin.html');
    const emailInput = page.locator('input[type="email"], input#loginEmail, input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input#loginPassword, input[name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/admin.html');
    const emailInput = page.locator('input[type="email"], input#loginEmail, input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input#loginPassword, input[name="password"]');
    const submitBtn = page.locator('button[type="submit"], #loginBtn, button:has-text("Iniciar")');

    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('wrongpassword');
    await submitBtn.click();

    await expect(page.locator('.error, [class*="error"], [role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin navigation', () => {
  test('admin page has main sections', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page.locator('#dashboard, [class*="dashboard"]')).toBeVisible();
  });
});
