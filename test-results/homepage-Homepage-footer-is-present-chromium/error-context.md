# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homepage.spec.ts >> Homepage >> footer is present
- Location: e2e\homepage.spec.ts:29:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('footer, .footer, [class*="footer"]').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('footer, .footer, [class*="footer"]').first()

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Homepage', () => {
  4  |   test('loads and shows main content', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await expect(page).toHaveTitle(/Bienenhaus/i);
  7  |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  8  |     await page.waitForTimeout(3000);
  9  |   });
  10 | 
  11 |   test('has navigation links', async ({ page }) => {
  12 |     await page.goto('/');
  13 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  14 |     await page.waitForTimeout(3000);
  15 |     // Check for navigation - look for links in the nav
  16 |     const navLinks = page.locator('header a, nav a, .ds-header a').filter({ hasText: /Propiedades|Agentes|Contacto|Nosotros/i });
  17 |     await expect(navLinks.first()).toBeVisible({ timeout: 15000 });
  18 |   });
  19 | 
  20 |   test('hero section is visible', async ({ page }) => {
  21 |     await page.goto('/');
  22 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  23 |     await page.waitForTimeout(4000);
  24 |     // Look for hero content - h1 with "próximo hogar" or similar
  25 |     const heroText = page.locator('h1').filter({ hasText: /próximo|hogar|Córdoba/i }).first();
  26 |     await expect(heroText).toBeVisible({ timeout: 15000 });
  27 |   });
  28 | 
  29 |   test('footer is present', async ({ page }) => {
  30 |     await page.goto('/');
  31 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  32 |     await page.waitForTimeout(3000);
  33 |     // Check for footer or copyright text
  34 |     const footerText = page.locator('footer, .footer, [class*="footer"]').first();
> 35 |     await expect(footerText).toBeVisible({ timeout: 15000 });
     |                              ^ Error: expect(locator).toBeVisible() failed
  36 |   });
  37 | });
  38 | 
  39 | test.describe('Property catalog', () => {
  40 |   test('catalog section loads', async ({ page }) => {
  41 |     await page.goto('/');
  42 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  43 |     await page.waitForTimeout(5000);
  44 |     // Look for property cards or grid
  45 |     const propertyCards = page.locator('[class*="property"], [class*="card"], [class*="property"]').first();
  46 |     await expect(propertyCards).toBeVisible({ timeout: 20000 });
  47 |   });
  48 | });
  49 | 
  50 | test.describe('Contact section', () => {
  51 |   test('contact section is present on homepage', async ({ page }) => {
  52 |     await page.goto('/');
  53 |     await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
  54 |     await page.waitForTimeout(3000);
  55 |     // Check for WhatsApp button or contact form
  56 |     const whatsappBtn = page.locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float').first();
  57 |     await expect(whatsappBtn).toBeVisible({ timeout: 15000 });
  58 |   });
  59 | });
```