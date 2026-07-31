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

test.describe('Encoding / charset', () => {
  test('title and meta description have no mojibake (UTF-8 double-encoding)', async ({ page }) => {
    await page.goto('/');
    // The <title> should read "Bienenhaus · Propiedades en Córdoba" — no Ã, Â, mojibake
    const title = await page.title();
    expect(title).not.toMatch(/[ÃÂ]/);
    expect(title).toContain('Córdoba');

    // og:title and twitter:title meta tags also clean
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).not.toMatch(/[ÃÂ]/);
    expect(ogTitle).toContain('Córdoba');

    // meta description clean
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).not.toMatch(/[ÃÂ]/);
    expect(metaDesc).toContain('Córdoba');
  });

  test('static section content (Quiénes Somos / Servicios) has proper accents', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // Sanity: static text should contain proper Spanish accented chars somewhere
    const bodyText = await page.locator('section#nosotros').textContent();
    expect(bodyText).toContain('Más de 15 años');
    expect(bodyText).toContain('Córdoba');
    // No mojibake anywhere in the rendered static body
    const fullBody = await page.locator('body').textContent();
    expect(fullBody).not.toMatch(/[ÃÂ]/);
  });
});

test.describe('Admin markup leak', () => {
  test('public page does not contain admin modal IDs (#agentModal, #propertyModal, #confirmModal)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // The admin modals (with IDs) used to leak into index.html — they should not be present
    await expect(page.locator('#agentModal')).toHaveCount(0);
    await expect(page.locator('#propertyModal')).toHaveCount(0);
    await expect(page.locator('#confirmModal')).toHaveCount(0);
  });

  test('public page does not contain admin form fields (#agentForm, #agentName, #agentAvatarBtn, etc.)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // The agent creation form (admin-only) was leaking into public HTML
    await expect(page.locator('#agentForm')).toHaveCount(0);
    await expect(page.locator('#agentName')).toHaveCount(0);
    await expect(page.locator('#agentSurname')).toHaveCount(0);
    await expect(page.locator('#agentEmail')).toHaveCount(0);
    await expect(page.locator('#agentAvatarUpload')).toHaveCount(0);
  });

  test('public page does not contain admin button text "Guardar Agente"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // Button text "Guardar Agente" should not appear on the public page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Guardar Agente');
    expect(bodyText).not.toContain('Nuevo Agente');
  });
});

test.describe('Property catalog', () => {
  test('catalog section loads with grid container', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // The grid container must exist (replaces the old admin table)
    const gridContainer = page.locator('#gridPropiedades');
    await expect(gridContainer).toBeVisible({ timeout: 15000 });
    // The old admin table should NOT be present on the public page
    await expect(page.locator('#propertiesTable')).toHaveCount(0);
    await expect(page.locator('#propertiesTableBody')).toHaveCount(0);
  });

  test('shows skeleton loading state on initial load', async ({ page }) => {
    // Capture the very first paint — use 'commit' to see static HTML before JS hydrates
    await page.goto('/', { waitUntil: 'commit' });
    // Wait for skeleton to appear in DOM (it's in static HTML)
    const skeleton = page.locator('#gridPropiedades .skeleton-card').first();
    // First check it exists in DOM, then visibility
    await expect(skeleton).toHaveCount(1, { timeout: 3000 });
    await expect(skeleton).toBeVisible({ timeout: 3000 });
  });

  test('catalog eventually replaces skeleton with content or empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // Wait for JS to replace the skeleton — either cards appear, empty state, or error state
    const content = page.locator(
      '#gridPropiedades .property-card, #gridPropiedades .empty-state'
    ).first();
    await expect(content).toBeVisible({ timeout: 20000 });
    // Skeleton should be gone after content loads
    await expect(page.locator('#gridPropiedades .skeleton-card')).toHaveCount(0);
  });

  test('error state shows retry button when fetch fails', async ({ page }) => {
    // Block Supabase requests to force an error
    await page.route('**/rest/v1/**', (route) => route.abort());
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // Should eventually show error state with retry button
    const retryButton = page.locator('#gridPropiedades button:has-text("Reintentar")');
    await expect(retryButton).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Team / Agents section', () => {
  test('agents section loads with skeleton placeholder', async ({ page }) => {
    // Use networkidle to ensure initial HTML is loaded, then check skeleton before JS replaces it
    await page.goto('/', { waitUntil: 'commit' });
    // Give a tiny moment for the skeleton to be rendered before JS replaces it
    await page.waitForTimeout(100);
    const skeleton = page.locator('#agentsGrid .skeleton-card').first();
    await expect(skeleton).toBeVisible({ timeout: 5000 });
    // aria-busy should be true initially
    const grid = page.locator('#agentsGrid');
    await expect(grid).toHaveAttribute('aria-busy', 'true');
  });

  test('agents section eventually replaces skeleton with cards, empty, or error state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // After JS loads, skeleton should be replaced by agent cards, empty state, or error
    const content = page.locator(
      '#agentsGrid .agent-card:not(.skeleton-card), #agentsGrid .empty-state'
    ).first();
    await expect(content).toBeVisible({ timeout: 20000 });
    // Skeleton should be gone
    await expect(page.locator('#agentsGrid .skeleton-card')).toHaveCount(0);
    // aria-busy should be cleared after content loads
    await expect(page.locator('#agentsGrid')).not.toHaveAttribute('aria-busy', 'true');
  });

  test('agents error state shows retry button when fetch fails', async ({ page }) => {
    // Block Supabase requests to force an error
    await page.route('**/rest/v1/**', (route) => route.abort());
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // Should show error state with retry button inside agents grid
    const retryButton = page.locator('#agentsGrid button:has-text("Reintentar")');
    await expect(retryButton).toBeVisible({ timeout: 20000 });
  });
});

test.describe('FAQ section', () => {
  test('shows skeleton loading state on initial load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // The skeleton exists in static HTML but gets hidden by JS quickly
    // Check it exists in DOM (even if hidden) as proof static HTML has skeleton
    const skeleton = page.locator('#faqGrid .faq-skeleton').first();
    await expect(skeleton).toHaveCount(1);
    // aria-busy should be true initially
    await expect(page.locator('#faqGrid')).toHaveAttribute('aria-busy', 'true');
  });

  test('skeleton is replaced with FAQ items or empty state on success', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // Either FAQ items (.faq-item:not(.faq-skeleton)) or empty state should appear
    const content = page.locator(
      '#faqGrid .faq-item:not(.faq-skeleton), #faqGrid .empty-state'
    ).first();
    await expect(content).toBeVisible({ timeout: 20000 });
    // Skeleton should be gone
    await expect(page.locator('#faqGrid .faq-skeleton')).toHaveCount(0);
    // aria-busy should be cleared
    await expect(page.locator('#faqGrid')).not.toHaveAttribute('aria-busy', 'true');
  });

  test('shows error state instead of hanging skeleton when fetch fails', async ({ page }) => {
    // Block Supabase to force cargarContenidoSitio to fail
    await page.route('**/rest/v1/**', (route) => route.abort());
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 });
    // Skeleton should NOT hang forever — replaced with error state
    const errorState = page.locator('#faqGrid .empty-state[role="alert"]');
    await expect(errorState).toBeVisible({ timeout: 20000 });
    // Skeleton should be gone
    await expect(page.locator('#faqGrid .faq-skeleton')).toHaveCount(0);
    // aria-busy should be cleared
    await expect(page.locator('#faqGrid')).not.toHaveAttribute('aria-busy', 'true');
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