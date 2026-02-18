import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Office, OfficeWeather, WorkerWeatherResponse } from '../types/weather';

const WEATHER_BASE_URL = import.meta.env.VITE_WEATHER_API_BASE ?? 'http://localhost:8787';

interface WeatherState {
  weatherByOfficeId: Record<string, OfficeWeather>;
  errorsByOfficeId: Record<string, string>;
  loadingByOfficeId: Record<string, boolean>;
  isInitialLoading: boolean;
  refreshWeather: () => Promise<void>;
}

type WeatherFetchResult =
  | { officeId: string; weather: OfficeWeather }
  | { officeId: string; error: string };

const mpsToMph = (mps: number): number => Number((mps * 2.23694).toFixed(1));
const mpsToKph = (mps: number): number => Number((mps * 3.6).toFixed(1));
const cToF = (celsius: number): number => Number((celsius * 1.8 + 32).toFixed(1));
const capitalizeFirst = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const buildLoadingState = (officeIds: string[], value: boolean): Record<string, boolean> =>
  officeIds.reduce<Record<string, boolean>>((acc, officeId) => {
    acc[officeId] = value;
    return acc;
  }, {});

export const useWeather = (offices: Office[]): WeatherState => {
  const officeIds = useMemo(() => offices.map((office) => office.id), [offices]);
  const [weatherByOfficeId, setWeatherByOfficeId] = useState<Record<string, OfficeWeather>>({});
  const [errorsByOfficeId, setErrorsByOfficeId] = useState<Record<string, string>>({});
  const [loadingByOfficeId, setLoadingByOfficeId] = useState<Record<string, boolean>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const refreshWeather = useCallback(async () => {
    setLoadingByOfficeId(buildLoadingState(officeIds, true));

    const fetchJobs = offices.map(async (office): Promise<WeatherFetchResult> => {
      const endpoint = `${WEATHER_BASE_URL}/weather?lat=${office.latitude}&lon=${office.longitude}`;

      try {
        const response = await fetch(endpoint, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const data = (await response.json()) as WorkerWeatherResponse;
        const normalized: OfficeWeather = {
          temperatureC: Number(data.temperatureC.toFixed(1)),
          temperatureF: cToF(data.temperatureC),
          condition: capitalizeFirst(data.condition),
          iconUrl: `https://openweathermap.org/img/wn/${data.icon}@2x.png`,
          humidity: data.humidity,
          windSpeedMps: Number(data.windSpeedMps.toFixed(1)),
          windSpeedMph: mpsToMph(data.windSpeedMps),
          windSpeedKph: mpsToKph(data.windSpeedMps),
          timezoneOffsetSeconds: data.timezoneOffsetSeconds ?? null,
          observedAt: data.observedAt,
          updatedAt: data.updatedAt
        };

        return { officeId: office.id, weather: normalized };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown weather fetch error';
        return { officeId: office.id, error: message };
      }
    });

    const results = await Promise.all(fetchJobs);

    const nextWeather: Record<string, OfficeWeather> = {};
    const nextErrors: Record<string, string> = {};

    for (const result of results) {
      if ('weather' in result) {
        nextWeather[result.officeId] = result.weather;
      }

      if ('error' in result) {
        nextErrors[result.officeId] = result.error;
      }
    }

    setWeatherByOfficeId(nextWeather);
    setErrorsByOfficeId(nextErrors);
    setLoadingByOfficeId(buildLoadingState(officeIds, false));
    setIsInitialLoading(false);
  }, [officeIds, offices]);

  useEffect(() => {
    void refreshWeather();
    const intervalId = window.setInterval(() => {
      void refreshWeather();
    }, 10 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshWeather]);

  return {
    weatherByOfficeId,
    errorsByOfficeId,
    loadingByOfficeId,
    isInitialLoading,
    refreshWeather
  };
};
