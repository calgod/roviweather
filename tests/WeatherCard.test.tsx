import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeatherCard } from '../src/components/WeatherCard';
import type { Office, OfficeWeather } from '../src/types/weather';

const office: Office = {
  id: 'tempe',
  name: 'Tempe Office',
  city: 'Tempe',
  country: 'USA',
  address: '100 S Mill Ave, Tempe, AZ 85281',
  latitude: 33.4255,
  longitude: -111.94
};

const weather: OfficeWeather = {
  temperatureC: 26.4,
  temperatureF: 79.5,
  condition: 'Scattered clouds',
  iconUrl: 'https://openweathermap.org/img/wn/03d@2x.png',
  humidity: 42,
  windSpeedMps: 2.1,
  windSpeedMph: 4.7,
  windSpeedKph: 7.6,
  timezoneOffsetSeconds: 0,
  observedAt: '2026-02-28T22:00:00.000Z',
  updatedAt: '2026-02-28T22:05:00.000Z'
};

describe('WeatherCard', () => {
  it('renders weather details with selected units and local time', () => {
    render(
      <WeatherCard
        office={office}
        weather={weather}
        temperatureUnit="F"
        windSpeedUnit="mph"
        currentTimeMs={Date.UTC(2026, 1, 28, 22, 6, 0)}
        isSelected={false}
        onSelect={vi.fn()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Tempe Office' })).toBeInTheDocument();
    expect(screen.getByText('79.5°F')).toBeInTheDocument();
    expect(screen.getByText('Scattered clouds')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('4.7 mph')).toBeInTheDocument();
    expect(screen.getByText('Local time')).toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('calls selection and favorite handlers', () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();

    render(
      <WeatherCard
        office={office}
        weather={weather}
        temperatureUnit="C"
        windSpeedUnit="km/h"
        currentTimeMs={Date.now()}
        isSelected={false}
        onSelect={onSelect}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focus Tempe Office on map' }));
    expect(onSelect).toHaveBeenCalledWith('tempe');

    fireEvent.click(screen.getByRole('button', { name: 'Add Tempe Office to favorites' }));
    expect(onToggleFavorite).toHaveBeenCalledWith('tempe');
  });
});
