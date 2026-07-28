import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateMeta, updateCanonical, updateSEO, generateJSONLD, generateSitemap, generateRobotsTxt } from '../../src/utils/seo';

describe('updateMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('creates meta tag if it does not exist', () => {
    updateMeta('og:title', 'Test Title');
    const meta = document.querySelector('meta[property="og:title"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('Test Title');
  });

  it('updates existing meta tag', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'old');
    document.head.appendChild(meta);

    updateMeta('description', 'new desc');
    expect(meta.getAttribute('content')).toBe('new desc');
  });

  it('uses name attribute for non-og/twitter meta', () => {
    updateMeta('description', 'test');
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
  });
});

describe('updateCanonical', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('creates canonical link', () => {
    updateCanonical('https://bienenhaus.com.ar/propiedades/1');
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://bienenhaus.com.ar/propiedades/1');
  });

  it('updates existing canonical', () => {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = 'https://old.com';
    document.head.appendChild(link);

    updateCanonical('https://new.com');
    expect(link.href).toMatch(/new\.com/);
  });
});

describe('updateSEO', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets document title and meta tags', () => {
    updateSEO({
      title: 'Propiedad en Córdoba',
      description: 'Hermosa propiedad',
      url: 'https://bienenhaus.com.ar/propiedades/1',
      image: 'https://example.com/img.jpg',
    });

    expect(document.title).toBe('Propiedad en Córdoba');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Propiedad en Córdoba');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Hermosa propiedad');
  });

  it('does nothing with null input', () => {
    updateSEO(null);
    expect(document.title).toBe('');
  });
});

describe('generateJSONLD', () => {
  it('generates RealEstateListing schema', () => {
    const result = generateJSONLD('RealEstateListing', {
      name: 'Departamento en Nueva Córdoba',
      description: 'Hermoso depto',
      url: 'https://bienenhaus.com.ar/propiedades/1',
      offers: { price: 1500000, priceCurrency: 'ARS' },
    });

    expect(result).toContain('application/ld+json');
    expect(result).toContain('RealEstateListing');
    expect(result).toContain('Departamento en Nueva Córdoba');
  });

  it('generates Organization schema', () => {
    const result = generateJSONLD('Organization', {
      name: 'Bienenhaus',
      url: 'https://bienenhaus.com.ar',
    });

    expect(result).toContain('RealEstateAgent');
    expect(result).toContain('Bienenhaus');
  });

  it('generates WebSite schema', () => {
    const result = generateJSONLD('WebSite', {
      name: 'Bienenhaus Propiedades',
      url: 'https://bienenhaus.com.ar',
    });

    expect(result).toContain('WebSite');
    expect(result).toContain('SearchAction');
  });

  it('generates FAQPage schema', () => {
    const result = generateJSONLD('FAQPage', [
      { question: '¿Qué servicios ofrecen?', answer: 'Venta y alquiler' },
    ]);

    expect(result).toContain('FAQPage');
    expect(result).toContain('¿Qué servicios ofrecen?');
  });

  it('returns empty string for unknown type', () => {
    expect(generateJSONLD('Unknown', {})).toBe('');
  });
});

describe('generateSitemap', () => {
  it('generates valid XML sitemap', () => {
    const result = generateSitemap([
      { path: '/', priority: 1, changefreq: 'daily' },
      { path: '/propiedades', priority: 0.9 },
    ]);

    expect(result).toContain('<?xml');
    expect(result).toContain('urlset');
    expect(result).toContain('https://bienenhaus.com.ar/');
    expect(result).toContain('https://bienenhaus.com.ar/propiedades');
  });
});

describe('generateRobotsTxt', () => {
  it('generates default robots.txt', () => {
    const result = generateRobotsTxt();

    expect(result).toContain('User-agent: *');
    expect(result).toContain('Disallow: /admin/');
    expect(result).toContain('Sitemap:');
  });

  it('allows custom disallow paths', () => {
    const result = generateRobotsTxt({ disallow: ['/test/'] });
    expect(result).toContain('Disallow: /test/');
  });
});
