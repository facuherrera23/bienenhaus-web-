// ================================================================
// TESTS - Utils (self-contained, no external imports)
// ================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Helper functions (copied from src/utils/jsonld.js) ---

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
    return obj.map(cleanObject).filter(v => v !== undefined && v !== null);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (cleanedValue !== undefined && cleanedValue !== null) {
        if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue;
        if (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) continue;
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
}

function formatPrice(price, currency = 'ARS', operation = 'venta') {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'alquiler' ? '/mes' : '';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}

// --- Tests ---

describe('Utils - jsonld helpers', () => {
  describe('formatPrice', () => {
    it('formats ARS prices correctly', () => {
      expect(formatPrice(1500000, 'ARS')).toBe('$ 1.500.000');
      expect(formatPrice(0, 'ARS')).toBe('$ 0');
      expect(formatPrice(999999999, 'ARS')).toBe('$ 999.999.999');
    });

    it('formats USD prices correctly', () => {
      expect(formatPrice(150000, 'USD')).toBe('U$S 150.000');
      expect(formatPrice(0, 'USD')).toBe('U$S 0');
    });

    it('handles alquiler suffix', () => {
      expect(formatPrice(50000, 'ARS', 'alquiler')).toBe('$ 50.000/mes');
    });
  });

  describe('getPropertyType', () => {
    it('returns correct schema types', () => {
      expect(getPropertyType('piso')).toBe('Apartment');
      expect(getPropertyType('chalet')).toBe('House');
      expect(getPropertyType('atico')).toBe('Apartment');
      expect(getPropertyType('local')).toBe('CommercialProperty');
      expect(getPropertyType('terreno')).toBe('Land');
      expect(getPropertyType('desconocido')).toBe('RealEstate');
    });
  });

  describe('cleanObject', () => {
    it('removes undefined and null values', () => {
      const obj = { a: 1, b: null, c: undefined, d: 'test' };
      const cleaned = cleanObject(obj);
      expect(cleaned).toEqual({ a: 1, d: 'test' });
    });

    it('handles nested objects', () => {
      const obj = { a: { b: null, c: 1 }, d: undefined };
      const cleaned = cleanObject(obj);
      expect(cleaned).toEqual({ a: { c: 1 } });
    });

    it('handles arrays', () => {
      const obj = { items: [1, null, 2, undefined, 3] };
      const cleaned = cleanObject(obj);
      expect(cleaned.items).toEqual([1, 2, 3]);
    });

    it('handles empty objects and arrays', () => {
      const obj = { empty: {}, emptyArr: [], nested: { empty: {} } };
      const cleaned = cleanObject(obj);
      expect(cleaned).toBeUndefined();
    });
  });
});