export function formatPrice(price: number, currency = 'ARS', operation?: string): string {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'alquiler' ? '/mes' : '';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}
