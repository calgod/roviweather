import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { Office, OfficeWeather, TemperatureUnit, WindSpeedUnit } from '../types/weather';

interface WeatherCardProps {
  office: Office;
  weather?: OfficeWeather;
  loading?: boolean;
  error?: string;
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  currentTimeMs: number;
  isSelected: boolean;
  onSelect: (officeId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (officeId: string) => void;
}

const formatLocalTime = (timezoneOffsetSeconds: number | null, currentTimeMs: number): string => {
  if (timezoneOffsetSeconds === null) {
    return 'Unavailable';
  }

  const localMs = currentTimeMs + timezoneOffsetSeconds * 1000;
  const localDate = new Date(localMs);

  return localDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
};

const locationSnapshotUrl = (latitude: number, longitude: number): string => {
  const lat = latitude.toFixed(5);
  const lon = longitude.toFixed(5);
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=14&size=640x260&markers=${lat},${lon},lightblue1`;
};

export const WeatherCard = ({
  office,
  weather,
  loading,
  error,
  temperatureUnit,
  windSpeedUnit,
  currentTimeMs,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite
}: WeatherCardProps) => {
  const fallbackImageUrl = useMemo(
    () => locationSnapshotUrl(office.latitude, office.longitude),
    [office.latitude, office.longitude]
  );
  const [imageSrc, setImageSrc] = useState(office.imageUrl ?? fallbackImageUrl);

  useEffect(() => {
    setImageSrc(office.imageUrl ?? fallbackImageUrl);
  }, [office.imageUrl, fallbackImageUrl]);

  const temperatureValue = temperatureUnit === 'F' ? weather?.temperatureF : weather?.temperatureC;
  const windValue =
    windSpeedUnit === 'mph' ? weather?.windSpeedMph : windSpeedUnit === 'km/h' ? weather?.windSpeedKph : weather?.windSpeedMps;
  const localTime = weather ? formatLocalTime(weather.timezoneOffsetSeconds, currentTimeMs) : null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(office.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(office.id);
        }
      }}
      className={`w-full rounded-2xl border bg-white/90 p-3 text-left shadow-card backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-slate-950/80 ${
        isSelected ? 'border-accent/70 ring-2 ring-accent/50' : 'border-slate-200 dark:border-slate-700'
      }`}
      aria-pressed={isSelected}
      aria-label={`Focus ${office.name} on map`}
    >
      <div className="relative mb-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <img
          src={imageSrc}
          alt={`Location snapshot for ${office.name}`}
          className="h-24 w-full object-cover"
          loading="lazy"
          onError={() => {
            if (imageSrc !== fallbackImageUrl) {
              setImageSrc(fallbackImageUrl);
            }
          }}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(office.id);
          }}
          className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm backdrop-blur-sm transition ${
            isFavorite
              ? 'border-amber-300 bg-amber-100/95 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
              : 'border-slate-300 bg-white/95 text-slate-500 hover:border-amber-300 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-400'
          }`}
          aria-label={isFavorite ? `Remove ${office.name} from favorites` : `Add ${office.name} to favorites`}
          title={isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star size={16} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <header className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink dark:text-slate-100">{office.name}</h3>
          <p className="truncate text-xs uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">
            {office.city}, {office.country}
          </p>
        </div>
        {weather ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">Local time</p>
            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">{localTime}</p>
          </div>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading current weather...</p> : null}
      {!loading && error ? <p className="text-sm text-red-600 dark:text-red-300">Weather unavailable: {error}</p> : null}

      {!loading && !error && weather ? (
        <div className="space-y-2 text-ink dark:text-slate-100">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/65 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/45">
            <div>
              <p className="text-[10px] uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">Temperature</p>
              <p className="text-3xl font-semibold leading-none text-slate-900 dark:text-slate-50">
                {temperatureValue}°{temperatureUnit}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <img src={weather.iconUrl} alt={weather.condition} className="h-10 w-10 shrink-0" loading="lazy" />
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Condition</p>
                  <p className="max-w-[8.5rem] truncate text-sm font-medium">{weather.condition}</p>
                </div>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900/35">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Humidity</dt>
              <dd className="mt-0.5 text-sm font-medium">{weather.humidity}%</dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900/35">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Wind</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {windValue} {windSpeedUnit}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </article>
  );
};
