export const ML_CATEGORY_MAP: Record<string, string> = {
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

export const ML_PROPERTY_TYPE_MAP: Record<string, string> = {
  'piso': 'MLA1459',
  'chalet': 'MLA1459',
  'atico': 'MLA1459',
  'local': 'MLA1461',
  'terreno': 'MLA1463',
};

export function getCategoryId(operacion: string, tipo: string): string {
  const key = `${operacion}_${tipo}`;
  return ML_CATEGORY_MAP[key] || (operacion === 'alquiler' ? 'MLA1540' : 'MLA1459');
}

const CATEGORY_ATTR_CACHE = new Map<string, CategoryAttribute[]>();

export async function fetchCategoryAttributes(
  accessToken: string,
  categoryId: string
): Promise<CategoryAttribute[]> {
  if (CATEGORY_ATTR_CACHE.has(categoryId)) {
    return CATEGORY_ATTR_CACHE.get(categoryId)!;
  }

  try {
    const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`, {
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

export interface MLAttribute {
  id: string;
  value_name?: string;
  value_id?: string;
  value_struct?: { number: number; unit: string };
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

export function validateRequiredAttributes(
  categoryAttributes: CategoryAttribute[],
  providedAttrs: MLAttribute[]
): { valid: boolean; missing: string[]; warnings: string[] } {
  const required = categoryAttributes
    .filter(a => a.required && a.tags?.includes('required'))
    .map(a => a.id);

  const providedIds = new Set(providedAttrs.map(a => a.id));
  const missing = required.filter(id => !providedIds.has(id));
  
  const warnings: string[] = [];
  const recommended = categoryAttributes
    .filter(a => a.required && !a.tags?.includes('required'))
    .map(a => a.id)
    .filter(id => !providedIds.has(id));
  
  if (recommended.length > 0) {
    warnings.push(`Atributos recomendados faltantes: ${recommended.join(', ')}`);
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function buildMLAttributes(prop: Property): MLAttribute[] {
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

  return attrs;
}

export function mapPropertyToMLItem(prop: Property, categoryId: string): any {
  const attrs = buildMLAttributes(prop);

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

export interface Property {
  id: number;
  titulo: string;
  precio: number;
  moneda: string;
  operacion: string;
  ubicacion: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  m2: number;
  antiguedad: string;
  caracteristicas: string[];
  descripcion: string;
  imagenes?: Array<{ url: string; orden: number; es_principal: boolean }>;
  ml_item_id?: string;
}

const ML_OPERATION_MAP: Record<string, string> = {
  'rental': 'alquiler',
  'sale': 'venta',
};

const ML_PROPERTY_TYPE_REVERSE: Record<string, string> = {
  'Apartment': 'piso',
  'House': 'chalet',
  'Penthouse': 'atico',
  'Commercial': 'local',
  'Lot': 'terreno',
};

function parseValueStruct(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.number) return val.number;
  if (typeof val === 'string') {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function mapMLItemToProperty(item: MLItem): Partial<Property> {
  const attrMap: Record<string, any> = {};
  item.attributes.forEach(a => {
    attrMap[a.id] = a.value_name || a.value_id || a.value_struct || '';
  });

  return {
    ml_item_id: item.id,
    ml_status: item.status,
    ml_permalink: item.permalink,
    ml_last_sync: new Date().toISOString(),
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    operacion: ML_OPERATION_MAP[item.buying_mode] || 'venta',
    tipo: ML_PROPERTY_TYPE_REVERSE[attrMap['PROPERTY_TYPE']] || 'piso',
    habitaciones: parseInt(attrMap['ROOMS'] || '0', 10),
    banos: parseInt(attrMap['FULL_BATHROOMS'] || '0', 10),
    m2: parseValueStruct(attrMap['COVERED_AREA']),
    descripcion: '',
    imagenes: item.pictures?.map((p, i) => ({ url: p.source, orden: i, es_principal: i === 0 })) || [],
  };
}

export function mapMLAttributeToFeature(attrId: string, value: string): string | null {
  const reverseFeatureMap: Record<string, string> = {
    'HAS_LIFT': 'Ascensor',
    'HAS_TERRACE': 'Terraza',
    'HAS_GARAGE': 'Garaje',
    'HAS_SWIMMING_POOL': 'Piscina',
    'HAS_BARBECUE_AREA': 'Quincho',
    'HAS_GARDEN': 'Jardín',
    'HAS_BALCONY': 'Balcón',
    'HAS_HEATING': 'Calefacción',
    'HAS_AIR_CONDITIONING': 'Aire acondicionado',
    'FURNISHED': 'Amueblado',
    'HAS_SECURITY': 'Seguridad',
    'HAS_COVERED_PARKING': 'Cochera',
  };
  return reverseFeatureMap[attrId] || null;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  required: boolean;
  tags?: string[];
  value_type?: string;
  values?: Array<{ id: string; name: string }>;
}

export function validateRequiredAttributes(
  providedAttrs: MLAttribute[],
  categoryAttributes: CategoryAttribute[]
): { valid: boolean; missing: string[]; warnings: string[] } {
  const providedIds = new Set(providedAttrs.map(a => a.id));
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const catAttr of categoryAttributes) {
    if (catAttr.required || catAttr.tags?.includes('required')) {
      if (!providedIds.has(catAttr.id)) {
        missing.push(`${catAttr.id} (${catAttr.name})`);
      }
    }
  }

  if (missing.length > 0) {
    warnings.push(`Atributos requeridos faltantes: ${missing.join(', ')}`);
  }

  return { valid: missing.length === 0, missing, warnings };
}