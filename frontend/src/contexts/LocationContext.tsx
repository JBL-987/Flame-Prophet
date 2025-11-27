"use client";

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { CurrentWeatherData, HistoricalWeatherData, ClassificationResponse } from '@/lib/api';

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
  displayName: string;
}

interface LocationContextType {
  selectedLocation: MapLocation | null;
  searchQuery: string;
  searchSuggestions: MapLocation[];
  isSearching: boolean;
  classificationResult: ClassificationResponse | null;
  currentWeather: CurrentWeatherData | null;
  historicalWeather: HistoricalWeatherData | null;
  isLoadingWeather: boolean;
  setSelectedLocation: (location: MapLocation | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchSuggestions: (suggestions: MapLocation[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setClassificationResult: (result: ClassificationResponse | null) => void;
  setCurrentWeather: (weather: CurrentWeatherData | null) => void;
  setHistoricalWeather: (weather: HistoricalWeatherData | null) => void;
  setIsLoadingWeather: (loading: boolean) => void;
  clearSearch: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<MapLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResponse | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [historicalWeather, setHistoricalWeather] = useState<HistoricalWeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setIsSearching(false);
  };

  const contextValue: LocationContextType = {
    selectedLocation,
    searchQuery,
    searchSuggestions,
    isSearching,
    classificationResult,
    currentWeather,
    historicalWeather,
    isLoadingWeather,
    setSelectedLocation,
    setSearchQuery,
    setSearchSuggestions,
    setIsSearching,
    setClassificationResult,
    setCurrentWeather,
    setHistoricalWeather,
    setIsLoadingWeather,
    clearSearch,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};
