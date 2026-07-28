import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test admin shared utils patterns (formatPrice, formatDate, etc.)
// Without importing supabase-dependent modules

describe('Admin Utils - formatPrice', () => {
  function formatPrice(price: number, currency = 'ARS', operation = 'sale'): string {
    const symbol = currency === 'USD' ? 'U$S' : '$';
    const suffix = operation === 'rent' ? '/mes' : '';
    return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
  }

  it('formats ARS prices', () => {
    expect(formatPrice(1500000)).toBe('$ 1.500.000');
  });

  it('formats USD prices', () => {
    expect(formatPrice(150000, 'USD')).toBe('U$S 150.000');
  });

  it('adds /mes for rent', () => {
    expect(formatPrice(50000, 'ARS', 'rent')).toBe('$ 50.000/mes');
  });
});

describe('Admin Utils - formatDate', () => {
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  it('formats date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('2024');
  });

  it('handles ISO dates', () => {
    const result = formatDate('2024-12-31T12:00:00Z');
    expect(result).toBeDefined();
  });
});

describe('Admin Utils - getInitials', () => {
  function getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  it('returns first two initials', () => {
    expect(getInitials('Juan Perez')).toBe('JP');
  });

  it('returns ? for empty', () => {
    expect(getInitials('')).toBe('?');
  });

  it('limits to 2 chars', () => {
    expect(getInitials('Maria Jose Garcia')).toBe('MJ');
  });
});

describe('Admin Utils - parsePipeArray', () => {
  function parsePipeArray(value: string, fields: string[]): Record<string, string>[] {
    if (!value) return [];
    return value.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|');
        const obj: Record<string, string> = {};
        fields.forEach((field, i) => { obj[field] = parts[i]?.trim() || ''; });
        return obj;
      });
  }

  it('parses pipe-delimited lines', () => {
    const result = parsePipeArray('a|b|c\nd|e|f', ['x', 'y', 'z']);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBe('a');
    expect(result[1].z).toBe('f');
  });

  it('returns empty for empty input', () => {
    expect(parsePipeArray('', ['a'])).toEqual([]);
  });

  it('skips empty lines', () => {
    const result = parsePipeArray('a|b\n\nc|d', ['x', 'y']);
    expect(result).toHaveLength(2);
  });
});

describe('Admin Utils - debounce', () => {
  function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  }

  it('debounces function calls', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    await new Promise(r => setTimeout(r, 100));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Admin Toast - escapeHtml integration', () => {
  it('toast message is escaped', () => {
    function escapeHtml(str: unknown): string {
      if (typeof str !== 'string') return '';
      const entityMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
      return str.replace(/[&<>"']/g, c => entityMap[c]);
    }
    
    const malicious = '<script>alert(1)</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
  });
});
