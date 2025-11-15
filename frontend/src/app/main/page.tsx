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
  // Processing states
  const [isClassifying, setIsClassifying] = useState(false);

  // Map & AI states
  const [mapElement, setMapElement] = useState<HTMLElement | null>(null);
  const [mapZoomFunction, setMapZoomFunction] = useState<(() => Promise<void>) | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [classificationResult, setClassificationResult] = useState<ClassificationResponse | null>(null);

  // ✅ Prevent infinite re-renders
  const handleMapReady = useCallback((element: HTMLElement, zoomToCurrent?: () => Promise<void>) => {
    setMapElement(prev => (prev === element ? prev : element));
    if (zoomToCurrent) {
      setMapZoomFunction(() => zoomToCurrent);
    }
  }, []);

  // Capture map screenshot (with html2canvas)
  const captureMapScreenshot = useCallback(async (): Promise<Blob> => {
    if (!mapElement) throw new Error("Map not ready yet");

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(mapElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#000",
      scale: 2,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to capture screenshot"));
      }, "image/png");
    });
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

      const blob = await captureMapScreenshot();
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
    <div className="h-full bg-black border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Flame className="w-5 h-5 text-orange-400 mr-2" /> History
        </h2>
        <p className="text-xs text-white/70">CNN Classification Results</p>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        {/* Classification */}
        {classificationResult && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-white">Latest Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Detection</span>
                <Badge className={classificationResult.is_wildfire ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}>
                  {classificationResult.is_wildfire ? "WILDFIRE" : "SAFE"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-white/70">Confidence</span>
                <span className="text-white">{Math.round(classificationResult.confidence * 100)}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state or just reset button */}
        {classificationResult ? (
          <div className="space-y-2">
            <Button variant="outline" onClick={handleReset} className="w-full border-white/20 text-white hover:bg-white/10">
              Clear History
            </Button>
          </div>
        ) : (
          <div className="text-center text-white/50 text-sm py-4">
            Use the "Classify Area" button in the header above the map to start analysis
          </div>
        )}
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
        </div>
      </div>
      <Footer />
    </div>
  );
}
