import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows main content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bienenhaus/i);
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('hero section is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero, [class*="hero"], section').first()).toBeVisible();
  });

  test('footer is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('Property catalog', () => {
  test('catalog section loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#catalogo, [class*="catalogo"], [class*="propert"]').first()).toBeVisible();
  });
});

test.describe('Contact section', () => {
  test('contact section is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contacto, [class*="contacto"], [id*="contact"]').first()).toBeVisible();
  });
});
