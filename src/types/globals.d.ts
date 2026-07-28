// Type declarations for local modules without types
// supabase.js
declare module '../../supabase.js' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient<any>;
  export function handleSupabaseError(error: any, context: string): never;
}

declare module '../../../supabase.js' {
  export const supabase: SupabaseClient<any>;
  export function handleSupabaseError(error: any, context: string): never;
}

declare module '../supabase.js' {
  export const supabase: SupabaseClient<any>;
  export function handleSupabaseError(error: any, context: string): never;
}

// cloudinary.js
declare module '../../cloudinary.js' {
  import { CONFIG } from '../../config.js';

  const CLOUDINARY_UPLOAD_URL: string;

  export async function uploadToCloudinary(file: File, folder: string, preset: string): Promise<{ url: string; public_id: string }>;
  export async function uploadMultipleToCloudinary(files: FileList, folder: string, preset: string, maxFiles?: number): Promise<Array<{ url: string; public_id: string; orden: number; es_principal: boolean }>>;
  export function validateImageFile(file: File): boolean;
}

declare module '../../../cloudinary.js' {
  import { CONFIG } from '../../../config.js';

  const CLOUDINARY_UPLOAD_URL: string;

  export async function uploadToCloudinary(file: File, folder: string, preset: string): Promise<{ url: string; public_id: string }>;
  export async function uploadMultipleToCloudinary(files: FileList, folder: string, preset: string, maxFiles?: number): Promise<Array<{ url: string; public_id: string; orden: number; es_principal: boolean }>>;
  export function validateImageFile(file: File): boolean;
}

declare module '../cloudinary.js' {
  import { CONFIG } from '../config.js';

  const CLOUDINARY_UPLOAD_URL: string;

  export async function uploadToCloudinary(file: File, folder: string, preset: string): Promise<{ url: string; public_id: string }>;
  export async function uploadMultipleToCloudinary(files: FileList, folder: string, preset: string, maxFiles?: number): Promise<Array<{ url: string; public_id: string; orden: number; es_principal: boolean }>>;
  export function validateImageFile(file: File): boolean;
}

// config.js
declare module '../../config.js' {
  export interface Config {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_UPLOAD_PRESET_PROPS: string;
    CLOUDINARY_UPLOAD_PRESET_AGENTES: string;
    ADMIN_EMAIL: string;
    WHATSAPP_NUMBER: string;
    ENABLE_ADMIN_PANEL: boolean;
  }

  export const CONFIG: Config;
}

declare module '../../../config.js' {
  export interface Config {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_UPLOAD_PRESET_PROPS: string;
    CLOUDINARY_UPLOAD_PRESET_AGENTES: string;
    ADMIN_EMAIL: string;
    WHATSAPP_NUMBER: string;
    ENABLE_ADMIN_PANEL: boolean;
  }

  export const CONFIG: Config;
}

declare module '../config.js' {
  export interface Config {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_UPLOAD_PRESET_PROPS: string;
    CLOUDINARY_UPLOAD_PRESET_AGENTES: string;
    ADMIN_EMAIL: string;
    WHATSAPP_NUMBER: string;
    ENABLE_ADMIN_PANEL: boolean;
  }

  export const CONFIG: Config;
}

// Shared utils
declare module '../../shared/utils.js' {
  export function showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  export function formatPrice(price: number, currency?: string): string;
  export function formatDate(date: string | Date): string;
  export function getInitials(name: string): string;
  export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T;
  export function parsePipeArray(str: string): string[];
}

declare module '../../../shared/utils.js' {
  export function showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  export function formatPrice(price: number, currency?: string): string;
  export function formatDate(date: string | Date): string;
  export function getInitials(name: string): string;
  export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T;
  export function parsePipeArray(str: string): string[];
}

declare module '../shared/utils.js' {
  export function showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  export function formatPrice(price: number, currency?: string): string;
  export function formatDate(date: string | Date): string;
  export function getInitials(name: string): string;
  export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T;
  export function parsePipeArray(str: string): string[];
}

// Shared utils (admin)
declare module '../../admin/shared/utils.ts' {
  export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  export function formatPrice(price: number, currency?: string, operation?: string): string;
  export function formatDate(dateString: string): string;
  export function getInitials(name: string): string;
  export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T;
  export function parsePipeArray(value: string, fields: string[]): Record<string, string>[];
  export function confirmDelete(type: string, id: number, name: string): void;
  export function closeConfirmModal(): void;
  export function executeDelete(): Promise<void>;
}

declare module '../shared/utils.ts' {
  export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  export function formatPrice(price: number, currency?: string, operation?: string): string;
  export function formatDate(dateString: string): string;
  export function getInitials(name: string): string;
  export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T;
  export function parsePipeArray(value: string, fields: string[]): Record<string, string>[];
  export function confirmDelete(type: string, id: number, name: string): void;
  export function closeConfirmModal(): void;
  export function executeDelete(): Promise<void>;
}

// DOM types for form elements
interface HTMLInputElement {
  value: string;
  checked: boolean;
  files: FileList | null;
  select(): void;
}

interface HTMLSelectElement {
  value: string;
}

interface HTMLTextAreaElement {
  value: string;
}

interface HTMLFormElement {
  reset(): void;
}

interface HTMLElement {
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  style: CSSStyleDeclaration;
  dataset: DOMStringMap;
}

interface Element {
  href?: string;
  style?: CSSStyleDeclaration;
  closest(selector: string): Element | null;
  clientX?: number;
  offsetWidth?: number;
}

interface Event {
  key?: string;
  shiftKey?: boolean;
  currentTarget: EventTarget & HTMLElement;
  target: EventTarget & HTMLElement;
}

interface MouseEvent {
  clientX: number;
}

// Global types for browser APIs and window properties
interface Window {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  openPropertyModal: (property: any) => void;
  closePropertyModal: () => void;
  editProperty: (id: number) => void;
  cloneProperty: (id: number) => void;
  confirmDelete: (type: string, id: number, name: string) => void;
  filterProperties: () => void;
  filterAgents: () => void;
  abrirAdmin: () => void;
  showSpinner: () => void;
  hideSpinner: () => void;
  cargarContenidoSitio: () => Promise<void>;
  recargarContenido: () => Promise<void>;
  gtag: (...args: any[]) => void;
  fbq: (...args: any[]) => void;
  dataLayer: any[];
  performance: Performance;
  PerformanceObserver: {
    new (callback: (entries: PerformanceObserverEntryList, observer: PerformanceObserver) => void): PerformanceObserver;
    observe(options: { type: string; buffered?: boolean }): void;
    disconnect(): void;
    takeRecords(): PerformanceEntry[];
  };
  AbortController: {
    new (): AbortController;
    prototype: AbortController;
  };
  AbortSignal: {
    prototype: AbortSignal;
  };
}

interface Performance {
  now(): number;
  mark(name: string): void;
  measure(name: string, startMark?: string, endMark?: string): void;
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
  getEntriesByType(type: string): PerformanceEntry[];
  getEntries(): PerformanceEntry[];
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
  timing: PerformanceTiming;
  navigation: PerformanceNavigation;
}

interface PerformanceTiming {
  navigationStart: number;
  unloadEventStart: number;
  unloadEventEnd: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domLoading: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
}

interface PerformanceNavigation {
  type: number;
  redirectCount: number;
}

interface PerformanceObserverEntryList {
  getEntries(): PerformanceEntry[];
  getEntriesByType(type: string): PerformanceEntry[];
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
}

interface AbortController {
  signal: AbortSignal;
  abort(reason?: any): void;
}

interface AbortSignal {
  aborted: boolean;
  reason: any;
  onabort: ((this: AbortSignal, ev: Event) => any) | null;
  addEventListener(type: 'abort', listener: (this: AbortSignal, ev: Event) => any): void;
  removeEventListener(type: 'abort', listener: (this: AbortSignal, ev: Event) => any): void;
}