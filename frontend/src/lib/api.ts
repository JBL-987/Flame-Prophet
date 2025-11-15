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
