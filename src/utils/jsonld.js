// ================================================================
// JSON-LD TEMPLATE - Schema.org RealEstateListing
// ================================================================

/**
 * Genera JSON-LD para RealEstateListing según Schema.org
 * @param {Object} property - Datos de la propiedad
 * @returns {Object} JSON-LD object
 */
export function generatePropertyJSONLD(property) {
  const price = property.precio || 0;
  const currency = property.moneda === 'USD' ? 'USD' : 'ARS';
  
  // Formatear precio
  const priceValue = Number(price);
  
  // Imágenes
  const images = property.galeria?.map(img => ({
    '@type': 'ImageObject',
    contentUrl: img,
    caption: property.titulo
  })) || [];

  if (property.imagen_principal && !images.some(img => img.contentUrl === property.imagen_principal)) {
    images.unshift({
      '@type': 'ImageObject',
      contentUrl: property.imagen_principal,
      caption: property.titulo
    });
  }

  // Ubicación
  const address = {
    '@type': 'PostalAddress',
    streetAddress: property.direccion || '',
    addressLocality: property.ubicacion?.split(',')[0]?.trim() || '',
    addressRegion: property.provincia || 'Córdoba',
    addressCountry: 'AR',
    postalCode: property.codigo_postal || ''
  };

  // Geo coordenadas
  const geo = (property.lat && property.lng) ? {
    '@type': 'GeoCoordinates',
    latitude: Number(property.lat),
    longitude: Number(property.lng)
  } : undefined;

  // Agente
  const agent = property.agente ? {
    '@type': 'RealEstateAgent',
    name: `${property.agente.nombre} ${property.agente.apellido}`,
    telephone: property.agente.telefono,
    email: property.agente.email,
    url: property.agente.avatar_url || undefined
  } : undefined;

  // Oferta
  const offers = {
    '@type': 'Offer',
    price: priceValue,
    priceCurrency: currency,
    availability: 'https://schema.org/InStock',
    validFrom: new Date().toISOString(),
    seller: {
      '@type': 'RealEstateAgent',
      name: 'Bienenhaus Propiedades',
      telephone: '+54 351 123-4567',
      email: 'bienenhaus.propiedades@gmail.com',
      url: 'https://bienenhaus.com.ar'
    }
  };

  // Construir JSON-LD
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.titulo,
    description: property.descripcion || '',
    url: `${window.location.origin}/propiedad/${property.id}`,
    image: images.map(img => img.contentUrl),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${window.location.origin}/propiedad/${property.id}`
    },
    address: address,
    geo: geo,
    offers: offers,
    propertyType: getPropertyType(property.tipo),
    floorSize: property.m2 ? {
      '@type': 'QuantitativeValue',
      value: Number(property.m2),
      unitCode: 'MTK'
    } : undefined,
    numberOfRooms: property.habitaciones ? Number(property.habitaciones) : undefined,
    numberOfBathrooms: property.banos ? Number(property.banos) : undefined,
    floorLevel: property.piso ? Number(property.piso) : undefined,
    yearBuilt: property.anio_construccion ? Number(property.anio_construccion) : undefined,
    petsAllowed: property.mascotas === true,
    smokingAllowed: false,
    hasGarage: property.cochera === true,
    hasPool: property.pileta === true,
    hasBalcony: property.balcon === true,
    furnished: property.amueblado === true,
    features: property.caracteristicas || [],
    agent: agent
  };

  // Remover undefined
  return cleanObject(jsonld);
}

/**
 * Genera JSON-LD para BreadcrumbList
 */
export function generateBreadcrumbJSONLD(breadcrumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url ? `${window.location.origin}${crumb.url}` : undefined
    })).filter(item => item.item)
  };
}

/**
 * Genera JSON-LD para Organization
 */
export function generateOrganizationJSONLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Bienenhaus Propiedades',
    alternateName: 'Bienenhaus',
    url: 'https://bienenhaus.com.ar',
    logo: 'https://bienenhaus.com.ar/logo.svg',
    telephone: '+54 351 123-4567',
    email: 'bienenhaus.propiedades@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. General Paz 123',
      addressLocality: 'Córdoba',
      addressRegion: 'Córdoba',
      postalCode: '5000',
      addressCountry: 'AR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -31.4201,
      longitude: -64.1888
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '20:00'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '14:00'
      }
    ],
    priceRange: '$$',
    currenciesAccepted: 'ARS, USD',
    paymentAccepted: 'Cash, Credit Card, Bank Transfer',
    areaServed: {
      '@type': 'City',
      name: 'Córdoba',
      containedInPlace: {
        '@type': 'Country',
        name: 'Argentina'
      }
    },
    sameAs: [
      'https://facebook.com/Bienenhaus.prop',
      'https://instagram.com/bienenhaus.prop',
      'https://youtube.com/@BienenhausPropiedades',
      'https://tiktok.com/@bienenhaus.prop',
      'https://linkedin.com/company/bienenhaus'
    ]
  };
}

/**
 * Genera JSON-LD para WebSite
 */
export function generateWebSiteJSONLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Bienenhaus Propiedades',
    url: 'https://bienenhaus.com.ar',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://bienenhaus.com.ar/propiedades?search={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Genera JSON-LD para FAQPage
 */
export function generateFAQJSONLD(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.pregunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.respuesta
      }
    }))
  };
}

// Helpers
function getPropertyType(tipo) {
  const types = {
    'piso': 'Apartment',
    'chalet': 'House',
    'atico': 'Apartment',
    'local': 'CommercialProperty',
    'terreno': 'Land'
  };
  return types[tipo] || 'RealEstate';
}

function cleanObject(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter(v => v !== undefined && v !== null && v !== '');
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (cleanedValue !== undefined && cleanedValue !== null && cleanedValue !== '') {
        if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue;
        if (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) continue;
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
}

// Exportar template como string para inyección directa
export function getPropertyJSONLDScript(property) {
  const jsonld = generatePropertyJSONLD(property);
  return `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
}

export function getBreadcrumbJSONLDScript(breadcrumbs) {
  const jsonld = generateBreadcrumbJSONLD(breadcrumbs);
  return `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
}

export function getOrganizationJSONLDScript() {
  return `<script type="application/ld+json">${JSON.stringify(generateOrganizationJSONLD())}</script>`;
}

export function getWebSiteJSONLDScript() {
  return `<script type="application/ld+json">${JSON.stringify(generateWebSiteJSONLD())}</script>`;
}

export function getFAQJSONLDScript(faqs) {
  return `<script type="application/ld+json">${JSON.stringify(generateFAQJSONLD(faqs))}</script>`;
}

export default {
  generatePropertyJSONLD,
  generateBreadcrumbJSONLD,
  generateOrganizationJSONLD,
  generateWebSiteJSONLD,
  generateFAQJSONLD,
  getPropertyJSONLDScript,
  getBreadcrumbJSONLDScript,
  getOrganizationJSONLDScript,
  getWebSiteJSONLDScript,
  getFAQJSONLDScript
};