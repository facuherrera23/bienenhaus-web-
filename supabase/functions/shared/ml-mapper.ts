// Shared ML Mapper - No circular dependencies, defines types locally

const ML_API = "https://api.mercadolibre.com";

// Types
export interface Property {
  id?: number;
  titulo: string;
  precio: number;
  moneda: string;
  operacion: 'venta' | 'alquiler';
  ubicacion: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  m2: number;
  antiguedad: string;
  descripcion: string;
  imagenes?: Array<{ url: string; cloudinary_public_id: string; orden: number; es_principal: boolean }>;
  caracteristicas?: string[];
  ml_item_id?: string;
  ml_status?: string;
  ml_permalink?: string;
  ml_last_sync?: string;
}

export interface MLItem {
  id: string;
  site_id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  buying_mode: string;
  listing_type_id: string;
  condition: string;
  permalink: string;
  thumbnail: string;
  pictures: Array<{ source: string }>;
  attributes: Array<{ id: string; value_name?: string; value_id?: string; value_struct?: { number: number; unit: string } }>;
  status: string;
  date_created: string;
  last_updated: string;
  category_id: string;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  value_type: string;
  value_max_length?: number;
  values?: Array<{ id: string; name: string }>;
  required: boolean;
  tags?: string[];
}

export interface MLAttribute {
  id: string;
  value_name?: string;
  value_id?: string;
  value_struct?: { number: number; unit: string };
}

// Category mapping
const ML_CATEGORY_MAP: Record<string, string> = {
  'venta_piso': 'MLA1459',
  'venta_chalet': 'MLA1459',
  'venta_atico': 'MLA1459',
  'venta_local': 'MLA1461',
  'venta_terreno': 'MLA1463',
  'alquiler_piso': 'MLA1540',
  'alquiler_chalet': 'MLA1540',
  'alquiler_atico': 'MLA1540',
  'alquiler_local': 'MLA1542',
  'alquiler_terreno': 'MLA1544',
};

export function getCategoryId(operacion: string, tipo: string): string {
  const key = `${operacion}_${tipo}`;
  return ML_CATEGORY_MAP[key] || (operacion === 'alquiler' ? 'MLA1540' : 'MLA1459');
}

// Category attributes cache
const CATEGORY_ATTR_CACHE = new Map<string, CategoryAttribute[]>();

export async function fetchCategoryAttributes(
  accessToken: string,
  categoryId: string
): Promise<CategoryAttribute[]> {
  if (CATEGORY_ATTR_CACHE.has(categoryId)) {
    return CATEGORY_ATTR_CACHE.get(categoryId)!;
  }

  try {
    const res = await fetch(`${ML_API}/categories/${categoryId}/attributes`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn(`No se pudieron obtener atributos para categoría ${categoryId}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const attrs: CategoryAttribute[] = data.attributes || [];
    CATEGORY_ATTR_CACHE.set(categoryId, attrs);
    return attrs;
  } catch (err) {
    console.warn(`Error fetching category attributes for ${categoryId}:`, err);
    return [];
  }
}

function getOperationType(operacion: string): 'venta' | 'alquiler' {
  return operacion === 'alquiler' ? 'alquiler' : 'venta';
}

function getPropertyType(tipo: string): string {
  const typeMap: Record<string, string> = {
    'piso': 'apartment',
    'chalet': 'house',
    'atico': 'apartment',
    'local': 'commercial',
    'terreno': 'land',
  };
  return typeMap[tipo] || 'apartment';
}

export function buildMLAttributes(prop: Property, categoryAttributes: CategoryAttribute[]): MLAttribute[] {
  const attrs: MLAttribute[] = [
    { id: 'ROOMS', value_name: String(prop.habitaciones || 0) },
    { id: 'FULL_BATHROOMS', value_name: String(prop.banos || 0) },
    { id: 'COVERED_AREA', value_struct: { number: prop.m2 || 0, unit: 'm²' } },
  ];

  if (prop.antiguedad) {
    attrs.push({ 
      id: 'ITEM_CONDITION', 
      value_name: prop.antiguedad === 'nuevo' ? 'new' : 'used' 
    });
  }

  if (prop.operacion === 'alquiler') {
    attrs.push({ id: 'OPERATION', value_name: 'Rent' });
    attrs.push({ id: 'OPERATION_SUBTYPE', value_name: 'Residential' });
  } else {
    attrs.push({ id: 'OPERATION', value_name: 'Sale' });
  }

  const propertyTypeMap: Record<string, string> = {
    'piso': 'Apartment',
    'chalet': 'House',
    'atico': 'Penthouse',
    'local': 'Commercial',
    'terreno': 'Lot',
  };
  if (propertyTypeMap[prop.tipo]) {
    attrs.push({ id: 'PROPERTY_TYPE', value_name: propertyTypeMap[prop.tipo] });
  }

  if (prop.caracteristicas?.length) {
    const featureMap: Record<string, string> = {
      'ascensor': 'HAS_LIFT',
      'terraza': 'HAS_TERRACE',
      'garaje': 'HAS_GARAGE',
      'piscina': 'HAS_SWIMMING_POOL',
      'quincho': 'HAS_BARBECUE_AREA',
      'jardin': 'HAS_GARDEN',
      'balcon': 'HAS_BALCONY',
      'calefaccion': 'HAS_HEATING',
      'aire acondicionado': 'HAS_AIR_CONDITIONING',
      'amueblado': 'FURNISHED',
      'seguridad': 'HAS_SECURITY',
      'cochera': 'HAS_COVERED_PARKING',
    };

    prop.caracteristicas.forEach(c => {
      const normalized = c.toLowerCase().trim();
      const attrId = featureMap[normalized];
      if (attrId) {
        attrs.push({ id: attrId, value_name: 'Yes' });
      }
    });
  }

  // Validate against category requirements
  const requiredAttrs = categoryAttributes
    .filter(a => a.required && a.tags?.includes('required'))
    .map(a => a.id);

  const providedIds = new Set(attrs.map(a => a.id));
  const missing = requiredAttrs.filter(id => !providedIds.has(id));
  
  if (missing.length > 0) {
    console.warn(`Atributos requeridos faltantes para la categoría: ${missing.join(', ')}`);
  }

  return attrs;
}

export function validateRequiredAttributes(
  categoryAttributes: CategoryAttribute[],
  providedAttrs: Array<{ id: string }>
): { valid: boolean; missing: string[] } {
  const required = categoryAttributes
    .filter(a => a.required && a.tags?.includes('required'))
    .map(a => a.id);

  const providedIds = new Set(providedAttrs.map(a => a.id));
  const missing = required.filter(id => !providedIds.has(id));

  return { valid: missing.length === 0, missing };
}

export function mapPropertyToMLItem(
  prop: Property,
  categoryId: string,
  categoryAttributes: CategoryAttribute[]
): any {
  const attrs = buildMLAttributes(prop, categoryAttributes);

  const pictures = prop.imagenes?.map((img, i) => ({
    source: img.url,
    index: i,
  })) || [];

  return {
    title: prop.titulo,
    category_id: categoryId,
    price: prop.precio,
    currency_id: prop.moneda,
    available_quantity: 1,
    buying_mode: prop.operacion === 'alquiler' ? 'rental' : 'sale',
    listing_type_id: 'gold_special',
    condition: prop.antiguedad === 'nuevo' ? 'new' : 'used',
    pictures,
    attributes: attrs,
    description: { plain_text: prop.descripcion || '' },
    channels: ['marketplace'],
  };
}

export function mapMLItemToProperty(item: MLItem): Partial<Property> {
  const attrMap: Record<string, string> = {};
  item.attributes.forEach(a => {
    attrMap[a.id] = a.value_name || a.value_id || (a.value_struct ? String(a.value_struct.number) : '');
  });

  return {
    ml_item_id: item.id,
    ml_status: item.status,
    ml_permalink: item.permalink,
    ml_last_sync: new Date().toISOString(),
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    operacion: item.buying_mode === 'rental' ? 'alquiler' : 'venta',
    tipo: attrMap['PROPERTY_TYPE'] || 'piso',
    habitaciones: parseInt(attrMap['ROOMS'] || '0'),
    banos: parseInt(attrMap['FULL_BATHROOMS'] || '0'),
    m2: parseInt(String(attrMap['COVERED_AREA'] || '').replace(/[^0-9]/g, '') || '0'),
    descripcion: '',
    imagenes: item.pictures?.map((p, i) => ({ url: p.source, orden: i, es_principal: i === 0 })) || [],
  };
}