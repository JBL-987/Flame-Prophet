"use client";
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useLocationContext } from '@/contexts/LocationContext';

// Fix for default markers in React Leaflet
// @ts-expect-error - Required to delete the default icon URL method for custom markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  className?: string;
}

// Component to handle map centering based on selected location
function MapController() {
  const map = useMap();
  const { selectedLocation } = useLocationContext();

  useEffect(() => {
    if (selectedLocation) {
      const { latitude, longitude, name } = selectedLocation;

      // Center the map on the selected location
      map.setView([latitude, longitude], 13);

      // Create a custom icon for location marker
      const locationIcon = L.divIcon({
        className: 'custom-location-marker',
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

      // Add marker with popup
      const marker = L.marker([latitude, longitude], { icon: locationIcon });

      // Create popup content
      const popupContent = `
        <div style="font-family: system-ui; max-width: 200px;">
          <strong style="color: #ff6b35;">${name}</strong>
          <br>
          <small style="color: #666;">
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
          </small>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add marker to map
      marker.addTo(map);

      // Return cleanup function
      return () => {
        map.removeLayer(marker);
      };
    }
  }, [selectedLocation, map]);

  return null;
}

// Component to add markers using the map instance
function WildfireMarkers() {
  const map = useMap();

  useEffect(() => {
    // No markers to display - clean map

    // Cleanup function to ensure no markers remain
    return () => {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
    };
  }, [map]);

  return null; // This component doesn't render anything visible
}

export function MapComponent({ className }: MapComponentProps) {
  // Default center coordinates (center of world)
  const defaultCenter: [number, number] = [20, 0];

  // Default zoom level for world view
  const defaultZoom = 2;

  // Attribution texts (separated to avoid quote conflicts)
  const esriAttribution = "© <a href='https://www.esri.com/en-us/home'>Esri</a> - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
  const osmAttribution = "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

  return (
    <div className={`w-full h-full ${className}`}>
      <MapContainer
        attributionControl={false}
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => {
          // Force map resize after initialization
          setTimeout(() => {
            // This ensures the map properly sizes itself
            window.dispatchEvent(new Event('resize'));
          }, 100);
        }}
      >
        {/* Satellite imagery tile layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution={esriAttribution}
        />

        {/* Optional: Add a streets overlay */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.3}
          attribution={osmAttribution}
        />
        <MapController />
        <WildfireMarkers />
      </MapContainer>


      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs border border-orange-500/20 lg:block hidden">
        <h3 className="text-sm font-semibold text-orange-400 mb-2">Global Wildfire Monitor</h3>
        <p className="text-xs text-gray-300 mb-2">
          AI-powered wildfire prediction system. Upload satellite imagery and metadata for real-time analysis.
        </p>
        <div className="text-xs text-gray-400">
          Zoom and pan to explore global wildfire risks
        </div>
      </div>
    </div>
  );
}
