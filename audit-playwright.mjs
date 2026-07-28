import { chromium } from 'playwright';

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  console.log('🌐 Navegando a https://bienenhaus.com.ar...');
  await page.goto('https://bienenhaus.com.ar', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Desktop screenshot
  await page.screenshot({ path: 'audit-desktop.png', fullPage: true });
  console.log('📸 Captura desktop guardada: audit-desktop.png');

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit-mobile.png', fullPage: true });
  console.log('📸 Captura mobile guardada: audit-mobile.png');

  // 1. Navigation structure
  console.log('\n📋 ESTRUCTURA DE NAVEGACIÓN:');
  const navItems = await page.locator('header a, nav a, .header-nav a, .nav a').all();
  for (const item of navItems) {
    const text = await item.textContent();
    const href = await item.getAttribute('href');
    if (text?.trim()) console.log(`  - ${text.trim()} → ${href}`);
  }

  // 2. Footer structure
  console.log('\n🦶 FOOTER:');
  const footerLinks = await page.locator('footer a, .footer a').all();
  for (const link of footerLinks) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    if (text?.trim()) console.log(`  - ${text.trim()} → ${href}`);
  }

  // 3. Property listing
  console.log('\n🏠 LISTADO DE PROPIEDADES:');
  const propertyCards = await page.locator('.property-card, .propiedad-card, [class*="property"], [class*="propiedad"], .grid > div, .catalogo .property-grid > div').all();
  console.log(`  Cantidad de cards visibles: ${propertyCards.length}`);
  
  if (propertyCards.length > 0) {
    const firstCard = propertyCards[0];
    const cardHtml = await firstCard.innerHTML();
    console.log('  Primer card HTML (truncado):', cardHtml.substring(0, 500));
  }

  // Check filters
  const filters = await page.locator('.search-bar, .filtros, [class*="filter"], select, input[type="search"]').all();
  console.log(`  Filtros encontrados: ${filters.length}`);
  for (const f of filters) {
    const tag = await f.evaluate(el => el.tagName.toLowerCase());
    const placeholder = await f.getAttribute('placeholder');
    const id = await f.getAttribute('id');
    const cls = await f.getAttribute('class');
    console.log(`    - <${tag}> id="${id}" class="${cls}" placeholder="${placeholder}"`);
  }

  // 4. Contact forms
  console.log('\n📝 FORMULARIOS DE CONTACTO:');
  const forms = await page.locator('form').all();
  for (const form of forms) {
    const inputs = await form.locator('input, textarea, select').all();
    console.log(`  Formulario con ${inputs.length} campos:`);
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const required = await input.getAttribute('required');
      console.log(`    - ${type || 'textarea/select'} name="${name}" placeholder="${placeholder}" required="${required}"`);
    }
  }

  // 5. Portal integrations
  console.log('\n🔗 INTEGRACIONES CON PORTALES:');
  const links = await page.locator('a[href*="mercadolibre"], a[href*="argenprop"], a[href*="zonaprop"], a[href*="instagram"], a[href*="facebook"], a[href*="whatsapp"], a[href*="linkedin"]').all();
  for (const link of links) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    const cls = await link.getAttribute('class');
    console.log(`  - ${text?.trim() || cls} → ${href}`);
  }

  // 6. Site architecture - all pages
  console.log('\n🗺️ ARQUITECTURA DE INFORMACIÓN (páginas detectadas):');
  const allLinks = await page.locator('a[href]').all();
  const pages = new Set();
  for (const link of allLinks) {
    const href = await link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
      pages.add(href);
    }
  }
  for (const p of Array.from(pages).sort()) {
    console.log(`  - ${p}`);
  }

  // 7. Property detail access
  console.log('\n🔍 ACCESO A DETALLE DE PROPIEDAD:');
  const detailLinks = await page.locator('a[href*="propiedad"], a[href*="detalle"], .property-card a, .card a').all();
  console.log(`  Links a detalle encontrados: ${detailLinks.length}`);
  for (const dl of detailLinks.slice(0, 3)) {
    const href = await dl.getAttribute('href');
    console.log(`  - ${href}`);
  }

  await browser.close();
  console.log('\n✅ Auditoría completada');
}

audit().catch(console.error);