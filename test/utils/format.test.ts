import { describe, it, expect } from 'vitest';
import { formatPrice } from '../../src/utils/format';

describe('formatPrice', () => {
  it('formats ARS prices with locale separators', () => {
    expect(formatPrice(1500000)).toBe('$ 1.500.000');
    expect(formatPrice(0)).toBe('$ 0');
    expect(formatPrice(999999999)).toBe('$ 999.999.999');
  });

  it('formats USD prices with U$S prefix', () => {
    expect(formatPrice(150000, 'USD')).toBe('U$S 150.000');
    expect(formatPrice(0, 'USD')).toBe('U$S 0');
  });

  it('appends /mes for alquiler operation', () => {
    expect(formatPrice(50000, 'ARS', 'alquiler')).toBe('$ 50.000/mes');
    expect(formatPrice(800, 'USD', 'alquiler')).toBe('U$S 800/mes');
  });

  it('does not append /mes for venta operation', () => {
    expect(formatPrice(50000, 'ARS', 'venta')).toBe('$ 50.000');
    expect(formatPrice(50000, 'ARS')).toBe('$ 50.000');
  });

  it('handles decimal prices', () => {
    expect(formatPrice(1234567.89)).toBe('$ 1.234.567,89');
  });
});
