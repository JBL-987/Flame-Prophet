"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useLocationContext } from "@/contexts/LocationContext";

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapComponentProps {
  className?: string;
  onMapReady?: (
    element: HTMLElement,
    zoomToCurrent?: () => Promise<void>
  ) => void;
}

// Controller for reacting to selected location
function MapController() {
  const map = useMap();
  const { selectedLocation } = useLocationContext();
  const lastCoords = useRef<[number, number] | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!selectedLocation) return;

    const { latitude, longitude, name } = selectedLocation;
    const coords: [number, number] = [latitude, longitude];

    if (
      lastCoords.current &&
      lastCoords.current[0] === coords[0] &&
      lastCoords.current[1] === coords[1]
    ) {
      return;
    }
    lastCoords.current = coords;

    map.setView(coords, 13, { animate: true });

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Menggunakan SVG simple
    const locationIcon = L.divIcon({
      className: "custom-location-marker",
      html: `
        <div style="
          background-color: #ff6b35;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const marker = L.marker(coords, { icon: locationIcon }).bindPopup(`
      <div style="font-family: system-ui; max-width: 220px;">
        <strong style="color: #ff6b35; font-size: 14px;">${name}</strong>
        <br />
        <small style="color: #555; font-size: 12px;">
          ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
        </small>
      </div>
    `);

    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [selectedLocation, map]);

  return null;
}

// Custom zoom control provider
function MapActions({
  onZoomReady,
}: {
  onZoomReady?: (zoomToCurrent: () => Promise<void>) => void;
}) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !onZoomReady) return;
    initialized.current = true;

    const zoomToCurrent = (): Promise<void> => {
      return new Promise((resolve) => {
        const center = map.getCenter();
        const targetZoom = Math.min(map.getZoom() + 3, 18);
        map.setView([center.lat, center.lng], targetZoom, { animate: true });
        setTimeout(resolve, 600);
      });
    };

    onZoomReady(zoomToCurrent);
  }, [map, onZoomReady]);

  return null;
}

// Main map component
export function MapComponent({ className, onMapReady }: MapComponentProps) {
  const defaultCenter: [number, number] = [-1.5, 113.5];
  
  // Batas koordinat dunia (Strict)
  const maxBounds: L.LatLngBoundsExpression = [
    [-85, -180], // Sedikit dipotong di kutub agar tile tidak error
    [85, 180], 
  ];

  return (
    <div className={`w-full h-full ${className ?? ""} relative bg-[#0a0a0a]`}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        minZoom={4} // Zoom out dibatasi agar tidak melihat duplikat
        maxZoom={18}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0} // Bounce back effect yang kuat
        className="w-full h-full z-0 outline-none"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        attributionControl={false}
        whenReady={() => {
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 200);
        }}
      >
        {/* Satellite Layer - High Performance Config */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          detectRetina={true}       // Kualitas tajam (4K look)
          maxNativeZoom={19}        // Agar tidak blur saat zoom maksimal
          keepBuffer={20}           // Caching area sekitar SANGAT luas (makan RAM tapi cepat)
          updateWhenZooming={false} // Animasi zoom jadi smooth (60fps)
          updateWhenIdle={true}     // Hanya load saat map diam
          noWrap={true}             // Mencegah duplikasi visual
          bounds={maxBounds}
        />

        {/* Street Overlay */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.35}
          detectRetina={true}
          maxNativeZoom={19}
          keepBuffer={20}           // Samakan buffer dengan satelit
          updateWhenZooming={false}
          updateWhenIdle={true}
          noWrap={true}
          bounds={maxBounds}
        />

        <MapController />
        <MapActions
          onZoomReady={(zoomToCurrent) => {
            const mapContainer = document.querySelector(
              ".leaflet-container"
            ) as HTMLElement | null;
            if (mapContainer && onMapReady) {
              onMapReady(mapContainer, zoomToCurrent);
            }
          }}
        />
      </MapContainer>

      {/* Info Panel (Desain Simple yang diminta) */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs border border-orange-500/20 lg:block hidden">
        <h3 className="text-sm font-semibold text-orange-400 mb-2">
          Global Wildfire Monitor
        </h3>
        <p className="text-xs text-gray-300 mb-2">
          AI-powered wildfire prediction system. Upload satellite imagery and
          metadata for real-time analysis.
        </p>
        <div className="text-xs text-gray-400">
          Zoom and pan to explore global wildfire risks
        </div>
      </div>
    </div>
  );
}

export default MapComponent;