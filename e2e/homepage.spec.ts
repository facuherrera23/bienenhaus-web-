import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows main content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bienenhaus/i);
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(3000);
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(3000);
    // Check for navigation - look for links in the nav
    const navLinks = page.locator('header a, nav a, .ds-header a').filter({ hasText: /Propiedades|Agentes|Contacto|Nosotros/i });
    await expect(navLinks.first()).toBeVisible({ timeout: 15000 });
  });

  test('hero section is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(4000);
    // Look for hero content - h1 with "próximo hogar" or similar
    const heroText = page.locator('h1').filter({ hasText: /próximo|hogar|Córdoba/i }).first();
    await expect(heroText).toBeVisible({ timeout: 15000 });
  });

  test('footer is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(3000);
    // Check for footer or copyright text
    const footerText = page.locator('footer, .footer, [class*="footer"]').first();
    await expect(footerText).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Property catalog', () => {
  test('catalog section loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(5000);
    // Look for property cards or grid
    const propertyCards = page.locator('[class*="property"], [class*="card"], [class*="property"]').first();
    await expect(propertyCards).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Contact section', () => {
  test('contact section is present on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(3000);
    // Check for WhatsApp button or contact form
    const whatsappBtn = page.locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), .whatsapp-float').first();
    await expect(whatsappBtn).toBeVisible({ timeout: 15000 });
  });
});