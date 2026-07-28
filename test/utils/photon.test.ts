import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAutocomplete } from '../../src/utils/photon';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('searchPhoton (via autocomplete)', () => {
  it('returns empty for queries shorter than minQueryLength', async () => {
    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    const results = await ac.search('a');
    expect(results).toEqual([]);
    ac.clear();
  });

  it('calls fetch with correct Photon URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    await ac.search('Córdoba');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('photon.komoot.io');
    expect(url).toContain('q=C');
    ac.clear();
  });

  it('returns parsed results from Photon', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [-64.18, -31.42] },
            properties: {
              name: 'Córdoba',
              city: 'Córdoba',
              state: 'Córdoba',
              country: 'Argentina',
              type: 'city',
              osm_id: 123,
              osm_type: 'R',
            },
          },
        ],
      }),
    });

    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    const results = await ac.search('Córdoba');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Córdoba');
    expect(results[0].lat).toBe(-31.42);
    expect(results[0].lng).toBe(-64.18);
    expect(results[0].country).toBe('Argentina');
    ac.clear();
  });

  it('returns empty array on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    const results = await ac.search('Córdoba');

    expect(results).toEqual([]);
    ac.clear();
  });
});

describe('createAutocomplete', () => {
  it('caches results for repeated queries', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    await ac.search('Córdoba');
    await ac.search('Córdoba');

    // Second call should hit cache, not fetch again
    expect(mockFetch).toHaveBeenCalledTimes(1);
    ac.clear();
  });

  it('clear resets cache and state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const ac = createAutocomplete({ debounceMs: 0, minQueryLength: 2 });
    await ac.search('Córdoba');
    expect(ac.getCached('Córdoba')).not.toBeNull();

    ac.clear();
    expect(ac.getCached('Córdoba')).toBeNull();
  });

  it('getCached returns null for unknown queries', () => {
    const ac = createAutocomplete();
    expect(ac.getCached('unknown')).toBeNull();
    ac.clear();
  });
});
