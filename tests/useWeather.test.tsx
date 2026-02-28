import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useWeather } from '../src/hooks/useWeather';
import type { Office } from '../src/types/weather';

const offices: Office[] = [
  {
    id: 'aurora',
    name: 'Aurora HQ',
    city: 'Aurora',
    country: 'USA',
    address: '1455 Danner Dr, Aurora, OH 44202',
    latitude: 41.3172,
    longitude: -81.3453
  }
];

describe('useWeather', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes successful worker response into per-office weather state', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          temperatureC: 20,
          condition: 'clear sky',
          icon: '01d',
          humidity: 48,
          windSpeedMps: 3.5,
          timezoneOffsetSeconds: -18000,
          observedAt: '2026-02-28T22:00:00.000Z',
          updatedAt: '2026-02-28T22:05:00.000Z'
        }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useWeather(offices));

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/weather?lat=41.3172&lon=-81.3453'),
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );

    expect(result.current.errorsByOfficeId).toEqual({});
    expect(result.current.loadingByOfficeId.aurora).toBe(false);
    expect(result.current.weatherByOfficeId.aurora).toMatchObject({
      temperatureC: 20,
      temperatureF: 68,
      condition: 'Clear sky',
      humidity: 48,
      windSpeedMps: 3.5,
      windSpeedMph: 7.8,
      windSpeedKph: 12.6,
      timezoneOffsetSeconds: -18000,
      iconUrl: 'https://openweathermap.org/img/wn/01d@2x.png'
    });
  });

  it('records errors per office when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useWeather(offices));

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(result.current.weatherByOfficeId).toEqual({});
    expect(result.current.errorsByOfficeId).toEqual({ aurora: 'network down' });
    expect(result.current.loadingByOfficeId.aurora).toBe(false);
  });
});
