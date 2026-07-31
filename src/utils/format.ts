/**
 * Format utilities - canonical implementations
 * Used by both public site and admin panel
 */

export function formatPrice(
  price: number, 
  currency: 'ARS' | 'USD' = 'ARS', 
  operation: 'venta' | 'alquiler' | 'venta' | 'alquiler' = 'venta'
): string {
  const isUSD = currency === 'USD';
  const isRent = operation === 'alquiler' || operation === 'rent';
  
  const symbol = isUSD ? 'U$S' : '$';
  const suffix = isRent ? '/mes' : '';
  
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}

export function formatPriceParts(
  price: number, 
  currency: 'ARS' | 'USD' = 'ARS', 
  operation: 'venta' | 'alquiler' | 'sale' | 'rent' = 'venta'
): { amount: string; period: string } {
  const isUSD = price >= 1000000 || currency === 'USD'; // heuristic for USD
  const isRent = operation === 'alquiler' || operation === 'rent';
  
  const symbol = isUSD ? 'U$S' : '$';
  const suffix = isRent ? '/mes' : '';
  
  return {
    amount: Number(price).toLocaleString('es-AR'),
    period: suffix
  };
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} d`;
  return formatDate(dateString);
}
