/**
 * Flame Prophet - Wildfire Prediction System
 * Frontend API service for communicating with the Flask backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types for API responses
export interface ClassificationRequest {
  image: File;
}

export interface ClassificationResponse {
  is_wildfire: boolean;
  confidence: number;
  classification: 'wildfire' | 'no_wildfire';
  predicted_temperature?: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface LSTMPredictionRequest {
  current_temp?: number;
  data: Array<{
    date: string;
    T2M: number;
    T2M_MIN: number;
    T2M_MAX: number;
    RH2M: number;
    WS10M: number;
    WD10M: number;
    PS: number;
    PRECTOTCORR: number;
    ALLSKY_SFC_SW_DWN: number;
    ALLSKY_SFC_UVA: number;
  }>;
}

export interface LSTMPredictionResponse {
  success: boolean;
  predicted_temperature: number;
  unit: string;
  timestamp: string;
  error?: string;
  predictions?: Array<{
    day: number;
    temperature: number;
    date: string;
    day_name?: string;
  }>;
  summary?: {
    next_day_temperature: number;
    week_avg_temperature: number;
    trend: string;
    temp_range?: {
      min: number;
      max: number;
    };
  };
  additional_parameters?: {
    avg_humidity_7d?: number;
    avg_wind_speed_7d?: number;
    avg_pressure_7d?: number;
  };
  model_status?: string;
  confidence?: number;
  prediction_type?: string;
  days_ahead?: number;
  data_points_used?: number;
}

export interface LSTMHealthResponse {
  status: string;
  model_loaded: boolean;
  scaler_loaded: boolean;
}

// Weather API response types
export interface CurrentWeatherData {
  location: {
    name: string;
    country: string;
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  weather: {
    main: string;
    description: string;
    icon: string;
  };
  temperature: {
    current: number;
    feels_like: number;
    min: number;
    max: number;
    humidity: number;
  };
  wind: {
    speed: number;
    direction: number;
  };
  timestamp: number;
  timezone: number;
}

export interface HistoricalWeatherEntry {
  date: string;
  // Legacy weather API format
  weather?: {
    main: string;
    description: string;
    icon: string;
  };
  temperature?: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind?: {
    speed: number;
    direction: number;
  };
  pressure?: number;
  uvi?: number;
  // NASA POWER LSTM-ready format
  T2M?: number;
  T2M_MIN?: number;
  T2M_MAX?: number;
  RH2M?: number;
  WS10M?: number;
  WD10M?: number;
  PS?: number;
  PRECTOTCORR?: number;
  ALLSKY_SFC_SW_DWN?: number;
  ALLSKY_SFC_UVA?: number;
}

export interface HistoricalWeatherData {
  location: {
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  historical_data: HistoricalWeatherEntry[];
  days_requested: number;
  days_returned: number;
  data_source?: string;
  format?: string;
}

/**
 * Check if the backend service is healthy (with retry logic)
 */
export async function checkHealth(retries = 3): Promise<HealthResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      return data;
    } catch (error) {
      console.warn(`Health check attempt ${i + 1}/${retries} failed:`, error);
      
      if (i === retries - 1) {
        // Last retry failed
        console.error('All health check retries failed:', error);
        throw new Error('Unable to connect to the prediction service');
      }
      
      // Wait before retry (exponential backoff: 1s, 2s, 3s)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('Unable to connect to the prediction service');
}



/**
 * Classify wildfire from map screenshot
 */
export async function classifyWildfireArea(
  request: ClassificationRequest,
  onProgress?: (progress: number) => void
): Promise<ClassificationResponse> {
  try {
    // Validate inputs first
    const validation = validateImageFile(request.image);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('image', request.image);

    // Use XMLHttpRequest for progress tracking (if callback provided)
    if (onProgress) {
      return await uploadWithProgressClassify(formData, onProgress);
    }

    // Otherwise use fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

    const response = await fetch(`${API_BASE_URL}/classify`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // Don't set Content-Type header - let the browser set it with boundary
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred'
      }));

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: ClassificationResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Classification request failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - classification took too long (>30s)');
      }
      throw error;
    }

    throw new Error('Failed to make classification request');
  }
}

/**
 * Upload with progress tracking using XMLHttpRequest for classification
 */
function uploadWithProgressClassify(
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<ClassificationResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: ClassificationResponse = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid response format from server'));
        }
      } else {
        try {
          const errorData: ApiError = JSON.parse(xhr.responseText);
          reject(new Error(errorData.message || errorData.error || `HTTP error! status: ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during upload'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timeout - classification took too long'));
    });

    xhr.open('POST', `${API_BASE_URL}/classify`);
    xhr.timeout = 30000; // 30 seconds
    xhr.send(formData);
  });
}

/**
 * Format classification response for display
 */
export function formatClassificationForDisplay(classification: ClassificationResponse) {
  return {
    isWildfire: classification.is_wildfire,
    confidence: Math.round(classification.confidence * 100),
    classification: classification.classification,
    resultColor: classification.is_wildfire ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'
  };
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file selected'
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (PNG, JPG, or JPEG)'
    };
  }

  // Check file size (16MB limit to match backend)
  const maxSize = 16 * 1024 * 1024; // 16MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 16MB'
    };
  }

  // Check minimum size (avoid corrupted/empty files)
  const minSize = 1024; // 1KB minimum
  if (file.size < minSize) {
    return {
      isValid: false,
      error: 'File is too small or corrupted'
    };
  }

  return { isValid: true };
}



/**
 * Get current weather data for a location
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeatherData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

    const response = await fetch(`${API_BASE_URL}/weather/current?lat=${lat}&lon=${lon}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred'
      }));

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: CurrentWeatherData = await response.json();
    return data;
  } catch (error) {
    console.error('Weather API request failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - weather API took too long (>10s)');
      }
      throw error;
    }

    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Get historical weather data for trend analysis
 */
export async function getHistoricalWeather(lat: number, lon: number, days: number = 7): Promise<HistoricalWeatherData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds (historical data may take longer)

    const response = await fetch(`${API_BASE_URL}/weather/historical?lat=${lat}&lon=${lon}&days=${days}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred'
      }));

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: HistoricalWeatherData = await response.json();
    return data;
  } catch (error) {
    console.error('Historical weather API request failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - historical weather API took too long (>15s)');
      }
      throw error;
    }

    throw new Error('Failed to fetch historical weather data');
  }
}

/**
 * Get LSTM model health status
 */
export async function getLSTMHealth(): Promise<LSTMHealthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred'
      }));

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: LSTMHealthResponse = await response.json();
    return data;
  } catch (error) {
    console.error('LSTM health check failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - LSTM health check took too long (>5s)');
      }
      throw error;
    }

    throw new Error('Failed to check LSTM model health');
  }
}

/**
 * Make LSTM temperature prediction
 */
export async function predictLSTMTemperature(request: LSTMPredictionRequest): Promise<LSTMPredictionResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for prediction

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred'
      }));

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: LSTMPredictionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('LSTM prediction request failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - LSTM prediction took too long (>30s)');
      }
      throw error;
    }

    throw new Error('Failed to make LSTM temperature prediction');
  }
}

/**
 * Get human-readable error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
