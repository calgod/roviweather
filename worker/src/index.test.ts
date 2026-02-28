import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

const createCtx = (): {
  ctx: ExecutionContext;
  waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>;
} => {
  const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
  const ctx = {
    waitUntil,
    passThroughOnException: vi.fn()
  } as unknown as ExecutionContext;

  return { ctx, waitUntil };
};

const createCache = () => ({
  match: vi.fn(),
  put: vi.fn()
});

describe('worker /weather endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 500 when OPENWEATHER_API_KEY is missing', async () => {
    const { ctx } = createCtx();
    const request = new Request('https://example.com/weather?lat=41.3&lon=-81.3');
    const response = await worker.fetch(request, { OPENWEATHER_API_KEY: '' }, ctx);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Worker secret OPENWEATHER_API_KEY is not configured.'
    });
  });

  it('returns 400 for invalid coordinates', async () => {
    const { ctx } = createCtx();
    const request = new Request('https://example.com/weather?lat=abc&lon=-81.3');
    const response = await worker.fetch(request, { OPENWEATHER_API_KEY: 'test-key' }, ctx);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Valid lat and lon query parameters are required.'
    });
  });

  it('returns cached response on cache hit', async () => {
    const { ctx } = createCtx();
    const cache = createCache();
    cache.match.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          temperatureC: 10,
          condition: 'Cloudy'
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('caches', { default: cache } as unknown as CacheStorage);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const request = new Request('https://example.com/weather?lat=41.3&lon=-81.3');
    const response = await worker.fetch(request, { OPENWEATHER_API_KEY: 'test-key' }, ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('HIT');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches upstream and caches response on cache miss', async () => {
    const cache = createCache();
    cache.match.mockResolvedValueOnce(undefined);
    vi.stubGlobal('caches', { default: cache } as unknown as CacheStorage);

    const upstreamFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          weather: [{ description: 'clear sky', icon: '01d' }],
          wind: { speed: 2.6 },
          main: { temp: 25.2, humidity: 36 },
          dt: 1700000000,
          timezone: -18000
        }),
        { status: 200 }
      )
    );

    const { ctx, waitUntil } = createCtx();
    const request = new Request('https://example.com/weather?lat=41.3&lon=-81.3');
    const response = await worker.fetch(request, { OPENWEATHER_API_KEY: 'test-key' }, ctx);
    const payload = await response.json();

    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('MISS');
    expect(payload).toMatchObject({
      temperatureC: 25.2,
      condition: 'clear sky',
      icon: '01d',
      humidity: 36,
      windSpeedMps: 2.6,
      timezoneOffsetSeconds: -18000
    });
    expect(cache.put).toHaveBeenCalledOnce();
    expect(waitUntil).toHaveBeenCalledOnce();
  });
});
