export interface LocationSearchResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

export interface ProcessedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
  displayName: string;
}

export class LocationSearchService {
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private static readonly TIMEOUT = 5000; // 5 seconds

  static async searchLocation(query: string, limit: number = 5): Promise<ProcessedLocation[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${this.NOMINATIM_URL}?q=${encodedQuery}&format=json&addressdetails=1&limit=${limit}&countrycodes=id`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Flame Prophet Wildfire Prediction App',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LocationSearchResult[] = await response.json();

      return data.map((result): ProcessedLocation => ({
        id: `${result.osm_type}${result.osm_id}`,
        name: result.display_name.split(',')[0], // Take first part for short name
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        type: result.type,
        importance: result.importance,
        displayName: result.display_name,
      })).sort((a, b) => b.importance - a.importance); // Sort by importance

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('Location search request timed out');
          return [];
        }
        console.error('Location search error:', error.message);
      } else {
        console.error('Unknown location search error:', error);
      }
      return [];
    }
  }

  static getMapBounds(locations: LocationSearchResult[]): [[number, number], [number, number]] {
    if (locations.length === 0) {
      // Default bounds (Indonesia area)
      return [[-11, 94], [6, 141]];
    }

    const lats = locations.map(loc => parseFloat(loc.lat));
    const lons = locations.map(loc => parseFloat(loc.lon));

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Add some padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lonPadding = (maxLon - minLon) * 0.1;

    return [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding],
    ];
  }

  static getZoomLevel(locations: LocationSearchResult[]): number {
    if (locations.length === 1) {
      // Single location, zoom in close
      return 13;
    } else {
      // Multiple locations, zoom out to show all
      return 10;
    }
  }

  static getDefaultCenter(): [number, number] {
    // Center of Indonesia
    return [-2.5, 118];
  }
}
