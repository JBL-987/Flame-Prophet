"use client";
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

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

export function MapComponent({ className }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Default center coordinates (center of world)
  const defaultCenter: [number, number] = [20, 0];

  // Default zoom level for world view
  const defaultZoom = 2;

  useEffect(() => {
    // Custom marker for wildfires
    const fireIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.04L20 8L14.91 11.96L16 18L12 14.14L8 18L9.09 11.96L4 8L10.91 8.04L12 2Z"
                fill="#ff4444"/>
          <path d="M12 4L11.45 6.5L9 6.5L11 7.5L11.45 10L12 7.5L13 6.5L10.55 6.5L12 4Z"
                fill="#ffffff"/>
        </svg>
      `),
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });

    // Add some sample wildfire markers (for demonstration)
    if (mapRef.current) {
      const sampleFires = [
        { lat: -6.2, lng: 106.8, intensity: 'High', location: 'Jakarta Area, Indonesia' },
        { lat: 34.0, lng: -118.2, intensity: 'Medium', location: 'Los Angeles, USA' },
        { lat: 55.7, lng: 37.6, intensity: 'Low', location: 'Moscow, Russia' },
        { lat: -33.8, lng: 151.2, intensity: 'High', location: 'Sydney, Australia' },
      ];

      sampleFires.forEach((fire) => {
        L.marker([fire.lat, fire.lng], { icon: fireIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold text-red-600">${fire.intensity} Risk</h3>
              <p class="text-sm text-gray-600">${fire.location}</p>
              <p class="text-xs text-gray-500 mt-1">Real-time wildfire prediction</p>
            </div>
          `);
      });
    }
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        ref={mapRef}
      >
        {/* Satellite imagery tile layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/en-us/home">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />

        {/* Optional: Add a streets overlay */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.3}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>

      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">Map Controls</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs">Low Risk</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Global Wildfire Monitor</h3>
        <p className="text-xs text-gray-600 mb-2">
          AI-powered wildfire prediction system. Upload satellite imagery and metadata for real-time analysis.
        </p>
        <div className="text-xs text-gray-500">
          Zoom and pan to explore global wildfire risks
        </div>
      </div>
    </div>
  );
}
