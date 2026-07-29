import { test, expect } from '@playwright/test';

test.describe('Admin login flow', () => {
  test('admin page loads login form', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page).toHaveTitle(/Bienenhaus Admin/i);
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#adminEmail')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#adminPassword')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#btnLogin')).toBeVisible({ timeout: 5000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 10000 });
    const emailInput = page.locator('#loginForm input[name="email"]').first();
    const passwordInput = page.locator('#loginForm input[name="password"]').first();
    const submitBtn = page.locator('#loginForm button[type="submit"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('wrongpassword');
    await submitBtn.click();
    // Check for error message text content - the element gets populated after error
    const errorDiv = page.locator('#loginError');
    await expect(errorDiv).not.toBeEmpty({ timeout: 5000 });
    await expect(errorDiv).toContainText(/error|incorrect|inválido|credenciales/i, { timeout: 5000 });
  });
});

test.describe('Admin navigation', () => {
  test('admin page has main sections after login', async ({ page }) => {
    await page.goto('/admin.html');
    await page.fill('#loginForm input[name="email"]', 'admin@bienenhaus.com.ar');
    await page.fill('#loginForm input[name="password"]', 'demo123456');
    await page.click('#loginForm button[type="submit"]');
    await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
    // Header is dashboard-header, not admin-header
    await expect(page.locator('.dashboard-header')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.nav-link[data-section="dashboard"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.nav-link[data-section="properties"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.nav-link[data-section="agents"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin properties', () => {
  test('properties list loads', async ({ page }) => {
    await page.goto('/admin.html');
    await page.fill('#loginForm input[name="email"]', 'admin@bienenhaus.com.ar');
    await page.fill('#loginForm input[name="password"]', 'demo123456');
    await page.click('#loginForm button[type="submit"]');
    await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 20000 });
    await page.click('.nav-link[data-section="properties"]');
    // The section has hidden attribute, not hidden=""
    await expect(page.locator('#section-properties')).not.toHaveAttribute('hidden', { timeout: 15000 });
    await expect(page.locator('#propertiesTableBody, #propertiesTable')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Contact section', () => {
  test('contact section is present on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(3000);
    const whatsappBtn = page.locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float, .floating-buttons a').first();
    await expect(whatsappBtn).toBeVisible({ timeout: 15000 });
  });
});