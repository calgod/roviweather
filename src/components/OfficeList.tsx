import type { Office, OfficeWeather, TemperatureUnit, WindSpeedUnit } from '../types/weather';
import { WeatherCard } from './WeatherCard';

interface OfficeListProps {
  offices: Office[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedOfficeId: string | null;
  onOfficeSelect: (officeId: string) => void;
  favoriteOfficeIds: string[];
  onFavoriteToggle: (officeId: string) => void;
  weatherByOfficeId: Record<string, OfficeWeather>;
  loadingByOfficeId: Record<string, boolean>;
  errorsByOfficeId: Record<string, string>;
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  currentTimeMs: number;
}

export const OfficeList = ({
  offices,
  searchTerm,
  onSearchTermChange,
  selectedOfficeId,
  onOfficeSelect,
  favoriteOfficeIds,
  onFavoriteToggle,
  weatherByOfficeId,
  loadingByOfficeId,
  errorsByOfficeId,
  temperatureUnit,
  windSpeedUnit,
  currentTimeMs
}: OfficeListProps) => {
  return (
    <section className="overflow-hidden rounded-3xl bg-white/70 p-3 shadow-card backdrop-blur-sm dark:bg-slate-900/70 xl:flex xl:h-full xl:flex-col">
      <h2 className="px-2 pb-3 pt-1 text-xl font-semibold text-ink dark:text-slate-100">Office Locations</h2>
      <div className="office-list-scroll rounded-2xl border border-slate-200 bg-white/55 p-4 dark:border-slate-700 dark:bg-slate-950/45 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="mb-4 flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a card to focus that office on the map. Starred offices appear first.
          </p>
          <label className="sr-only" htmlFor="office-search">
            Search office
          </label>
          <input
            id="office-search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search by office, city, or country"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none ring-accent/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {offices.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No offices match your search.</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {offices.map((office) => (
            <WeatherCard
              key={office.id}
              office={office}
              weather={weatherByOfficeId[office.id]}
              loading={loadingByOfficeId[office.id]}
              error={errorsByOfficeId[office.id]}
              temperatureUnit={temperatureUnit}
              windSpeedUnit={windSpeedUnit}
              currentTimeMs={currentTimeMs}
              isSelected={selectedOfficeId === office.id}
              onSelect={onOfficeSelect}
              isFavorite={favoriteOfficeIds.includes(office.id)}
              onToggleFavorite={onFavoriteToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
