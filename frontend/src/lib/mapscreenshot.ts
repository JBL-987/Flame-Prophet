/**
 * Flame Prophet - Map Screenshot Utility
 * Utility functions for capturing map screenshots using dom-to-image
 */

/**
 * Screenshot options interface
 */
interface ScreenshotOptions {
  quality?: number;
  bgcolor?: string;
  filter?: (node: Node) => boolean;
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
    // Dynamic import dom-to-image to avoid SSR issues
    const domtoimage = (await import('dom-to-image')).default;

    const defaultFilter = (node: Node) => {
      // Skip elements that might cause issues
      if (node.nodeType !== Node.ELEMENT_NODE) return true;
      const element = node as HTMLElement;
      return !(element.tagName === 'CANVAS' || element.classList?.contains('leaflet-control'));
    };

    const blob = await domtoimage.toBlob(mapElement, {
      quality: options.quality ?? 0.95,
      bgcolor: options.bgcolor ?? '#ffffff',
      filter: options.filter ?? defaultFilter,
    });

    if (!blob) {
      throw new Error('Failed to generate screenshot blob');
    }

    return blob;
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
