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
  private static readonly TIMEOUT = 15000; // 15 seconds (increased for global searches)
  private static readonly cache = new Map<string, { data: ProcessedLocation[], timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  static async searchLocation(query: string, limit: number = 5): Promise<ProcessedLocation[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `${query.toLowerCase()}_${limit}`;
    const cached = this.cache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Returning cached location results');
      return cached.data;
    }

    try {
      console.log('🌍 Searching for location:', query);

      let encodedQuery = encodeURIComponent(query.trim());

      // Check if query is coordinates (e.g., "-1.5,114" or "0.123 45.678")
      const coordRegex = /^-?\d+\.?\d*\s*[,;]\s*-?\d+\.?\d*$|^-?\d+\.?\d*\s+-?\d+\.?\d*$/;
      if (coordRegex.test(query.trim())) {
        // Replace separator with comma for Nominatim
        const coords = query.trim().replace(/[,;]/, ',').replace(/\s+/, ',');
        encodedQuery = coords;
        console.log('📍 Detected coordinates input:', coords);
      }

      const url = `${this.NOMINATIM_URL}?q=${encodedQuery}&format=json&addressdetails=1&limit=${limit}`;

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
      const processedResults = data.map((result): ProcessedLocation => ({
        id: `${result.osm_type}${result.osm_id}`,
        name: result.display_name.split(',')[0], // Take first part for short name
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        type: result.type,
        importance: result.importance,
        displayName: result.display_name,
      })).sort((a, b) => b.importance - a.importance);

      // Cache the successful result
      if (data && data.length > 0) {
        this.cache.set(cacheKey, {
          data: processedResults,
          timestamp: Date.now()
        });
        console.log('💾 Cached location results for:', query);
      }

      return processedResults;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('⏱️ Location search request timed out:', query);
          return [];
        }
        console.error('❌ Location search error:', error.message);
      } else {
        console.error('❌ Unknown location search error:', error);
      }
      return [];
    }
  }

  static clearCache() {
    this.cache.clear();
    console.log('🗑️ Location search cache cleared');
  }

  static getMapBounds(locations: LocationSearchResult[]): [[number, number], [number, number]] {
    if (locations.length === 0) {
      // Default bounds (world view)
      return [[-85, -180], [85, 180]];
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
    // Global center (slightly offset to avoid showing too much ocean)
    return [20, 0];
  }
}
