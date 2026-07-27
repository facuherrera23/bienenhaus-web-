// ================================================================
// SEO UTILITIES - Dynamic meta tags, JSON-LD, sitemap
// ================================================================

/**
 * Update meta tags dynamically
 * @param {string} name - Meta property name (og:title, twitter:card, etc.)
 * @param {string} content - Meta content value
 */
export function updateMeta(name, content) {
  if (typeof document === 'undefined') return;
  
  let meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Update canonical URL
 * @param {string} url - Canonical URL
 */
export function updateCanonical(url) {
  if (typeof document === 'undefined') return;
  
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Update all SEO meta tags for a page
 * @param {Object} seoData - SEO data object
 * @param {string} seoData.title - Page title
 * @param {string} seoData.description - Meta description
 * @param {string} seoData.url - Canonical URL
 * @param {string} seoData.image - Open Graph image
 * @param {string} seoData.type - og:type (website, article, etc.)
 * @param {string} seoData.siteName - Site name
 * @param {string} seoData.twitterCard - Twitter card type
 */
export function updateSEO(seoData) {
  if (!seoData) return;
  
  const {
    title,
    description,
    url,
    image,
    type = 'website',
    siteName = 'Bienenhaus Propiedades',
    twitterCard = 'summary_large_image'
  } = seoData;
  
  if (title) {
    document.title = title;
    updateMeta('og:title', title);
    updateMeta('twitter:title', title);
  }
  
  if (description) {
    updateMeta('description', description);
    updateMeta('og:description', description);
    updateMeta('twitter:description', description);
  }
  
  if (url) {
    updateCanonical(url);
    updateMeta('og:url', url);
  }
  
  if (image) {
    updateMeta('og:image', image);
    updateMeta('twitter:image', image);
  }
  
  updateMeta('og:type', type);
  updateMeta('og:site_name', siteName);
  updateMeta('twitter:card', twitterCard);
}

/**
 * Generate JSON-LD structured data
 * @param {string} type - Schema.org type
 * @param {Object} data - Data for the schema
 * @returns {string} JSON-LD script tag
 */
export function generateJSONLD(type, data) {
  const schemas = {
    RealEstateListing: (data) => ({
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: data.name,
      description: data.description,
      url: data.url,
      image: data.images?.map(img => img.url) || [],
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.address?.streetAddress,
        addressLocality: data.address?.addressLocality,
        addressRegion: data.address?.addressRegion,
        addressCountry: data.address?.addressCountry || 'AR',
        postalCode: data.address?.postalCode
      },
      geo: data.geo ? {
        '@type': 'GeoCoordinates',
        latitude: data.geo.latitude,
        longitude: data.geo.longitude
      } : undefined,
      offers: data.offers ? {
        '@type': 'Offer',
        price: data.offers.price,
        priceCurrency: data.offers.priceCurrency || 'ARS',
        availability: data.offers.availability || 'https://schema.org/InStock',
        validFrom: new Date().toISOString()
      } : undefined,
      propertyType: data.propertyType,
      floorSize: data.floorSize ? {
        '@type': 'QuantitativeValue',
        value: data.floorSize.value,
        unitCode: data.floorSize.unitCode || 'MTK'
      } : undefined,
      numberOfRooms: data.numberOfRooms,
      numberOfBathrooms: data.numberOfBathrooms,
      petsAllowed: data.petsAllowed
    },
    
    BreadcrumbList: (breadcrumbs) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      })),
    
    Organization: (data) => ({
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: data.name,
      alternateName: data.alternateName,
      url: data.url,
      logo: data.logo,
      telephone: data.telephone,
      email: data.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.address?.streetAddress,
        addressLocality: data.address?.addressLocality,
        addressRegion: data.address?.addressRegion,
        postalCode: data.address?.postalCode,
        addressCountry: data.address?.addressCountry || 'AR'
      },
      geo: data.geo ? {
        '@type': 'GeoCoordinates',
        latitude: data.geo.latitude,
        longitude: data.geo.longitude
      } : undefined,
      openingHoursSpecification: data.openingHours,
      priceRange: data.priceRange,
      currenciesAccepted: data.currenciesAccepted,
      paymentAccepted: data.paymentAccepted,
      areaServed: data.areaServed
    },
    
    WebSite: (data) => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: data.name,
      url: data.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: data.searchUrl || `${data.url}/propiedades?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    },
    
    FAQPage: (faqs) => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
  };
  
  const generator = schemas[type];
  if (!generator) {
    console.warn(`Unknown JSON-LD type: ${type}`);
    return '';
  }
  
  const data = generator(data);
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/**
 * Inject JSON-LD into document head
 * @param {string} type - Schema type
 * @param {Object} data - Schema data
 */
export function injectJSONLD(type, data) {
  if (typeof document === 'undefined') return;
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(generateJSONLD(type, data));
  script.dataset.schemaType = type;
  document.head.appendChild(script);
  
  return script;
}

/**
 * Remove JSON-LD by type
 * @param {string} type - Schema type to remove
 */
export function removeJSONLD(type) {
  if (typeof document === 'undefined') return;
  
  document.querySelectorAll(`script[type="application/ld+json"][data-schema-type="${type}"]`)
    .forEach(script => script.remove());
}

/**
 * Generate sitemap.xml content
 * @param {Array} urls - Array of URLs with metadata
 * @returns {string} XML sitemap content
 */
export function generateSitemap(urls) {
  const baseUrl = 'https://bienenhaus.com.ar';
  const today = new Date().toISOString().split('T')[0];
  
  const urlEntries = urls.map(url => `
  <url>
    <loc>${baseUrl}${url.path}</loc>
    <lastmod>${url.lastmod || today}</lastmod>
    <changefreq>${url.changefreq || 'weekly'}</changefreq>
    <priority>${url.priority || 0.8}</priority>
  </url>`).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urlEntries}
</urlset>`;
}

/**
 * Generate robots.txt content
 * @param {Object} options - Robots options
 * @returns {string} robots.txt content
 */
export function generateRobotsTxt(options = {}) {
  const { 
    baseUrl = 'https://bienenhaus.com.ar',
    disallow = ['/admin/', '/api/', '/private/'],
    sitemap = `${baseUrl}/sitemap.xml`
  } = options;
  
  return `User-agent: *
${disallow.map(path => `Disallow: ${path}`).join('\n')}
Sitemap: ${sitemap}`;
}

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource objects { href, as, type }
 */
export function preloadResources(resources) {
  if (typeof document === 'undefined') return;
  
  resources.forEach(({ href, as, type, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  });
}

/**
 * Prefetch next page
 * @param {string} url - URL to prefetch
 */
export function prefetchPage(url) {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * DNS prefetch for external domains
 * @param {Array<string>} domains - Array of domains
 */
export function dnsPrefetch(domains) {
  if (typeof document === 'undefined') return;
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `https://${domain}`;
    document.head.appendChild(link);
  });
}

/**
 * Preconnect to external domains
 * @param {Array<string>} domains - Array of domains
 */
export function preconnect(domains) {
  if (typeof document === 'undefined') return;
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

export default {
  updateMeta,
  updateCanonical,
  updateSEO,
  generateJSONLD,
  injectJSONLD,
  removeJSONLD,
  generateSitemap,
  generateRobotsTxt,
  preloadResources,
  prefetchPage,
  dnsPrefetch,
  preconnect
};