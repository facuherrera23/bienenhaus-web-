/**
 * Utilidades de sanitización y escape para prevenir XSS
 * SOLO para salida HTML - NO para atributos, JS, CSS, URLs
 */

/**
 * Escapa caracteres HTML especiales
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const apos = String.fromCharCode(39) + 'amp;';
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/\x27/g, apos);
}

/**
 * Alias para escapeHtml (compatibilidad)
 * @param {string} str
 * @returns {string}
 */
export function sanitizeHtml(str) {
  return escapeHtml(str);
}

/**
 * Sanitiza URL para atributos href/src (allowlist: https, mailto, tel)
 * @param {string} url
 * @returns {string}
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, 'https://example.com');
    if (!['https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Sanitiza clase CSS (solo alfanuméricos, guiones, underscores)
 * @param {string} str
 * @returns {string}
 */
export function sanitizeClassName(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/**
 * Sanitiza y trunca texto corto
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeShortText(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '\u2026' : cleaned;
}

/**
 * Sanitiza atributos HTML (clases, ids, data-*)
 * @param {string} str
 * @returns {string}
 */
export function sanitizeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9\-_:.]/g, '');
}

/**
 * Sanitiza texto plano para innerText (no HTML)
 * @param {string} str
 * @returns {string}
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}