interface Env {
  OPENWEATHER_API_KEY: string;
}

const CACHE_TTL_SECONDS = 600;
const CACHE_SCHEMA_VERSION = '2';
const ALLOWED_ORIGIN = '*';

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`
};

const badRequest = (message: string, status = 400): Response => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: responseHeaders
  });
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: responseHeaders
      });
    }

    if (request.method !== 'GET') {
      return badRequest('Only GET is supported for this endpoint.', 405);
    }

    const url = new URL(request.url);

    if (url.pathname !== '/weather') {
      return badRequest('Not found.', 404);
    }

    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return badRequest('Valid lat and lon query parameters are required.');
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return badRequest('lat/lon are out of range.');
    }

    if (!env.OPENWEATHER_API_KEY) {
      return badRequest('Worker secret OPENWEATHER_API_KEY is not configured.', 500);
    }

    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&v=${CACHE_SCHEMA_VERSION}`,
      {
        method: 'GET'
      }
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          ...responseHeaders,
          'X-Cache': 'HIT'
        }
      });
    }

    const weatherUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    weatherUrl.searchParams.set('lat', String(lat));
    weatherUrl.searchParams.set('lon', String(lon));
    weatherUrl.searchParams.set('appid', env.OPENWEATHER_API_KEY);
    weatherUrl.searchParams.set('units', 'metric');

    const upstream = await fetch(weatherUrl.toString());

    if (!upstream.ok) {
      const detail = await upstream.text();
      return badRequest(`OpenWeatherMap request failed: ${upstream.status} ${detail}`, 502);
    }

    const source = (await upstream.json()) as {
      weather?: Array<{ main?: string; description?: string; icon?: string }>;
      wind?: { speed?: number };
      main?: { temp?: number; humidity?: number };
      dt?: number;
      timezone?: number;
    };

    const body = {
      temperatureC: source.main?.temp ?? 0,
      condition: source.weather?.[0]?.description ?? source.weather?.[0]?.main ?? 'Unknown',
      icon: source.weather?.[0]?.icon ?? '01d',
      humidity: source.main?.humidity ?? 0,
      windSpeedMps: source.wind?.speed ?? 0,
      timezoneOffsetSeconds: source.timezone ?? null,
      observedAt: source.dt ? new Date(source.dt * 1000).toISOString() : null,
      updatedAt: new Date().toISOString()
    };

    const response = new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...responseHeaders,
        'X-Cache': 'MISS'
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
