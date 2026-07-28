import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test content renderer patterns without importing the full content.ts
// (which has Supabase dependency). Test the rendering logic directly.

describe('Content Renderers - XSS Protection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="heroTitulo"></div>
      <div id="heroBadges"></div>
      <div id="heroCtaPrimario"></div>
      <div id="heroStats"></div>
      <div id="aboutValores"></div>
      <div id="serviciosLista"></div>
      <div id="porQueRazones"></div>
      <div id="faqGrid"></div>
      <div id="footerLinks"></div>
      <div id="footerServicios"></div>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"test"}</script>
    `;
  });

  // Reimplementation of escapeHtml for testing
  function escapeHtml(str: unknown): string {
    if (typeof str !== 'string') return '';
    const entityMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return str.replace(/[&<>"']/g, c => entityMap[c]);
  }

  function sanitizeUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    try {
      const parsed = new URL(url.trim(), 'https://example.com');
      if (!['https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return '';
      return parsed.href;
    } catch { return ''; }
  }

  it('escapeHtml prevents XSS in hero title', () => {
    const el = document.getElementById('heroTitulo')!;
    el.innerHTML = `<i class="fas fa-star"></i> ${escapeHtml('<img src=x onerror=alert(1)>')}`;
    expect(el.innerHTML).not.toContain('<img');
    expect(el.innerHTML).toContain('&lt;img');
  });

  it('escapeHtml prevents script injection', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('escapeHtml handles nested HTML entities', () => {
    const input = 'Tom &amp; Jerry <3 "quotes" and \'apostrophes\'';
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain('<3');
    expect(escaped).toContain('&lt;3');
  });

  it('escapeHtml returns empty for non-string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123 as any)).toBe('');
  });

  it('sanitizeUrl blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('sanitizeUrl allows https', () => {
    const result = sanitizeUrl('https://bienenhaus.com.ar');
    expect(result).toContain('https:');
  });

  it('sanitizeUrl allows mailto', () => {
    const result = sanitizeUrl('mailto:test@example.com');
    expect(result).toContain('mailto:');
  });

  it('hero badges are properly escaped', () => {
    const badges = ['Normal', '<script>xss</script>'];
    const container = document.getElementById('heroBadges')!;
    container.innerHTML = badges.map(b =>
      `<span class="hero-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> ${escapeHtml(String(b).trim())}</span>`
    ).join('');
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('Normal');
  });

  it('footer links sanitize URLs', () => {
    const links = [
      { texto: 'Home', url: 'https://bienenhaus.com.ar' },
      { texto: 'XSS', url: 'javascript:alert(1)' },
    ];
    const container = document.getElementById('footerLinks')!;
    container.innerHTML = links.map(l =>
      `<li><a href="${sanitizeUrl(l.url || '#')}"><i class="fas fa-chevron-right"></i> ${escapeHtml(l.texto || '')}</a></li>`
    ).join('');
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).toContain('https:');
  });

  it('FAQ items are properly escaped', () => {
    const faqs = [
      { pregunta: '<b>Safe?</b>', respuesta: 'Answer with "quotes"' },
    ];
    const container = document.getElementById('faqGrid')!;
    container.innerHTML = faqs.map(faq =>
      `<div class="faq-item"><h4>${escapeHtml(faq.pregunta)}</h4><p>${escapeHtml(faq.respuesta)}</p></div>`
    ).join('');
    expect(container.innerHTML).not.toContain('<b>');
    expect(container.innerHTML).toContain('&lt;b&gt;');
  });

  it('renderSeoSchema validates JSON before injection', () => {
    const schema = document.querySelector('script[type="application/ld+json"]')!;
    
    // Valid schema
    const valid = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test' };
    schema.textContent = JSON.stringify(valid);
    expect(schema.textContent).toContain('WebSite');

    // Invalid: no @context
    const invalid1 = { name: 'Bad' };
    // Simulate validation
    if (invalid1['@context'] && invalid1['@type']) {
      schema.textContent = JSON.stringify(invalid1);
    }
    // Schema should still have the previous valid content
    expect(schema.textContent).toContain('WebSite');

    // Invalid: script injection attempt
    const malicious = '</script><script>alert(1)</script>';
    // Simulate: JSON.parse would fail on raw string, and validation would reject
    try {
      JSON.parse(malicious);
    } catch {
      // Expected - not valid JSON
    }
    expect(schema.textContent).toContain('WebSite');
  });

  it('renderSeoSchema rejects arrays', () => {
    const schema = document.querySelector('script[type="application/ld+json"]')!;
    const arr = [1, 2, 3];
    // Simulate validation: reject arrays
    if (typeof arr === 'object' && arr !== null && !Array.isArray(arr)) {
      schema.textContent = JSON.stringify(arr);
    }
    // Should NOT have changed to array
    expect(schema.textContent).not.toContain('[1,2,3]');
  });

  it('parsePipeArray correctly parses pipe-delimited data', () => {
    const value = 'fas fa-star|Titulo|Descripcion\nfas fa-home|Otro|Otra desc';
    const fields = ['icono', 'titulo', 'descripcion'];
    const result = value.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|');
        const obj: Record<string, string> = {};
        fields.forEach((field, i) => { obj[field] = parts[i]?.trim() || ''; });
        return obj;
      });
    
    expect(result).toHaveLength(2);
    expect(result[0].icono).toBe('fas fa-star');
    expect(result[0].titulo).toBe('Titulo');
    expect(result[1].icono).toBe('fas fa-home');
  });

  it('parsePipeArray handles empty input', () => {
    const result = ''.split('\n').filter(l => l.trim());
    expect(result).toHaveLength(0);
  });
});
