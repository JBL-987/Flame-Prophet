"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Cloud,
  CloudRain,
  Sun,
  Thermometer,
  Wind,
  Droplets,
  Eye,
  RefreshCw
} from 'lucide-react';
import { getCurrentWeather, getErrorMessage } from '@/lib/api';
import { useLocationContext } from '@/contexts/LocationContext';
import { toast } from 'sonner';

export const WeatherComponent: React.FC = () => {
  const {
    selectedLocation,
    currentWeather,
    isLoadingWeather,
    setCurrentWeather,
    setIsLoadingWeather
  } = useLocationContext();

  // Weather data is handled through context and direct API calls in classification

  // Weather icons mapping from OpenWeatherMap
  const getWeatherIcon = (iconCode: string, size: number = 24) => {
    switch (iconCode.slice(0, 2)) {
      case '01': return <Sun size={size} className="text-yellow-400" />;
      case '02': return <Sun size={size} className="text-yellow-300" />;
      case '03': return <Cloud size={size} className="text-gray-400" />;
      case '04': return <Cloud size={size} className="text-gray-500" />;
      case '09': return <CloudRain size={size} className="text-blue-400" />;
      case '10': return <CloudRain size={size} className="text-blue-500" />;
      case '11': return <CloudRain size={size} className="text-purple-500" />;
      case '13': return <Cloud size={size} className="text-blue-200" />;
      case '50': return <Cloud size={size} className="text-gray-300" />;
      default: return <Cloud size={size} className="text-gray-400" />;
    }
  };

  // Weather data is loaded automatically for default location when no location selected
  const fetchWeatherData = async (lat?: number, lon?: number) => {
    // Use default Indonesian center if no coordinates provided
    const targetLat = lat ?? -1.5; // Indonesian center latitude
    const targetLon = lon ?? 113.5; // Indonesian center longitude

    setIsLoadingWeather(true);
    try {
      // Fetch current weather
      const currentData = await getCurrentWeather(targetLat, targetLon);
      setCurrentWeather(currentData);

      // Only show toast for manual refreshes, not automatic loads
      if (lat !== undefined && lon !== undefined) {
        toast.success('Weather data loaded successfully');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to load weather data: ${message}`);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Auto-load weather for default location on component mount
  useEffect(() => {
    if (!currentWeather && !isLoadingWeather) {
      fetchWeatherData();
    }
  }, [currentWeather, isLoadingWeather]);

  const refreshWeather = () => {
    if (selectedLocation) {
      fetchWeatherData(selectedLocation.latitude, selectedLocation.longitude);
    } else {
      // Refresh default location weather
      fetchWeatherData();
    }
  };

  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`;
  const formatWindSpeed = (speed: number) => `${speed.toFixed(1)} m/s`;

  return (
    <Card className="bg-white/5 border-white/10 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white flex items-center">
            <Cloud className="w-4 h-4 text-blue-400 mr-2" />
            {currentWeather ? `Weather - ${currentWeather.location.name}` : 'Weather Data'}
          </CardTitle>
          <Button
            onClick={refreshWeather}
            disabled={isLoadingWeather}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-white/20 hover:bg-white/10"
          >
            <RefreshCw size={14} className={isLoadingWeather ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoadingWeather && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white/70 text-sm">Loading weather data...</p>
          </div>
        )}

        {currentWeather && !isLoadingWeather && (
          <div className="space-y-4">
            {/* Current Weather */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center">
                {getWeatherIcon(currentWeather.weather.icon, 32)}
                <div className="ml-3">
                  <p className="text-white font-medium text-lg">
                    {formatTemperature(currentWeather.temperature.current)}
                  </p>
                  <p className="text-white/70 text-sm capitalize">
                    {currentWeather.weather.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">
                  Feels like {formatTemperature(currentWeather.temperature.feels_like)}
                </p>
              </div>
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center text-white/80">
                <Thermometer size={16} className="mr-2 text-red-400" />
                <div>
                  <p className="text-xs text-white/60">MIN/MAX</p>
                  <p className="text-sm">
                    {formatTemperature(currentWeather.temperature.min)} / {formatTemperature(currentWeather.temperature.max)}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-white/80">
                <Droplets size={16} className="mr-2 text-blue-400" />
                <div>
                  <p className="text-xs text-white/60">HUMIDITY</p>
                  <p className="text-sm">{currentWeather.temperature.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center text-white/80">
                <Wind size={16} className="mr-2 text-gray-400" />
                <div>
                  <p className="text-xs text-white/60">WIND</p>
                  <p className="text-sm">{formatWindSpeed(currentWeather.wind.speed)}</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
