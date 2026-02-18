# RoviSys Worldwide Weather App

React + TypeScript + Vite frontend styled with TailwindCSS and a Leaflet map, backed by a Cloudflare Worker proxy for OpenWeatherMap.

## Project Structure

- `src/` - Frontend app (list + cards + map + weather hook)
- `src/data/offices.ts` - RoviSys office location dataset with coordinates
- `worker/` - Cloudflare Worker proxy (`/weather?lat=<lat>&lon=<lon>`)

## Frontend Setup

1. Install dependencies and start Vite:

```bash
npm install && npm run dev
```

2. Frontend config is loaded from `.env`:

```bash
VITE_WEATHER_API_BASE=http://localhost:8787
```

If your worker is deployed, replace this with your deployed worker URL.

## Cloudflare Worker Setup

1. Install worker dependencies:

```bash
cd worker
npm install
```

2. Authenticate with Cloudflare (if needed):

```bash
npx wrangler login
```

3. Set the OpenWeatherMap API key as a secret (never expose in frontend):

```bash
npx wrangler secret put OPENWEATHER_API_KEY
```

For local development with `wrangler dev`, also create `worker/.dev.vars`:

```bash
cd worker
echo 'OPENWEATHER_API_KEY=your_openweather_api_key' > .dev.vars
```

4. Run locally:

```bash
npm run dev
```

5. Deploy:

```bash
npm run deploy
```

After deploy, point frontend `VITE_WEATHER_API_BASE` to the worker URL.

## Features Implemented

- Searchable office list for all provided RoviSys locations
- Weather cards showing:
  - Office name, city, country
  - Temperature in Fahrenheit and Celsius
  - Condition text and icon
  - Humidity
  - Wind speed (mph and m/s)
  - Last updated time
- Leaflet map with markers for all offices
- Marker popups with live weather details
- Custom weather hook (`src/hooks/useWeather.ts`) that calls the worker
- Loading and error states
- Worker-side 10 minute caching using `caches.default`

## Notes

- OpenWeatherMap free tier endpoint used: `data/2.5/weather`.
- The worker only accepts `GET /weather?lat=<lat>&lon=<lon>`.
- Caching key is normalized by rounded coordinates for higher cache hit rates.

## Troubleshooting 500 Errors

- `500` from worker often means the API key is missing locally. Ensure `worker/.dev.vars` contains `OPENWEATHER_API_KEY=...`.
- Verify worker directly:

```bash
curl "http://localhost:8787/weather?lat=41.27814&lon=-81.3289235"
```

- If key is invalid or not yet activated by OpenWeatherMap, worker returns `502` with upstream details.
- After changing `.env` or `.dev.vars`, restart both `npm run dev` processes.
