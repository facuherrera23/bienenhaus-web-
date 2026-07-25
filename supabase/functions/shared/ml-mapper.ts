import { MLItem, Property } from '../ml-import/index.ts';

const ML_API = "https://api.mercadolibre.com";

interface CategoryAttribute {
  id: string;
  name: string;
  value_type: string;
  value_max_length?: number;
  values?: Array<{ id: string; name: string }>;
  required: boolean;
  tags?: string[];
}

interface CategoryAttributesResponse {
  attributes: CategoryAttribute[];
}

interface DomainDiscoveryResult {
  category_id: string;
  category_name: string;
  domain_id: string;
  domain_name: string;
  attributes: Array<{ id: string; name: string; required: boolean }>;
}

const CATEGORY_CACHE = new Map<string, { categoryId: string; attributes: CategoryAttribute[] }>();

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

async function fetchCategoryAttributes(accessToken: string, categoryId: string): Promise<CategoryAttribute[]> {
  const cached = CATEGORY_CACHE.get(categoryId);
  if (cached) return cached.attributes;

  try {
    const res = await fetch(`${ML_API}/categories/${categoryId}/attributes`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn(`No se pudieron obtener atributos para categoría ${categoryId}: ${res.status}`);
      return [];
    }

    const data: CategoryAttributesResponse = await res.json();
    CATEGORY_CACHE.set(categoryId, { categoryId, attributes: data.attributes });
    return data.attributes;
  } catch (err) {
    console.warn(`Error fetching category attributes for ${categoryId}:`, err);
    return [];
  }
}

async function discoverCategory(accessToken: string, operacion: string, tipo: string): Promise<string> {
  const operationType = getOperationType(operacion);
  const propertyType = getPropertyType(tipo);

  const searchTerms = operationType === 'alquiler' 
    ? ['alquiler', 'renta', 'arriendo']
    : ['venta', 'comprar'];

  for (const term of searchTerms) {
    try {
      const res = await fetch(
        `${ML_API}/sites/MLA/domain_discovery/search?q=${encodeURIComponent(term + ' ' + propertyType)}&limit=5`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.length > 0) {
        return data[0].category_id;
      }
    } catch (err) {
      console.warn(`Domain discovery failed for ${term}:`, err);
    }
  }

  const fallbackMap: Record<string, string> = {
    'venta_apartment': 'MLA1459',
    'venta_house': 'MLA1459',
    'venta_commercial': 'MLA1461',
    'venta_land': 'MLA1463',
    'alquiler_apartment': 'MLA1540',
    'alquiler_house': 'MLA1540',
    'alquiler_commercial': 'MLA1542',
    'alquiler_land': 'MLA1544',
  };

  const key = `${operationType}_${propertyType}`;
  return fallbackMap[key] || (operationType === 'alquiler' ? 'MLA1540' : 'MLA1459');
}

export async function getCategoryId(
  accessToken: string,
  operacion: string,
  tipo: string
): Promise<{ categoryId: string; attributes: CategoryAttribute[] }> {
  const categoryId = await discoverCategory(accessToken, operacion, tipo);
  const attributes = await fetchCategoryAttributes(accessToken, categoryId);
  return { categoryId, attributes };
}

export function buildMLItemAttributes(
  prop: Property,
  categoryAttributes: CategoryAttribute[]
): Array<{ id: string; value_name?: string; value_id?: string; value_struct?: { number: number; unit: string } }> {
  const attrs: Array<{ id: string; value_name?: string; value_id?: string; value_struct?: { number: number; unit: string } }> = [];

  const requiredAttrs = categoryAttributes.filter(a => a.required);
  const attrIds = new Set(categoryAttributes.map(a => a.id));

  if (prop.habitaciones && attrIds.has('ROOMS')) {
    attrs.push({ id: 'ROOMS', value_name: String(prop.habitaciones) });
  }

  if (prop.banos && attrIds.has('FULL_BATHROOMS')) {
    attrs.push({ id: 'FULL_BATHROOMS', value_name: String(prop.banos) });
  }

  if (prop.m2 && attrIds.has('COVERED_AREA')) {
    attrs.push({ id: 'COVERED_AREA', value_struct: { number: prop.m2, unit: 'm²' } });
  }

  if (prop.antiguedad && attrIds.has('ITEM_CONDITION')) {
    const condition = prop.antiguedad === 'nuevo' ? 'new' : 'used';
    attrs.push({ id: 'ITEM_CONDITION', value_name: condition });
  }

  if (prop.caracteristicas?.length) {
    prop.caracteristicas.forEach(c => {
      if (attrIds.has('MAINTENANCE_FEE')) {
        attrs.push({ id: 'MAINTENANCE_FEE', value_name: c });
      }
    });
  }

  requiredAttrs.forEach(req => {
    if (!attrs.some(a => a.id === req.id)) {
      console.warn(`Atributo requerido faltante: ${req.id} (${req.name})`);
    }
  });

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
  const attrs = buildMLItemAttributes(prop, categoryAttributes);

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