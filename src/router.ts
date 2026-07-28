/**
 * Router - Simple Hash-based Router for SPA
 * Supports: routes with params, nested routes, guards, scroll restoration
 */
import { escapeHtml } from './utils/sanitize.ts';

interface RouteConfig {
  component: (() => Promise<{ default?: any }>) | string;
  guards?: Array<(_to: any, _from: any, _next: () => void) => any>;
  meta?: Record<string, any>;
}

interface RouteMatch {
  path: string;
  regex: RegExp;
  keys: string[];
  component: RouteConfig['component'];
  guards: RouteConfig['guards'];
  meta: RouteConfig['meta'];
}

interface NavigateTo {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  state: any;
  meta: Record<string, any>;
}

export class Router {
  #routes = new Map<string, RouteMatch>();
  #currentRoute: NavigateTo | null = null;
  #guards: Array<(_to: any, _from: any, _next: () => void) => any> = [];
  #scrollPositions = new Map<string, number>();
  #listening = false;

  add(path: string, config: RouteConfig): this {
    const keys: string[] = [];
    const pattern = path
      .replace(/\/+/g, '/')
      .replace(/:(\w+)/g, (_, key: string) => {
        keys.push(key);
        return '([^/]+)';
      })
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${pattern}$`);
    
    this.#routes.set(path, {
      path,
      regex,
      keys,
      component: config.component,
      guards: config.guards || [],
      meta: config.meta || {}
    });
    
    return this;
  }

  beforeEach(guard: (_to: any, _from: any, _next: () => void) => any): this {
    this.#guards.push(guard);
    return this;
  }

  async navigate(path: string, options: { replace?: boolean; state?: any } = {}): Promise<boolean> {
    const { replace = false, state = null } = options;
    const url = path.startsWith('/') ? path : `/${path}`;
    
    // Save scroll position for current route
    if (this.#currentRoute) {
      this.#scrollPositions.set(this.#currentRoute.path, window.scrollY);
    }

    // Run global guards
    for (const guard of this.#guards) {
      const result = await guard({ path: url, state }, this.#currentRoute, () => {});
      if (result === false) return false;
      if (typeof result === 'string') return this.navigate(result, { replace: true });
    }

    // Find matching route
    const match = this.#match(url);
    if (!match) {
      console.warn(`No route matched: ${url}`);
      return this.navigate('/404');
    }

    const { route, params } = match;
    const to: NavigateTo = { path: url, params, query: this.#parseQuery(url), state, meta: route.meta || {} };

    // Run route guards
    for (const guard of route.guards || []) {
      const result = await guard(to, this.#currentRoute, () => {});
      if (result === false) return false;
      if (typeof result === 'string') return this.navigate(result, { replace: true });
    }

    // Update URL
    if (replace) {
      history.replaceState(state, '', `#${url}`);
    } else {
      history.pushState(state, '', `#${url}`);
    }

    // Load component
    await this.#loadRoute(route, to);

    // Restore scroll position
    const savedScroll = this.#scrollPositions.get(url);
    if (savedScroll !== undefined) {
      requestAnimationFrame(() => window.scrollTo(0, savedScroll));
    } else {
      window.scrollTo(0, 0);
    }

    this.#currentRoute = to;
    return true;
  }

  start(): this {
    if (this.#listening) return this;

    const initialHash = window.location.hash.slice(1) || '/';
    this.navigate(initialHash, { replace: true });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || '/';
      this.navigate(hash, { replace: false });
    });

    this.#listening = true;
    return this;
  }

  getCurrentRoute(): NavigateTo | null {
    return this.#currentRoute;
  }

  generate(path: string, params: Record<string, string> = {}): string {
    return path.replace(/:(\w+)/g, (_, key: string) => params[key] || '');
  }

  #match(url: string): { route: RouteMatch; params: Record<string, string> } | null {
    const [pathname] = url.split('?');
    for (const route of this.#routes.values()) {
      const match = pathname.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key: string, i: number) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  #parseQuery(url: string): Record<string, string> {
    const [, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    const result: Record<string, string> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  async #loadRoute(route: RouteMatch, to: NavigateTo): Promise<void> {
    const outlet = document.getElementById('app-outlet');
    if (!outlet) {
      console.error('Router outlet not found: #app-outlet');
      return;
    }

    outlet.innerHTML = '<div class="spinner-overlay active"><div class="spinner"></div></div>';

    try {
      if (typeof route.component === 'function') {
        const module = await route.component();
        const Component = module.default || module;
        
        if (typeof Component === 'function') {
          const instance = new Component(to.params, to.query);
          if (instance.render) {
            outlet.innerHTML = '';
            outlet.appendChild(instance.render());
          }
          if (instance.mount) {
            instance.mount(outlet);
          }
        } else if (typeof Component === 'string') {
          outlet.innerHTML = Component;
        }
      } else if (typeof route.component === 'string') {
        outlet.innerHTML = route.component;
      }
    } catch (error) {
      console.error('Route load error:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      outlet.innerHTML = `
        <div class="section" style="text-align:center;padding:4rem;">
          <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--color-warning);margin-bottom:1rem;"></i>
          <h2>Error cargando la página</h2>
          <p style="color:var(--color-gray-500);margin-top:1rem;">${escapeHtml(msg)}</p>
          <button class="btn btn-primary mt-4" onclick="window.location.reload()">Recargar</button>
        </div>
      `;
    }
  }
}

// Singleton instance
export const router = new Router();

// Helper for lazy loading components
export function lazyLoad(importFn: () => Promise<any>): () => Promise<{ default?: any }> {
  return () => importFn().then(module => ({ default: module.default || module }));
}

// Helper for defining routes
export function defineRoutes(routes: Array<{ path: string; component: RouteConfig['component']; guards?: RouteConfig['guards']; meta?: RouteConfig['meta'] }>): Router {
  routes.forEach(({ path, component, guards, meta }) => {
    router.add(path, { component, guards, meta });
  });
  return router;
}

export default router;
