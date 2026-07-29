# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Contact section >> contact section is present on homepage
- Location: e2e\admin.spec.ts:64:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float, .floating-buttons a').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float, .floating-buttons a').first()

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Admin login flow', () => {
  4  |   test('admin page loads login form', async ({ page }) => {
  5  |     await page.goto('/admin.html');
  6  |     await expect(page).toHaveTitle(/Bienenhaus Admin/i);
  7  |     await expect(page.locator('#loginView')).toBeVisible({ timeout: 10000 });
  8  |     await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
  9  |     await expect(page.locator('#adminEmail')).toBeVisible({ timeout: 5000 });
  10 |     await expect(page.locator('#adminPassword')).toBeVisible({ timeout: 5000 });
  11 |     await expect(page.locator('#btnLogin')).toBeVisible({ timeout: 5000 });
  12 |   });
  13 | 
  14 |   test('shows error on invalid credentials', async ({ page }) => {
  15 |     await page.goto('/admin.html');
  16 |     await expect(page.locator('#loginView')).toBeVisible({ timeout: 10000 });
  17 |     const emailInput = page.locator('#loginForm input[name="email"]').first();
  18 |     const passwordInput = page.locator('#loginForm input[name="password"]').first();
  19 |     const submitBtn = page.locator('#loginForm button[type="submit"]').first();
  20 |     await expect(emailInput).toBeVisible({ timeout: 5000 });
  21 |     await expect(passwordInput).toBeVisible({ timeout: 5000 });
  22 |     await emailInput.fill('wrong@example.com');
  23 |     await passwordInput.fill('wrongpassword');
  24 |     await submitBtn.click();
  25 |     // Check for error message text content - the element gets populated after error
  26 |     const errorDiv = page.locator('#loginError');
  27 |     await expect(errorDiv).not.toBeEmpty({ timeout: 5000 });
  28 |     await expect(errorDiv).toContainText(/error|incorrect|inválido|credenciales/i, { timeout: 5000 });
  29 |   });
  30 | });
  31 | 
  32 | test.describe('Admin navigation', () => {
  33 |   test('admin page has main sections after login', async ({ page }) => {
  34 |     await page.goto('/admin.html');
  35 |     await page.fill('#loginForm input[name="email"]', 'admin@bienenhaus.com.ar');
  36 |     await page.fill('#loginForm input[name="password"]', 'demo123456');
  37 |     await page.click('#loginForm button[type="submit"]');
  38 |     await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 20000 });
  39 |     await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
  40 |     // Header is dashboard-header, not admin-header
  41 |     await expect(page.locator('.dashboard-header')).toBeVisible({ timeout: 5000 });
  42 |     await expect(page.locator('#mainContent')).toBeVisible({ timeout: 5000 });
  43 |     await expect(page.locator('.nav-link[data-section="dashboard"]')).toBeVisible({ timeout: 5000 });
  44 |     await expect(page.locator('.nav-link[data-section="properties"]')).toBeVisible({ timeout: 5000 });
  45 |     await expect(page.locator('.nav-link[data-section="agents"]')).toBeVisible({ timeout: 5000 });
  46 |   });
  47 | });
  48 | 
  49 | test.describe('Admin properties', () => {
  50 |   test('properties list loads', async ({ page }) => {
  51 |     await page.goto('/admin.html');
  52 |     await page.fill('#loginForm input[name="email"]', 'admin@bienenhaus.com.ar');
  53 |     await page.fill('#loginForm input[name="password"]', 'demo123456');
  54 |     await page.click('#loginForm button[type="submit"]');
  55 |     await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 20000 });
  56 |     await page.click('.nav-link[data-section="properties"]');
  57 |     // The section has hidden attribute, not hidden=""
  58 |     await expect(page.locator('#section-properties')).not.toHaveAttribute('hidden', { timeout: 15000 });
  59 |     await expect(page.locator('#propertiesTableBody, #propertiesTable')).toBeVisible({ timeout: 15000 });
  60 |   });
  61 | });
  62 | 
  63 | test.describe('Contact section', () => {
  64 |   test('contact section is present on homepage', async ({ page }) => {
  65 |     await page.goto('/');
  66 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  67 |     await page.waitForTimeout(3000);
  68 |     const whatsappBtn = page.locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float, .floating-buttons a').first();
> 69 |     await expect(whatsappBtn).toBeVisible({ timeout: 15000 });
     |                               ^ Error: expect(locator).toBeVisible() failed
  70 |   });
  71 | });
```