import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { OfficeList } from './components/OfficeList';
import { MapView } from './components/MapView';
import { offices } from './data/offices';
import { useWeather } from './hooks/useWeather';
import type { TemperatureUnit, ThemeMode, WindSpeedUnit } from './types/weather';

const normalize = (value: string): string => value.trim().toLowerCase();
const US_TERRITORY_TIMEZONE_PREFIXES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Puerto_Rico',
  'Pacific/Guam',
  'Pacific/Saipan'
];

const isLikelyUSUser = (): boolean => {
  if (typeof navigator === 'undefined') {
    return true;
  }

  const languages = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  const hasUSLocale = languages.some((locale) => {
    try {
      return new Intl.Locale(locale).region === 'US';
    } catch {
      return locale.toUpperCase().includes('-US');
    }
  });

  if (hasUSLocale) {
    return true;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return US_TERRITORY_TIMEZONE_PREFIXES.includes(timeZone);
};

const formatLastUpdated = (timestampMs: number): string => {
  if (Number.isNaN(timestampMs)) {
    return 'Unavailable';
  }

  return new Date(timestampMs).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const THEME_STORAGE_KEY = 'roviweather-theme';
const FAVORITES_STORAGE_KEY = 'roviweather-favorite-offices';
const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialFavoriteOfficeIds = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validOfficeIds = new Set(offices.map((office) => office.id));
    return parsed.filter((value): value is string => typeof value === 'string' && validOfficeIds.has(value));
  } catch {
    return [];
  }
};

const getInitialUnitPreferences = (): { temperatureUnit: TemperatureUnit; windSpeedUnit: WindSpeedUnit } => {
  const usesUSUnits = isLikelyUSUser();
  return {
    temperatureUnit: usesUSUnits ? 'F' : 'C',
    windSpeedUnit: usesUSUnits ? 'mph' : 'km/h'
  };
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [favoriteOfficeIds, setFavoriteOfficeIds] = useState<string[]>(getInitialFavoriteOfficeIds);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(offices[0]?.id ?? null);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [unitPreferences, setUnitPreferences] = useState(getInitialUnitPreferences);
  const { weatherByOfficeId, errorsByOfficeId, loadingByOfficeId, isInitialLoading, refreshWeather } =
    useWeather(offices);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 30 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteOfficeIds));
  }, [favoriteOfficeIds]);

  const filteredOffices = useMemo(() => {
    const query = normalize(searchTerm);

    if (!query) {
      return offices;
    }

    return offices.filter((office) => {
      const bucket = `${office.name} ${office.city} ${office.country}`.toLowerCase();
      return bucket.includes(query);
    });
  }, [searchTerm]);

  const favoriteOfficeIdSet = useMemo(() => new Set(favoriteOfficeIds), [favoriteOfficeIds]);
  const prioritizedOffices = useMemo(() => {
    const favorites = filteredOffices.filter((office) => favoriteOfficeIdSet.has(office.id));
    const nonFavorites = filteredOffices.filter((office) => !favoriteOfficeIdSet.has(office.id));
    return [...favorites, ...nonFavorites];
  }, [favoriteOfficeIdSet, filteredOffices]);

  const hasAnyError = Object.keys(errorsByOfficeId).length > 0;
  const globalLastUpdated = useMemo(() => {
    const latestMs = Object.values(weatherByOfficeId).reduce<number | null>((acc, weather) => {
      const timestampMs = new Date(weather.updatedAt).getTime();
      if (Number.isNaN(timestampMs)) {
        return acc;
      }

      if (acc === null || timestampMs > acc) {
        return timestampMs;
      }

      return acc;
    }, null);

    return latestMs === null ? null : formatLastUpdated(latestMs);
  }, [weatherByOfficeId]);

  const handleOfficeSelect = (officeId: string) => {
    setSelectedOfficeId(officeId);

    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      const mapSection = document.getElementById('global-weather-map');
      mapSection?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  const handleFavoriteToggle = (officeId: string) => {
    setFavoriteOfficeIds((current) =>
      current.includes(officeId) ? current.filter((id) => id !== officeId) : [...current, officeId]
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f1e7] px-4 py-6 text-ink transition-colors dark:bg-gradient-to-br dark:from-[#0a1118] dark:via-[#111924] dark:to-[#16232e] dark:text-slate-100 sm:px-6 lg:px-10 lg:py-8 xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 xl:h-full">
        <header className="rounded-3xl bg-ink px-6 py-5 text-white shadow-card dark:bg-[#0b141c]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-accentSoft">RoviWeather</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Worldwide Office Weather</h1>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-end">
              <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 sm:justify-end">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/30 px-2.5 py-1.5">
                  <label className="text-xs font-medium text-accentSoft" htmlFor="temp-unit">
                    Temp
                  </label>
                  <select
                    id="temp-unit"
                    value={unitPreferences.temperatureUnit}
                    onChange={(event) =>
                      setUnitPreferences((current) => ({
                        ...current,
                        temperatureUnit: event.target.value as TemperatureUnit
                      }))
                    }
                    className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="F" className="text-ink">
                      °F
                    </option>
                    <option value="C" className="text-ink">
                      °C
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/30 px-2.5 py-1.5">
                  <label className="text-xs font-medium text-accentSoft" htmlFor="wind-unit">
                    Wind
                  </label>
                  <select
                    id="wind-unit"
                    value={unitPreferences.windSpeedUnit}
                    onChange={(event) =>
                      setUnitPreferences((current) => ({
                        ...current,
                        windSpeedUnit: event.target.value as WindSpeedUnit
                      }))
                    }
                    className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="mph" className="text-ink">
                      mph
                    </option>
                    <option value="m/s" className="text-ink">
                      m/s
                    </option>
                    <option value="km/h" className="text-ink">
                      km/h
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void refreshWeather()}
                  className="inline-flex w-fit items-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Refresh Weather
                </button>
                <button
                  type="button"
                  onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                </button>
              </div>
              <p className="w-full text-center text-xs text-accentSoft/90 sm:text-right">
                Last updated: {globalLastUpdated ?? 'Waiting for data...'}
              </p>
            </div>
          </div>
        </header>

        {isInitialLoading ? (
          <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-card dark:bg-slate-900/70 dark:text-slate-200">
            Loading weather data for all offices...
          </p>
        ) : null}

        {hasAnyError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-card dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Some office weather entries could not be loaded. The map and list still show all available data.
          </p>
        ) : null}

        <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.1fr_1fr]">
          <OfficeList
            offices={prioritizedOffices}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedOfficeId={selectedOfficeId}
            onOfficeSelect={handleOfficeSelect}
            favoriteOfficeIds={favoriteOfficeIdSet}
            onFavoriteToggle={handleFavoriteToggle}
            weatherByOfficeId={weatherByOfficeId}
            loadingByOfficeId={loadingByOfficeId}
            errorsByOfficeId={errorsByOfficeId}
            temperatureUnit={unitPreferences.temperatureUnit}
            windSpeedUnit={unitPreferences.windSpeedUnit}
            currentTimeMs={currentTimeMs}
          />
          <MapView
            offices={offices}
            weatherByOfficeId={weatherByOfficeId}
            errorsByOfficeId={errorsByOfficeId}
            temperatureUnit={unitPreferences.temperatureUnit}
            windSpeedUnit={unitPreferences.windSpeedUnit}
            selectedOfficeId={selectedOfficeId}
            onOfficeSelect={handleOfficeSelect}
            theme={theme}
          />
        </div>
        <footer className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-center text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
          This website is an independent project and is not affiliated with, endorsed by, or sponsored by The RoviSys
          Company.
        </footer>
      </div>
    </div>
  );
}

export default App;
