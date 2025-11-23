"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Flame
} from "lucide-react";
import {
  classifyWildfireArea,
  ClassificationResponse
} from "@/lib/api";
import { captureMapScreenshot, blobToFile } from "@/lib/mapscreenshot";
import { useLocationContext } from "@/contexts/LocationContext";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Image from "next/image";

// ✅ Dynamic import MapComponent (ssr-safe)
const MapComponent = dynamic(
  () => import("@/components/MapComponent").then(mod => ({ default: mod.MapComponent })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
) as React.ComponentType<{ className?: string; onMapReady?: (mapElement: HTMLElement, zoom?: () => Promise<void>) => void }>;

export default function MainPage() {
  const { classificationResult, setClassificationResult } = useLocationContext();

  // Processing states
  const [isClassifying, setIsClassifying] = useState(false);

  // Map & AI states
  const [mapElement, setMapElement] = useState<HTMLElement | null>(null);
  const [mapZoomFunction, setMapZoomFunction] = useState<(() => Promise<void>) | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // ✅ Prevent infinite re-renders
  const handleMapReady = useCallback((element: HTMLElement, zoomToCurrent?: () => Promise<void>) => {
    setMapElement(prev => (prev === element ? prev : element));
    if (zoomToCurrent) {
      setMapZoomFunction(() => zoomToCurrent);
    }
  }, []);

  // Capture map screenshot (using utility function)
  const localCaptureScreenshot = useCallback(async (): Promise<Blob> => {
    if (!mapElement) throw new Error("Map not ready yet");

    const blob = await captureMapScreenshot(mapElement, {
      bgcolor: '#ffffff',
      quality: 0.95,
    });

    return blob;
  }, [mapElement]);



  // 🔥 Classify wildfire area (CNN)
  const handleClassify = async () => {
    if (!mapElement || !mapZoomFunction) {
      Swal.fire("Map Not Ready", "Wait for the map to finish loading.", "info");
      return;
    }

    setIsClassifying(true);
    toast.loading("Zooming and capturing area...", { id: "classify" });

    try {
      await mapZoomFunction();
      await new Promise(res => setTimeout(res, 300));

      const blob = await localCaptureScreenshot();
      const file = new File([blob], `classification-${Date.now()}.png`, { type: "image/png" });
      const previewUrl = URL.createObjectURL(blob);
      setScreenshotPreview(previewUrl);

      toast.loading("Running CNN classification...", { id: "classify" });
      const result = await classifyWildfireArea({ image: file });
      setClassificationResult(result);

      toast.success("Classification completed!", {
        id: "classify",
        description: result.is_wildfire
          ? `🔥 Wildfire Detected (${Math.round(result.confidence * 100)}%)`
          : `✅ Safe Area (${Math.round(result.confidence * 100)}%)`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cannot classify this area.";
      Swal.fire("Classification Failed", message, "error");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleReset = useCallback(() => {
    setClassificationResult(null);
    setScreenshotPreview(null);
  }, []);

  // ✅ Sidebar component
  const SidebarContent = useCallback(() => (
    <div className="flex flex-col min-h-0 h-full bg-black border-r border-gray-800">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Flame className="w-5 h-5 text-orange-400 mr-2" /> History
        </h2>
        <p className="text-xs text-white/70">CNN Classification Results</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 p-4">
          {/* Classification */}
          {classificationResult && (
            <Card className="bg-white/5 border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base text-white font-semibold">Latest Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-base pb-1">
                  <span className="text-white/70">Detection</span>
                  <Badge className={classificationResult.is_wildfire ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}>
                    {classificationResult.is_wildfire ? "WILDFIRE" : "SAFE"}
                  </Badge>
                </div>
                <div className="flex justify-between text-base mt-2">
                  <span className="text-white/70">Confidence</span>
                  <span className="text-white">{Math.round(classificationResult.confidence * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state atau reset btn */}
          {classificationResult ? (
            <Button onClick={handleReset} className="w-full h-14 mt-4 rounded-xl text-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
              Clear History
            </Button>
          ) : (
            <div className="text-center text-white/50 text-base py-6">
              Use the Classify Area button in the header above the map to start analysis
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  ), [classificationResult, isClassifying, handleReset]);

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:flex w-80 xl:w-96">
          <SidebarContent />
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <MapComponent onMapReady={handleMapReady} className="w-full h-full" />
          {screenshotPreview && (
            <div className="absolute bottom-4 right-4 z-10">
              <Image
                src={screenshotPreview}
                alt="Map preview"
                className="w-32 h-32 rounded-lg border border-white/10 object-cover"
                width={128}
                height={128}
              />
            </div>
          )}
          {/* Classification Result Popup - Aligned with Sidebar */}
          {classificationResult && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="bg-black/90 backdrop-blur-sm border-orange-500/20 max-w-xs shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white flex items-center">
                    <Flame className="w-4 h-4 text-orange-400 mr-2" />
                    Classification Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Detection:</span>
                    <Badge className={classificationResult.is_wildfire ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}>
                      {classificationResult.is_wildfire ? "WILDFIRE" : "SAFE"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Confidence:</span>
                    <span className="text-white font-semibold">
                      {Math.round(classificationResult.confidence * 100)}%
                    </span>
                  </div>
                  <Button
                    onClick={handleReset}
                    className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors border-0"
                  >
                    Clear Result
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
