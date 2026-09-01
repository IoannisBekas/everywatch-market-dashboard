'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  Map as MapLibreMap,
  Marker,
  Popup,
  StyleSpecification,
} from 'maplibre-gl';

import type { MarketLocation } from '@/lib/market-data';

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-dark',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
      paint: {
        'raster-opacity': 0.68,
        'raster-saturation': -1,
        'raster-contrast': 0.34,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.3,
      },
    },
  ],
};

function popupContent(properties: MarketLocation) {
  const container = document.createElement('div');
  container.className = 'map-popup-card';

  const label = document.createElement('span');
  label.className = 'map-popup-region';
  label.textContent = properties.region;

  const title = document.createElement('strong');
  title.textContent = `${properties.city}, ${properties.country}`;

  const metrics = document.createElement('span');
  metrics.textContent = `${Number(properties.listings).toLocaleString()} listings · $${(
    Number(properties.gmv) / 1_000_000
  ).toFixed(2)}M GMV`;

  container.appendChild(label);
  container.appendChild(title);
  container.appendChild(metrics);
  return container;
}

function renderMarkers(
  map: MapLibreMap,
  locations: MarketLocation[],
  popup: Popup,
  currentMarkers: Marker[],
) {
  currentMarkers.forEach((marker) => marker.remove());
  currentMarkers.length = 0;

  const maxHeight = Math.max(1, ...locations.map((location) => location.height));

  for (const location of locations) {
    const anchor = document.createElement('div');
    anchor.className = 'market-column-anchor';
    anchor.title = `${location.city}: ${location.listings} listings`;
    Object.assign(anchor.style, {
      width: '18px',
      height: '82px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      cursor: 'pointer',
      filter: 'drop-shadow(0 7px 8px rgba(0, 0, 0, 0.42))',
    });

    const prism = document.createElement('span');
    prism.className = 'market-column-prism';
    Object.assign(prism.style, {
      position: 'relative',
      display: 'block',
      width: '8px',
      minHeight: '20px',
      height: `${20 + Math.sqrt(location.height / maxHeight) * 58}px`,
      borderRight: '1px solid rgba(255, 239, 197, 0.78)',
      borderLeft: '1px solid rgba(255, 239, 197, 0.42)',
      background: '#cba650',
      boxShadow: '5px 0 0 rgba(111, 83, 31, 0.72)',
      transform: 'skewY(-4deg)',
      transformOrigin: 'bottom',
    });

    const cap = document.createElement('span');
    cap.className = 'market-column-cap';
    Object.assign(cap.style, {
      position: 'absolute',
      display: 'block',
      top: '-4px',
      left: '-1px',
      width: '9px',
      height: '5px',
      border: '1px solid rgba(255, 241, 207, 0.75)',
      background: '#f0d48d',
      transform: 'skewY(20deg)',
    });
    prism.appendChild(cap);
    anchor.appendChild(prism);

    anchor.addEventListener('mouseenter', () => {
      popup
        .setLngLat([location.longitude, location.latitude])
        .setDOMContent(popupContent(location))
        .addTo(map);
    });
    anchor.addEventListener('mouseleave', () => popup.remove());

    currentMarkers.push(
      new maplibregl.Marker({ element: anchor, anchor: 'bottom' })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map),
    );
  }
}

function updateCamera(map: MapLibreMap, locations: MarketLocation[], region: string) {
  if (locations.length === 0) return;

  if (locations.length === 1) {
    const [location] = locations;
    map.easeTo({
      center: [location.longitude, location.latitude],
      zoom: 5,
      pitch: 45,
      bearing: -16,
      duration: 900,
    });
    return;
  }

  if (region === 'All') {
    map.easeTo({ center: [12, 18], zoom: 1.18, pitch: 38, bearing: -10, duration: 900 });
    return;
  }

  const bounds = locations.reduce(
    (current, location) => current.extend([location.longitude, location.latitude]),
    new maplibregl.LngLatBounds(),
  );

  map.fitBounds(bounds, {
    padding: 78,
    maxZoom: 4.7,
    pitch: 44,
    bearing: -14,
    duration: 950,
  });
}

let maplibregl: typeof import('maplibre-gl');

export function MarketMap({ locations, region }: { locations: MarketLocation[]; region: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const markerRef = useRef<Marker[]>([]);
  const locationsRef = useRef(locations);
  const regionRef = useRef(region);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    locationsRef.current = locations;
    regionRef.current = region;
  }, [locations, region]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        maplibregl = await import('maplibre-gl');
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [12, 18],
          zoom: 1.18,
          pitch: 38,
          bearing: -10,
          minZoom: 0.8,
          maxZoom: 8,
          attributionControl: { compact: true },
        });

        mapRef.current = map;
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 16,
        });

        map.addControl(new maplibregl.NavigationControl({ showZoom: true, showCompass: true }), 'top-right');

        map.on('load', () => {
          if (popupRef.current) {
            renderMarkers(map, locationsRef.current, popupRef.current, markerRef.current);
          }
          updateCamera(map, locationsRef.current, regionRef.current);
          setReady(true);
        });

        map.on('error', (event) => {
          if (!map.loaded()) setMapError(event.error?.message ?? 'Map tiles could not be loaded.');
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : 'Map could not be initialized.');
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      popupRef.current?.remove();
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (popupRef.current) renderMarkers(map, locations, popupRef.current, markerRef.current);
    updateCamera(map, locations, region);
  }, [locations, ready, region]);

  return (
    <div className="market-map-shell">
      <div ref={containerRef} className="market-map-canvas" aria-hidden="true" />
      <p className="sr-only">
        Interactive three-dimensional market map showing {locations.length} watch-market locations.
      </p>
      {!ready && !mapError ? <div className="map-status">Loading global market layer…</div> : null}
      {mapError ? <div className="map-status map-status-error">{mapError}</div> : null}
      {ready && locations.length === 0 ? <div className="map-status">No markets match these filters.</div> : null}
    </div>
  );
}
