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
      className={`w-full rounded-2xl border bg-white/90 p-4 text-left shadow-card backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-slate-950/80 ${
        isSelected ? 'border-accent/70 ring-2 ring-accent/50' : 'border-slate-200 dark:border-slate-700'
      }`}
      aria-pressed={isSelected}
      aria-label={`Focus ${office.name} on map`}
    >
      <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <img
          src={imageSrc}
          alt={`Location snapshot for ${office.name}`}
          className="h-28 w-full object-cover"
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
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink dark:text-slate-100">{office.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {office.city}, {office.country}
          </p>
        </div>
        {weather ? <img src={weather.iconUrl} alt={weather.condition} className="h-12 w-12" loading="lazy" /> : null}
      </header>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading current weather...</p> : null}
      {!loading && error ? <p className="text-sm text-red-600 dark:text-red-300">Weather unavailable: {error}</p> : null}

      {!loading && !error && weather ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-ink dark:text-slate-100">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Temperature</dt>
            <dd className="font-medium">{temperatureValue}°{temperatureUnit}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Condition</dt>
            <dd className="font-medium">{weather.condition}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Humidity</dt>
            <dd className="font-medium">{weather.humidity}%</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Wind</dt>
            <dd className="font-medium">
              {windValue} {windSpeedUnit}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Current time</dt>
            <dd className="font-medium">{formatLocalTime(weather.timezoneOffsetSeconds, currentTimeMs)}</dd>
          </div>
        </dl>
      ) : null}
    </article>
  );
};
