const ESCAPE_HTML_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const ESCAPE_HTML_RE = /[&<>"']/g;

export function escapeHtml(str: string): string {
  if (str == null) return '';
  if (typeof str !== 'string') return '';
  return String(str).replace(ESCAPE_HTML_RE, (ch) => ESCAPE_HTML_MAP[ch] ?? ch);
}

export function sanitizeText(str: string): string {
  if (!str) return '';
  return escapeHtml(String(str));
}

export function sanitizeAttr(str: string): string {
  if (!str) return '';
  return String(str).replace(/[<>"']/g, '');
}

export function sanitizeClassName(str: string): string {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '');
}

export function sanitizeShortText(str: string, maxLen = 200): string {
  if (!str) return '';
  const cleaned = String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '\u2026';
}

export function sanitizeUrl(url: string): string {
  if (url == null) return '';
  const sanitized = String(url).trim();
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(sanitized)) return sanitized;
  if (sanitized.startsWith('/')) return sanitized;
  return '';
}

export function sanitizeJson<T>(data: T): T {
  if (typeof data === 'string') return sanitizeText(data) as unknown as T;
  if (Array.isArray(data)) return data.map(sanitizeJson) as unknown as T;
  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeJson(value);
    }
    return result as T;
  }
  return data;
}

export function sanitizeHtml(html: string): string {
  return escapeHtml(html);
}