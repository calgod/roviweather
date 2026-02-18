export interface Office {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

export type TemperatureUnit = 'F' | 'C';
export type WindSpeedUnit = 'mph' | 'm/s' | 'km/h';
export type ThemeMode = 'light' | 'dark';

export interface WorkerWeatherResponse {
  temperatureC: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeedMps: number;
  timezoneOffsetSeconds: number | null;
  observedAt: string | null;
  updatedAt: string;
}

export interface OfficeWeather {
  temperatureC: number;
  temperatureF: number;
  condition: string;
  iconUrl: string;
  humidity: number;
  windSpeedMps: number;
  windSpeedMph: number;
  windSpeedKph: number;
  timezoneOffsetSeconds: number | null;
  observedAt: string | null;
  updatedAt: string;
}
