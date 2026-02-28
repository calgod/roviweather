import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Office, OfficeWeather, TemperatureUnit, ThemeMode, WindSpeedUnit } from '../types/weather';

const mapMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const darkMapMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'rovi-marker-pin rovi-marker-pin--dark'
});

const darkMapMarkerSelectedIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'rovi-marker-pin rovi-marker-pin--dark rovi-marker-pin--selected'
});

interface MapViewProps {
  offices: Office[];
  weatherByOfficeId: Record<string, OfficeWeather>;
  errorsByOfficeId: Record<string, string>;
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  selectedOfficeId: string | null;
  onOfficeSelect: (officeId: string) => void;
  theme: ThemeMode;
}

interface MapSelectionControllerProps {
  selectedOfficeId: string | null;
  officesById: Record<string, Office>;
  markerRefs: MutableRefObject<Record<string, L.Marker | null>>;
}

const MapSelectionController = ({ selectedOfficeId, officesById, markerRefs }: MapSelectionControllerProps) => {
  const map = useMap();
  const selectionRequestRef = useRef(0);
  const previousSelectedOfficeId = useRef<string | null>(null);

  useEffect(() => {
    if (previousSelectedOfficeId.current === selectedOfficeId) {
      return;
    }
    previousSelectedOfficeId.current = selectedOfficeId;

    selectionRequestRef.current += 1;
    const requestId = selectionRequestRef.current;

    if (!selectedOfficeId) {
      return;
    }

    const selectedOffice = officesById[selectedOfficeId];
    if (!selectedOffice) {
      return;
    }

    const targetCenter = L.latLng(selectedOffice.latitude, selectedOffice.longitude);
    const nextZoom = Math.max(map.getZoom(), 5);
    const mapSize = map.getSize();
    const popupHeadroomPx = mapSize.y >= 600 ? 170 : 130;
    const targetPoint = map.project(targetCenter, nextZoom);
    const adjustedCenter = map.unproject(targetPoint.subtract([0, popupHeadroomPx]), nextZoom);
    const distanceMeters = map.distance(map.getCenter(), adjustedCenter);
    const shouldMove = distanceMeters > 150 || map.getZoom() !== nextZoom;
    let rafId: number | null = null;

    const openSelectedPopup = () => {
      // Drop stale async callbacks from previous rapid selections.
      if (selectionRequestRef.current !== requestId) {
        return;
      }

      const marker = markerRefs.current[selectedOfficeId];
      if (!marker || !map.hasLayer(marker)) {
        return;
      }

      marker.openPopup();
    };

    if (shouldMove) {
      map.setView(adjustedCenter, nextZoom, { animate: false });
    }

    rafId = window.requestAnimationFrame(openSelectedPopup);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [map, markerRefs, officesById, selectedOfficeId]);

  return null;
};

export const MapView = ({
  offices,
  weatherByOfficeId,
  errorsByOfficeId,
  temperatureUnit,
  windSpeedUnit,
  selectedOfficeId,
  onOfficeSelect,
  theme
}: MapViewProps) => {
  const officeMapsUrl = (office: Office): string =>
    `https://www.google.com/maps/search/?api=1&query=${office.latitude},${office.longitude}`;

  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const isDark = theme === 'dark';
  const officesById = useMemo(
    () =>
      offices.reduce<Record<string, Office>>((acc, office) => {
        acc[office.id] = office;
        return acc;
      }, {}),
    [offices]
  );

  return (
    <section
      id="global-weather-map"
      className="overflow-hidden rounded-3xl bg-white/70 p-3 shadow-card backdrop-blur-sm dark:bg-slate-900/70 xl:flex xl:h-full xl:flex-col"
    >
      <h2 className="px-2 pb-3 pt-1 text-xl font-semibold text-ink dark:text-slate-100">Global Weather Map</h2>
      <div className="h-[430px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 lg:h-[620px] xl:h-auto xl:min-h-0 xl:flex-1">
        <MapContainer
          center={[24.5, 8]}
          zoom={2}
          minZoom={2}
          scrollWheelZoom
          className="h-full w-full"
          worldCopyJump
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            url={
              isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            }
          />
          <MapSelectionController selectedOfficeId={selectedOfficeId} officesById={officesById} markerRefs={markerRefs} />

          {offices.map((office) => {
            const weather = weatherByOfficeId[office.id];
            const error = errorsByOfficeId[office.id];
            const isSelectedOffice = selectedOfficeId === office.id;
            const temperatureValue = temperatureUnit === 'F' ? weather?.temperatureF : weather?.temperatureC;
            const windValue =
              windSpeedUnit === 'mph'
                ? weather?.windSpeedMph
                : windSpeedUnit === 'km/h'
                  ? weather?.windSpeedKph
                  : weather?.windSpeedMps;
            const markerIcon = isDark
              ? isSelectedOffice
                ? darkMapMarkerSelectedIcon
                : darkMapMarkerIcon
              : mapMarkerIcon;

            return (
              <Marker
                key={office.id}
                position={[office.latitude, office.longitude]}
                icon={markerIcon}
                ref={(marker) => {
                  markerRefs.current[office.id] = marker;
                }}
                opacity={selectedOfficeId && !isSelectedOffice ? 0.55 : 1}
                eventHandlers={{
                  click: () => onOfficeSelect(office.id)
                }}
              >
                <Popup autoPan={false}>
                  <div className="min-w-[210px] text-sm leading-tight text-ink dark:text-slate-100">
                    <h3 className="font-semibold dark:text-slate-100">{office.name}</h3>
                    <p className="mb-1 text-slate-600 dark:text-slate-400">
                      {office.city}, {office.country}
                    </p>
                    <a
                      href={officeMapsUrl(office)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-block text-xs text-accent underline decoration-accent/60 underline-offset-2 hover:decoration-accent"
                    >
                      {office.address}
                    </a>

                    {weather ? (
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                        <span className="font-medium">Temp:</span>
                        <span>
                          {temperatureValue}°{temperatureUnit}
                        </span>
                        <span className="font-medium">Condition:</span>
                        <span>{weather.condition}</span>
                        <span className="font-medium">Humidity:</span>
                        <span>{weather.humidity}%</span>
                        <span className="font-medium">Wind:</span>
                        <span>
                          {windValue} {windSpeedUnit}
                        </span>
                      </div>
                    ) : null}

                    {error ? <p className="text-red-600 dark:text-red-300">Weather unavailable: {error}</p> : null}
                    {!weather && !error ? <p className="text-slate-500 dark:text-slate-400">Loading weather...</p> : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
};
