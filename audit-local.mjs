import { chromium } from 'playwright';

async function auditLocal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('🌐 Navegando a http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check for errors in console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });

  // Screenshot
  await page.screenshot({ path: 'local-audit-desktop.png', fullPage: true });
  console.log('📸 Captura guardada: local-audit-desktop.png');

  // Check if hero is rendered
  const heroPlaceholder = await page.locator('#hero-placeholder').count();
  const hero = await page.locator('.hero, #hero').count();
  console.log(`\n🔍 Hero placeholder: ${heroPlaceholder}`);
  console.log(`🔍 Hero element: ${hero}`);

  // Check search bar
  const searchPlaceholder = await page.locator('#search-bar-placeholder').count();
  const searchBar = await page.locator('.search-bar').count();
  console.log(`Search placeholder: ${searchPlaceholder}`);
  console.log(`Search bar element: ${searchBar}`);

  // Check property grid
  const gridPlaceholder = await page.locator('#gridPropiedades').count();
  const propertyCards = await page.locator('.property-card').count();
  console.log(`Grid placeholder: ${gridPlaceholder}`);
  console.log(`Property cards: ${propertyCards}`);

  // Check footer
  const footerPlaceholder = await page.locator('#footer-placeholder').count();
  const footer = await page.locator('.footer').count();
  console.log(`Footer placeholder: ${footerPlaceholder}`);
  console.log(`Footer element: ${footer}`);

  // Check for network errors
  const failedRequests = [];
  page.on('response', response => {
    if (!response.ok()) {
      failedRequests.push({ url: response.url(), status: response.status() });
    }
  });

  await page.waitForTimeout(2000);
  
  console.log('\n📡 Failed requests:');
  for (const req of failedRequests) {
    console.log(`  ${req.status} ${req.url}`);
  }

  // Get computed styles of body
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      opacity: computed.opacity,
      visibility: computed.visibility,
      display: computed.display
    };
  });
  console.log('\n🎨 Body computed styles:', bodyStyles);

  // Check for any overlay that might cause "cloudy" effect
  const overlays = await page.locator('.spinner-overlay, .modal-overlay, [class*="overlay"], [class*="backdrop"]').all();
  console.log(`\n☁️ Overlays encontrados: ${overlays.length}`);
  for (const overlay of overlays) {
    const visible = await overlay.isVisible();
    const styles = await overlay.evaluate(el => {
      const c = window.getComputedStyle(el);
      return { 
        display: c.display, 
        visibility: c.visibility, 
        opacity: c.opacity,
        background: c.backgroundColor,
        zIndex: c.zIndex
      };
    });
    console.log(`  Visible: ${visible}, Styles:`, styles);
  }

  // Check if CSS variables are resolving
  const cssVars = await page.evaluate(() => {
    const root = document.documentElement;
    const computed = window.getComputedStyle(root);
    return {
      '--color-gray-50': computed.getPropertyValue('--color-gray-50'),
      '--color-primary': computed.getPropertyValue('--color-primary'),
      '--color-gray-900': computed.getPropertyValue('--color-gray-900'),
      '--color-accent': computed.getPropertyValue('--color-accent')
    };
  });
  console.log('\n🎨 CSS Variables en :root:', cssVars);

  await browser.close();
  console.log('\n✅ Auditoría local completada');
}

auditLocal().catch(console.error);