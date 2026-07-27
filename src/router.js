/**
 * Router - Simple Hash-based Router for SPA
 * Supports: routes with params, nested routes, guards, scroll restoration
 */

export class Router {
  #routes = new Map();
  #currentRoute = null;
  #guards = [];
  #scrollPositions = new Map();
  #listening = false;

  /**
   * Add a route
   * @param {string} path - Route path (e.g., '/propiedades', '/propiedad/:id')
   * @param {Object} config - Route config { component, guards?, meta? }
   */
  add(path, config) {
    const keys = [];
    const pattern = path
      .replace(/\/+/g, '/')
      .replace(/:(\w+)/g, (_, key) => {
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

  /**
   * Add global navigation guard
   * @param {Function} guard - async (to, from, next) => void
   */
  beforeEach(guard) {
    this.#guards.push(guard);
    return this;
  }

  /**
   * Navigate to a path
   * @param {string} path - Target path
   * @param {Object} options - { replace?: boolean, state?: any }
   */
  async navigate(path, options = {}) {
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
    const to = { path: url, params, query: this.#parseQuery(url), state, meta: route.meta };

    // Run route guards
    for (const guard of route.guards) {
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

  /**
   * Start listening for hash changes
   */
  start() {
    if (this.#listening) return;
    return this;
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.#currentRoute;
  }

  /**
   * Generate URL with params
   * @param {string} path - Route path with params
   * @param {Object} params - Params to replace
   */
  generate(path, params = {}) {
    return path.replace(/:(\w+)/g, (_, key) => params[key] || '');
  }

  // Private methods
  #match(url) {
    const [pathname] = url.split('?');
    for (const route of this.#routes.values()) {
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  #parseQuery(url) {
    const [, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  async #loadRoute(route, to) {
    const outlet = document.getElementById('app-outlet');
    if (!outlet) {
      console.error('Router outlet not found: #app-outlet');
      return;
    }

    // Show loading
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
      outlet.innerHTML = `
        <div class="section" style="text-align:center;padding:4rem;">
          <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--color-warning);margin-bottom:1rem;"></i>
          <h2>Error cargando la página</h2>
          <p style="color:var(--color-gray-500);margin-top:1rem;">${error.message}</p>
          <button class="btn btn-primary mt-4" onclick="window.location.reload()">Recargar</button>
        </div>
      `;
    }
  }
}

// Singleton instance
export const router = new Router();

// Helper for lazy loading components
export function lazyLoad(importFn) {
  return () => importFn().then(module => ({ default: module.default || module }));
}

// Helper for defining routes
export function defineRoutes(routes) {
  routes.forEach(({ path, component, guards, meta }) => {
    router.add(path, { component, guards, meta });
  });
  return router;
}

export default router;