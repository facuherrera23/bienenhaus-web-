// shared/utils.js type declarations
export function showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
export function formatPrice(price: number, currency?: string): string;
export function formatDate(date: string | Date): string;
export function getInitials(name: string): string;
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T;
export function parsePipeArray(str: string): string[];