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
  Flame,
  Cloud
} from "lucide-react";
import {
  classifyWildfireArea,
  ClassificationResponse,
  predictLSTMTemperature,
  LSTMPredictionRequest,
  CurrentWeatherData,
  getHistoricalWeather,
  HistoricalWeatherData
} from "@/lib/api";
import { captureMapScreenshot, blobToFile } from "@/lib/mapscreenshot";
import { useLocationContext } from "@/contexts/LocationContext";
import { WeatherComponent } from "@/components/WeatherComponent";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Image from "next/image";

// LSTM Prediction Response Interface
interface LSTMPredictionResponse {
  predictions: Array<{
    day: number;
    temperature: number;
    date: string;
    day_name?: string;
    humidity?: number;
    wind_speed?: number;
    pressure?: number;
  }>;
  summary: {
    next_day_temperature: number;
    week_avg_temperature: number;
    trend: string;
    temp_range?: {
      min: number;
      max: number;
    };
  };
  additional_parameters: {
    avg_humidity_7d?: number;
    avg_wind_speed_7d?: number;
    avg_pressure_7d?: number;
  };
  unit: string;
  model_status: string;
  confidence: number;
  prediction_type?: string;
  days_ahead?: number;
  timestamp: string;
  data_points_used: number;
  is_dummy?: boolean;
}

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
  const { classificationResult, setClassificationResult, selectedLocation, currentWeather } = useLocationContext();

  // Processing states
  const [isClassifying, setIsClassifying] = useState(false);
  const [isPredictingWeather, setIsPredictingWeather] = useState(false);
  const [weatherPrediction, setWeatherPrediction] = useState<number | null>(null);
  const [weatherPredictionData, setWeatherPredictionData] = useState<LSTMPredictionResponse | null>(null);

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

  // 🔥 Classify wildfire area (CNN + Weather + LSTM)
  const handleClassify = useCallback(async () => {
    if (!mapElement || !mapZoomFunction) {
      Swal.fire("Map Not Ready", "Wait for the map to finish loading.", "info");
      return;
    }

    if (!selectedLocation) {
      Swal.fire("No Location Selected", "Please select a location on the map first.", "warning");
      return;
    }

    setIsClassifying(true);
    toast.loading(`Analyzing area at ${selectedLocation.name}...`, { id: "classify" });

    try {
      // Zoom to the selected location
      await mapZoomFunction();
      await new Promise(res => setTimeout(res, 300));

      toast.loading("Capturing data and fetching weather...", { id: "classify" });

      // Parallel: Capture screenshot and fetch weather
      const [blob, weatherResponse] = await Promise.all([
        localCaptureScreenshot(),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/weather/current?lat=${selectedLocation.latitude}&lon=${selectedLocation.longitude}`)
      ]);

      if (!weatherResponse.ok) {
        throw new Error(`Weather API failed: ${weatherResponse.status}`);
      }
      const currentWeather = await weatherResponse.json();

      const file = new File([blob], `classification-${Date.now()}.png`, { type: "image/png" });
      const previewUrl = URL.createObjectURL(blob);
      setScreenshotPreview(previewUrl);

      toast.loading("Running CNN classification...", { id: "classify" });

      // Step 1: CNN Classification
      const cnnResult = await classifyWildfireArea({ image: file });

      // Create historical weather-like data based on current weather readings
      const baseTemp = currentWeather.temperature.current;
      const baseHumidity = currentWeather.temperature.humidity;
      const baseWindSpeed = currentWeather.wind.speed;
      const basePressure = 100.9; // Standard pressure

      const historicalWeatherData = Array.from({ length: 30 }, (_, i) => [
        baseTemp + (Math.random() - 0.5) * 3, // T2M - ±1.5°C variation around current temp
        baseTemp - 3 + (Math.random() - 0.5) * 2, // T2M_MIN - Min temp within 3°C below current
        baseTemp + 3 + (Math.random() - 0.5) * 2, // T2M_MAX - Max temp within 3°C above current
        Math.max(30, Math.min(90, baseHumidity + (Math.random() - 0.5) * 15)), // RH2M - Humidity 30-90%
        Math.max(0.5, baseWindSpeed + (Math.random() - 0.5) * 2), // WS10M - Wind speed min 0.5 m/s
        Math.random() * 360, // WD10M - Random wind direction 0-360°
        basePressure + (Math.random() - 0.5) * 1.0, // PS - Pressure around 100-102 hPa
        Math.max(0, Math.random() * 15), // PRECTOTCORR - Rainfall 0-15mm
        4.0 + Math.random() * 4, // ALLSKY_SFC_SW_DWN - Solar radiation 4-8 kW/m²
        0.2 + Math.random() * 0.4 // ALLSKY_SFC_UVA - UV index 0.2-0.6
      ]);

      toast.loading("Running LSTM prediction...", { id: "classify" });

      // Fetch real historical weather data for LSTM prediction
      const historicalData = await getHistoricalWeather(
        selectedLocation.latitude,
        selectedLocation.longitude,
        14 // 14 days for LSTM window
      );

      // Convert historical data to LSTM format
      const lstmInputData: LSTMPredictionRequest['data'] = historicalData.historical_data.map(item => ({
        date: item.date,
        T2M: item.temperature?.temp || item.T2M || 25.0,
        T2M_MIN: item.temperature?.temp ? item.temperature.temp - 3 : item.T2M_MIN || 22.0,
        T2M_MAX: item.temperature?.temp ? item.temperature.temp + 3 : item.T2M_MAX || 30.0,
        RH2M: item.temperature?.humidity || item.RH2M || 75.0,
        WS10M: item.wind?.speed || item.WS10M || 2.0,
        WD10M: item.wind?.direction || item.WD10M || 180.0,
        PS: item.pressure ? item.pressure * 10 : item.PS || 1013.0, // Convert hPa to kPa if needed
        PRECTOTCORR: item.PRECTOTCORR || 0.0,
        ALLSKY_SFC_SW_DWN: item.ALLSKY_SFC_SW_DWN || 200.0,
        ALLSKY_SFC_UVA: item.ALLSKY_SFC_UVA || 30.0
      }));

      // Ensure we have exactly 14 data points
      if (lstmInputData.length !== 14) {
        throw new Error(`Expected 14 days of historical data, got ${lstmInputData.length}`);
      }

      // Use the new LSTM prediction API with real historical data
      const lstmResult = await predictLSTMTemperature({
        data: lstmInputData
      });

      if (!lstmResult.success) {
        throw new Error(lstmResult.error || "LSTM prediction failed");
      }

      const predictedTemp = lstmResult.predicted_temperature;

      // Combine CNN and LSTM results
      const classification = cnnResult.is_wildfire ? 'WILDFIRE' : 'SAFE';
      const locationName = selectedLocation.name;

      // Store combined result
      const combinedResult: ClassificationResponse & { predicted_temperature: number } = {
        ...cnnResult,
        predicted_temperature: predictedTemp
      };

      setClassificationResult(combinedResult);

      toast.success("Full Analysis COMPLETED!", {
        id: "classify",
        description: `🔍 ${classification} at ${locationName}\n🌡️ ${predictedTemp.toFixed(1)}°C predicted`,
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      Swal.fire("Analysis Failed", message, "error");
      console.error("Classification error:", err);
    } finally {
      setIsClassifying(false);
    }
  }, [mapElement, mapZoomFunction, selectedLocation, setClassificationResult]);

  // Helper function to generate mock historical weather data in dictionary format
  const generateHistoricalWeatherData = (currentWeather: CurrentWeatherData, days: number = 14): LSTMPredictionRequest['data'] => {
    const baseTemp = currentWeather.temperature.current;
    const baseHumidity = currentWeather.temperature.humidity;
    const baseWindSpeed = currentWeather.wind.speed;
    const basePressure = 1013.0; // Standard pressure in hPa

    const data: LSTMPredictionRequest['data'] = [];

    for (let i = days - 1; i >= 0; i--) { // Generate from oldest to newest
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        T2M: baseTemp + (Math.random() - 0.5) * 3, // ±1.5°C variation
        T2M_MIN: baseTemp - 3 + (Math.random() - 0.5) * 2, // Min temp within 3°C below
        T2M_MAX: baseTemp + 3 + (Math.random() - 0.5) * 2, // Max temp within 3°C above
        RH2M: Math.max(30, Math.min(90, baseHumidity + (Math.random() - 0.5) * 15)), // Humidity 30-90%
        WS10M: Math.max(0.5, baseWindSpeed + (Math.random() - 0.5) * 2), // Wind speed min 0.5 m/s
        WD10M: Math.random() * 360, // Wind direction 0-360°
        PS: basePressure + (Math.random() - 0.5) * 10.0, // Pressure around 1013 hPa
        PRECTOTCORR: Math.max(0, Math.random() * 15), // Rainfall 0-15mm
        ALLSKY_SFC_SW_DWN: 4.0 + Math.random() * 4, // Solar radiation 4-8 kW/m²
        ALLSKY_SFC_UVA: 0.2 + Math.random() * 0.4 // UV index 0.2-0.6
      });
    }

    return data;
  };

  // 🌡️ Predict Weather using LSTM with real historical data
  const predictWeather = useCallback(async () => {
    if (!currentWeather) {
      Swal.fire("No Weather Data", "Please wait for weather data to load first.", "warning");
      return;
    }

    if (!selectedLocation) {
      Swal.fire("No Location Selected", "Please select a location on the map first.", "warning");
      return;
    }

    setIsPredictingWeather(true);
    toast.loading("Fetching historical weather data...", { id: "predict" });

    try {
      // Fetch real historical weather data from NASA POWER API
      const historicalData = await getHistoricalWeather(
        selectedLocation.latitude,
        selectedLocation.longitude,
        14 // 14 days for LSTM window
      );

      toast.loading("Running LSTM AI prediction...", { id: "predict" });

      // Check if we got real NASA POWER data or fallback mock data
      const dataSource = historicalData.data_source || 'unknown';
      const isRealData = dataSource === 'nasa_power';

      // Convert historical data to LSTM format
      const lstmInputData: LSTMPredictionRequest['data'] = historicalData.historical_data.map(item => ({
        date: item.date,
        T2M: item.temperature?.temp || item.T2M || 25.0,
        T2M_MIN: item.temperature?.temp ? item.temperature.temp - 3 : item.T2M_MIN || 22.0,
        T2M_MAX: item.temperature?.temp ? item.temperature.temp + 3 : item.T2M_MAX || 30.0,
        RH2M: item.temperature?.humidity || item.RH2M || 75.0,
        WS10M: item.wind?.speed || item.WS10M || 2.0,
        WD10M: item.wind?.direction || item.WD10M || 180.0,
        PS: item.pressure || (item.PS && item.PS < 200 ? item.PS * 10 : item.PS) || 1013.0, // Ensure hPa (NASA gives kPa, Mock gives hPa)
        PRECTOTCORR: item.PRECTOTCORR || 0.0,
        ALLSKY_SFC_SW_DWN: item.ALLSKY_SFC_SW_DWN || 200.0,
        ALLSKY_SFC_UVA: item.ALLSKY_SFC_UVA || 30.0
      }));

      // Ensure we have exactly 14 data points
      if (lstmInputData.length !== 14) {
        throw new Error(`Expected 14 days of historical data, got ${lstmInputData.length}`);
      }

      // Use the new LSTM prediction API with real historical data
      const lstmResult = await predictLSTMTemperature({
        data: lstmInputData,
        current_temp: currentWeather?.temperature.current
      });

      if (!lstmResult.success) {
        throw new Error(lstmResult.error || "LSTM prediction failed");
      }

      // Debug: Log the full API response to see what's actually returned
      console.log('🔍 LSTM API Response:', lstmResult);
      console.log('🔍 Predictions:', lstmResult.predictions);
      console.log('🔍 Summary:', lstmResult.summary);
      console.log('🔍 Additional Parameters:', lstmResult.additional_parameters);

      // Use the data directly from the API response - no fallbacks for additional_parameters
      const detailedResponse: LSTMPredictionResponse = {
        predictions: lstmResult.predictions || [],
        summary: lstmResult.summary || {
          next_day_temperature: lstmResult.predicted_temperature,
          week_avg_temperature: lstmResult.predicted_temperature,
          trend: 'stable'
        },
        additional_parameters: lstmResult.additional_parameters || {
          avg_humidity_7d: 0,
          avg_wind_speed_7d: 0,
          avg_pressure_7d: 0
        }, // Provide fallback if undefined
        unit: lstmResult.unit,
        model_status: lstmResult.model_status || 'loaded',
        confidence: lstmResult.confidence || 0.85,
        prediction_type: lstmResult.prediction_type || 'lstm_temperature_prediction',
        days_ahead: lstmResult.days_ahead || 7,
        timestamp: lstmResult.timestamp,
        data_points_used: lstmResult.data_points_used || 14,
        is_dummy: !isRealData
      };

      // Clear any previous data first to ensure fresh display
      setWeatherPrediction(null);
      setWeatherPredictionData(null);

      // Small delay to ensure UI updates
      setTimeout(() => {
        setWeatherPrediction(lstmResult.predicted_temperature);
        setWeatherPredictionData(detailedResponse);

        const dataSourceText = isRealData ? "NASA POWER API" : "fallback data";
        const nextDayTemp = detailedResponse.summary?.next_day_temperature?.toFixed(1) || 'N/A';
        const weekAvgTemp = detailedResponse.summary?.week_avg_temperature?.toFixed(1) || 'N/A';

        toast.success("Weather Prediction Complete!", {
          id: "predict",
          description: `Next: ${nextDayTemp}°C | 7-Day Avg: ${weekAvgTemp}°C\nUsing: ${dataSourceText}`,
        });
      }, 100);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Weather prediction failed.";
      Swal.fire("Prediction Failed", message, "error");
      console.error("Weather prediction error:", err);
    } finally {
      setIsPredictingWeather(false);
    }
  }, [currentWeather, selectedLocation]);

  const handleReset = useCallback(() => {
    setClassificationResult(null);
    setScreenshotPreview(null);
  }, [setClassificationResult]);

  // ✅ Sidebar component
  const SidebarContent = useCallback(() => (
    <div className="flex flex-col min-h-0 h-full bg-black border-r border-gray-800">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Flame className="w-5 h-5 text-orange-400 mr-2" /> Analysis
        </h2>
        <p className="text-xs text-white/70">Weather Data & Wildfire Analysis</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 p-4">
          {/* Weather Component */}
          <WeatherComponent />

          {/* Weather Prediction Section */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center">
                <Cloud className="w-4 h-4 text-blue-400 mr-2" />
                Weather Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weatherPredictionData && (
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-xs font-medium">LSTM AI Prediction Summary</p>
                    <div className="flex justify-center gap-4 mt-2">
                      <div className="text-center">
                        <p className="text-blue-300 font-bold text-lg">
                          {weatherPredictionData.summary?.next_day_temperature?.toFixed(1) || '--'}°C
                        </p>
                        <p className="text-xs text-white/60">Next Day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-purple-300 font-bold text-lg">
                          {weatherPredictionData.summary?.week_avg_temperature?.toFixed(1) || '--'}°C
                        </p>
                        <p className="text-xs text-white/60">7-Day Avg</p>
                      </div>
                    </div>
                    <p className="text-white/70 text-xs mt-2">
                      Trend: <span className={`font-medium ${
                        weatherPredictionData.summary?.trend === 'increasing' ? 'text-red-300' :
                        weatherPredictionData.summary?.trend === 'decreasing' ? 'text-blue-300' : 'text-gray-300'
                      }`}>
                        {weatherPredictionData.summary?.trend || 'stable'}
                      </span>
                    </p>
                  </div>

                  {/* 7-Day Forecast Table */}
                  {weatherPredictionData.predictions && weatherPredictionData.predictions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/70 text-xs font-medium">7-Day Temperature Forecast</p>
                      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-white/10 border-b border-white/10">
                              <tr>
                                <th className="text-left p-2 text-white/80 font-medium">Day</th>
                                <th className="text-left p-2 text-white/80 font-medium">Date</th>
                                <th className="text-right p-2 text-white/80 font-medium">Temp (°C)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weatherPredictionData.predictions.map((pred) => (
                                <tr key={pred.day} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                                  <td className="p-2 text-white/70">
                                    {pred.day_name || `Day ${pred.day}`}
                                  </td>
                                  <td className="p-2 text-white/70">
                                    {new Date(pred.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </td>
                                  <td className="p-2 text-right">
                                    <span className={`font-medium ${
                                      pred.temperature > 30 ? 'text-red-300' :
                                      pred.temperature > 25 ? 'text-yellow-300' :
                                      pred.temperature > 20 ? 'text-blue-300' : 'text-green-300'
                                    }`}>
                                      {pred.temperature.toFixed(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Temperature Range Summary */}
                        <div className="border-t border-white/10 p-2 bg-white/5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Range:</span>
                            <span className="text-white/80 font-medium">
                              {weatherPredictionData.summary?.temp_range?.min?.toFixed(1) || '0.0'}°C - {weatherPredictionData.summary?.temp_range?.max?.toFixed(1) || '0.0'}°C
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wildfire Risk Indicator */}
                  {weatherPredictionData && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-xs font-medium">Wildfire Risk Chance</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          (weatherPredictionData.summary?.week_avg_temperature || 0) > 30 || (weatherPredictionData.additional_parameters?.avg_humidity_7d || 100) < 50
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : (weatherPredictionData.summary?.week_avg_temperature || 0) > 25
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {(weatherPredictionData.summary?.week_avg_temperature || 0) > 30 || (weatherPredictionData.additional_parameters?.avg_humidity_7d || 100) < 50
                            ? 'HIGH'
                            : (weatherPredictionData.summary?.week_avg_temperature || 0) > 25
                              ? 'MODERATE'
                              : 'LOW'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Additional Parameters */}
                  {weatherPredictionData.additional_parameters && (
                    <div className="space-y-2">
                      <p className="text-white/70 text-xs font-medium">Historical Analysis (7 Days)</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col items-center p-2 bg-white/5 rounded-md">
                          <span className="text-white/60">Avg Humidity</span>
                          <span className="text-green-300 font-medium">
                            {weatherPredictionData.additional_parameters.avg_humidity_7d?.toFixed(1) || '0.0'}%
                          </span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-white/5 rounded-md">
                          <span className="text-white/60">Avg Wind Speed</span>
                          <span className="text-yellow-300 font-medium">
                            {weatherPredictionData.additional_parameters.avg_wind_speed_7d?.toFixed(1) || '0.0'} m/s
                          </span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-white/5 rounded-md">
                          <span className="text-white/60">Avg Pressure</span>
                          <span className="text-orange-300 font-medium">
                            {weatherPredictionData.additional_parameters.avg_pressure_7d ? Math.round(weatherPredictionData.additional_parameters.avg_pressure_7d) : '0'} hPa
                          </span>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Model Info */}
                  <div className="w-full grid grid-cols-1 gap-2 text-xs">
                    <div className="flex flex-col items-center p-2 bg-white/5 rounded-md">
                      <span className="text-white/60">Confidence</span>
                      <span className="text-yellow-300 font-medium">
                        {Math.round((weatherPredictionData.confidence || 0.85) * 100)}%
                      </span>
                    </div>

                  </div>
                </div>
              )}

              <Button
                onClick={predictWeather}
                disabled={isPredictingWeather || !currentWeather}
                className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium disabled:opacity-50"
              >
                {isPredictingWeather ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Predicting..
                  </>
                ) : (
                  <>
                    Predict Weather
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Empty state */}
          <div className="text-center text-white/50 text-base py-6">
            Use the Classify Area button in the header above the map to start AI analysis
          </div>
        </div>
      </ScrollArea>
    </div>
  ), [currentWeather, weatherPrediction, isPredictingWeather, predictWeather]);

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
                  {classificationResult.predicted_temperature && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Predicted Temp:</span>
                      <span className="text-white font-semibold">
                        {classificationResult.predicted_temperature.toFixed(1)}°C
                      </span>
                    </div>
                  )}
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
