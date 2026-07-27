// ================================================================
// TEST SETUP - Vitest configuration for Bienenhaus
// ================================================================

import { vi } from 'vitest';

// Mock Supabase
vi.mock('./supabase.js', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  };
  return { supabase: mockSupabase };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock navigator.geolocation
const geolocationMock = {
  getCurrentPosition: vi.fn((success) => success({
    coords: { latitude: -31.42, longitude: -64.18, accuracy: 100 }
  }),
  watchPosition: vi.fn()
});
Object.defineProperty(navigator, 'geolocation', {
  value: geolocationMock,
  configurable: true
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback) { this.callback = callback; }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = IntersectionObserverMock;

// Mock ResizeObserver
class ResizeObserverMock {
  constructor(callback) { this.callback = callback; }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock;

// Mock matchMedia
window.matchMedia = vi.fn(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob()),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
});

// Mock crypto.subtle.digest
if (typeof crypto !== 'undefined' && crypto.subtle) {
  crypto.subtle.digest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
}

// Suppress console.error in tests unless explicitly testing errors
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('act(')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Mock timers
vi.useFakeTimers();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  document.body.innerHTML = '';
});

// Global test utilities
const testUtils = {
  render: (component) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    if (typeof component === 'function') {
      container.innerHTML = component();
    } else {
      container.appendChild(component);
    }
    return {
      container,
      querySelector: (sel) => container.querySelector(sel),
      querySelectorAll: (sel) => container.querySelectorAll(sel),
      getByText: (text) => container.querySelector(`:contains(${text})`),
      getByRole: (role) => container.querySelector(`[role="${role}"]`),
      getByLabelText: (text) => container.querySelector(`[aria-label="${text}"]`),
      unmount: () => container.remove()
    };
  },
  
  waitFor: (callback) => {
    return new Promise((resolve) => {
      const check = () => {
        try {
          callback();
          resolve();
        } catch (e) {
          setTimeout(check, 10);
        }
      };
      check();
    },
    
    fireEvent: {
      click: function(element) { element.click(); },
      change: function(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      },
      input: function(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      },
      submit: function(form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      },
      keyDown: function(element, key) {
        element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }
    }
  };

// Assign to global after all definitions
global.testUtils = testUtils;