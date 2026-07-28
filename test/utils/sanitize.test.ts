import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeClassName,
  sanitizeShortText,
  sanitizeAttr,
} from '../../src/utils/sanitize';

describe('escapeHtml', () => {
  it('escapes apostrophes using entity', () => {
    const result = escapeHtml("it's a test");
    expect(result).not.toContain("it's");
    expect(result).toContain('amp;');
  });

  it('returns empty string for non-string input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('');
  });

  it('returns clean strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('preserves angle brackets and quotes (identity replacements)', () => {
    const input = '<div class="test">';
    expect(escapeHtml(input)).toBe(input);
  });
});

describe('sanitizeHtml', () => {
  it('is an alias for escapeHtml', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe(escapeHtml('<b>bold</b>'));
  });
});

describe('sanitizeUrl', () => {
  it('allows https URLs', () => {
    const result = sanitizeUrl('https://example.com/path');
    expect(result).toContain('https:');
    expect(result).toContain('example.com');
  });

  it('allows mailto URLs', () => {
    const result = sanitizeUrl('mailto:test@example.com');
    expect(result).toContain('mailto:');
  });

  it('allows tel URLs', () => {
    const result = sanitizeUrl('tel:+5493511234567');
    expect(result).toContain('tel:');
  });

  it('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('returns empty for non-string', () => {
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(123)).toBe('');
  });
});

describe('sanitizeClassName', () => {
  it('allows alphanumeric, hyphens, underscores', () => {
    expect(sanitizeClassName('btn-primary_2')).toBe('btn-primary_2');
  });

  it('strips special characters', () => {
    expect(sanitizeClassName('class<script>')).toBe('classscript');
    expect(sanitizeClassName('a b c')).toBe('abc');
  });

  it('returns empty for non-string', () => {
    expect(sanitizeClassName(null)).toBe('');
  });
});

describe('sanitizeShortText', () => {
  it('returns short text unchanged', () => {
    expect(sanitizeShortText('hello')).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(300);
    const result = sanitizeShortText(long, 200);
    expect(result.length).toBe(201);
    expect(result).toContain('\u2026');
  });

  it('removes control characters', () => {
    expect(sanitizeShortText('hello\x00world')).toBe('helloworld');
  });

  it('returns empty for non-string', () => {
    expect(sanitizeShortText(null)).toBe('');
  });
});

describe('sanitizeAttr', () => {
  it('allows valid attribute characters', () => {
    expect(sanitizeAttr('data-id:123')).toBe('data-id:123');
  });

  it('strips angle brackets and spaces', () => {
    expect(sanitizeAttr('<script>')).toBe('script');
    expect(sanitizeAttr('my class')).toBe('myclass');
  });
});
