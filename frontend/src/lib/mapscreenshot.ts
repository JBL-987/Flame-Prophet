/**
 * Flame Prophet - Map Screenshot Utility
 * Utility functions for capturing map screenshots using html2canvas
 */

/**
 * Screenshot options interface
 */
interface ScreenshotOptions {
  scale?: number;
  backgroundColor?: string;
  useCORS?: boolean;
  allowTaint?: boolean;
  logging?: boolean;
}

/**
 * Captures a screenshot of the map element
 * @param mapElement - The map container element to capture
 * @param options - Screenshot options
 * @returns Promise that resolves to a Blob containing the screenshot
 */
export async function captureMapScreenshot(
  mapElement: HTMLElement,
  options: ScreenshotOptions = {}
): Promise<Blob> {
  try {
    // Dynamic import html2canvas to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(mapElement, {
      useCORS: options.useCORS ?? true,
      allowTaint: options.allowTaint ?? true,
      backgroundColor: options.backgroundColor ?? '#000000',
      scale: options.scale ?? 1,
      logging: options.logging ?? false,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('Error capturing map screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Screenshot capture failed: ${errorMessage}`);
  }
}

/**
 * Converts a Blob to a File object
 * @param blob - The blob to convert
 * @param filename - The filename for the file
 * @returns File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * Generates a unique filename for a screenshot
 * @param prefix - Optional prefix for the filename
 * @returns Generated filename
 */
export function generateScreenshotFilename(prefix: string = 'classification'): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}.png`;
}
