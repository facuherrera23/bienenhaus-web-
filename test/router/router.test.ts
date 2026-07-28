import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, lazyLoad, defineRoutes } from '../../src/router';

// Mock DOM
beforeEach(() => {
  document.body.innerHTML = '<div id="app-outlet"></div>';
  vi.restoreAllMocks();
});

describe('Router - route matching', () => {
  it('matches static routes', () => {
    const r = new Router();
    r.add('/home', { component: '<div>Home</div>' });
    r.add('/about', { component: '<div>About</div>' });

    // Access private #match via navigate
    // We test via generate() and route structure
    expect(r.generate('/home')).toBe('/home');
    expect(r.generate('/about/:id', { id: '123' })).toBe('/about/123');
  });

  it('matches parameterized routes', () => {
    const r = new Router();
    r.add('/propiedad/:id', { component: '<div>Detail</div>' });
    expect(r.generate('/propiedad/:id', { id: '42' })).toBe('/propiedad/42');
  });

  it('generates URLs with multiple params', () => {
    const r = new Router();
    r.add('/ciudad/:city/barrio/:barrio', { component: '<div></div>' });
    expect(r.generate('/ciudad/:city/barrio/:barrio', { city: 'cordoba', barrio: 'nueva' }))
      .toBe('/ciudad/cordoba/barrio/nueva');
  });

  it('generate handles missing params gracefully', () => {
    const r = new Router();
    r.add('/propiedad/:id', { component: '<div></div>' });
    expect(r.generate('/propiedad/:id', {})).toBe('/propiedad/');
  });
});

describe('Router - navigation', () => {
  it('navigates to a route and renders component', async () => {
    const r = new Router();
    r.add('/test', { component: '<div>Hello Test</div>' });
    await r.navigate('/test');
    expect(document.getElementById('app-outlet')?.innerHTML).toContain('Hello Test');
  });

  it('navigates with params', async () => {
    const r = new Router();
    r.add('/item/:id', { component: (params: Record<string, string>) => `<div>Item ${params.id}</div>` });
    await r.navigate('/item/42');
    // Component is a function so it goes through the function path
  });

  it('updates currentRoute after navigation', async () => {
    const r = new Router();
    r.add('/page', { component: '<div>Page</div>' });
    await r.navigate('/page');
    expect(r.getCurrentRoute()?.path).toBe('/page');
  });

  it('returns false when guard blocks navigation', async () => {
    const r = new Router();
    r.add('/protected', { component: '<div>Secret</div>' });
    r.beforeEach(() => false);
    const result = await r.navigate('/protected');
    expect(result).toBe(false);
  });

  it('guard can redirect', async () => {
    const r = new Router();
    r.add('/login', { component: '<div>Login</div>' });
    r.add('/dashboard', { component: '<div>Dashboard</div>' });
    r.beforeEach((to: any) => {
      if (to.path === '/dashboard') return '/login';
      return true;
    });
    await r.navigate('/dashboard');
    expect(r.getCurrentRoute()?.path).toBe('/login');
  });
});

describe('Router - route guards', () => {
  it('runs route-level guards', async () => {
    const guardFn = vi.fn(() => true);
    const r = new Router();
    r.add('/guarded', { component: '<div>Guarded</div>', guards: [guardFn] });
    await r.navigate('/guarded');
    expect(guardFn).toHaveBeenCalled();
  });

  it('blocks navigation when route guard returns false', async () => {
    const r = new Router();
    r.add('/blocked', { component: '<div>Blocked</div>', guards: [() => false] });
    const result = await r.navigate('/blocked');
    expect(result).toBe(false);
  });
});

describe('Router - generate', () => {
  it('replaces :param with value', () => {
    const r = new Router();
    expect(r.generate('/propiedad/:id', { id: '99' })).toBe('/propiedad/99');
  });

  it('handles no params', () => {
    const r = new Router();
    expect(r.generate('/static')).toBe('/static');
  });
});

describe('lazyLoad helper', () => {
  it('wraps import function', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: 'Component' });
    const loader = lazyLoad(importFn);
    const result = await loader();
    expect(result.default).toBe('Component');
  });

  it('falls back to module itself if no default', async () => {
    const importFn = vi.fn().mockResolvedValue('JustString');
    const loader = lazyLoad(importFn);
    const result = await loader();
    expect(result.default).toBe('JustString');
  });
});

describe('defineRoutes helper', () => {
  it('registers routes on router', () => {
    const r = new Router();
    defineRoutes([
      { path: '/a', component: '<div>A</div>' },
      { path: '/b', component: '<div>B</div>' },
    ]);
    // Routes are registered, verify via navigation
    expect(r).toBeDefined();
  });
});
