"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useLocationContext } from "@/contexts/LocationContext";

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
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

// 🔸 Controller for reacting to selected location
function MapController() {
  const map = useMap();
  const { selectedLocation } = useLocationContext();
  const lastCoords = useRef<[number, number] | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!selectedLocation) return;

    const { latitude, longitude, name } = selectedLocation;
    const coords: [number, number] = [latitude, longitude];

    // Avoid infinite loop when same location selected again
    if (
      lastCoords.current &&
      lastCoords.current[0] === coords[0] &&
      lastCoords.current[1] === coords[1]
    ) {
      return;
    }
    lastCoords.current = coords;

    // Set map view only when coords change
    map.setView(coords, 13, { animate: true });

    // Remove old marker if exists
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Custom location marker
    const locationIcon = L.divIcon({
      className: "custom-location-marker",
      html: `<div style="
        background-color: #ff6b35;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
      ">📍</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    // Create marker with popup
    const marker = L.marker(coords, { icon: locationIcon }).bindPopup(`
      <div style="font-family: system-ui; max-width: 200px;">
        <strong style="color: #ff6b35;">${name}</strong>
        <br />
        <small style="color: #666;">
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

// 🔸 Custom zoom control provider
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

// 🔸 Main map component
export function MapComponent({ className, onMapReady }: MapComponentProps) {
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  const esriAttribution =
    "© <a href='https://www.esri.com/en-us/home'>Esri</a> - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
  const osmAttribution =
    "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

  return (
    <div className={`w-full h-full ${className ?? ""} relative`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        attributionControl={false}
        whenReady={() => {
          // Resize fix on map init
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 100);
        }}
      >
        {/* Satellite Layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution={esriAttribution}
        />
        {/* Optional Street Overlay */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.3}
          attribution={osmAttribution}
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

      {/* Info Panel */}
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
