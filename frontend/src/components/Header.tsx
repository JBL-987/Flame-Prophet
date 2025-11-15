"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Menu, X, Search, Flame } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LocationSearchService, ProcessedLocation } from "@/lib/locationSearch";
import { useLocationContext } from "@/contexts/LocationContext";
import { classifyWildfireArea } from "@/lib/api";
import { captureMapScreenshot, blobToFile, generateScreenshotFilename } from "@/lib/mapscreenshot";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);

  const {
    searchSuggestions,
    isSearching,
    setSelectedLocation,
    setSearchSuggestions,
    setIsSearching,
    setSearchQuery: setContextSearchQuery,
  } = useLocationContext();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const handleMainClick = () => {
    router.push('/main');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle quick classification from header
  const handleClassifyArea = async () => {
    // Find map container element
    const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
    if (!mapElement) {
      toast.error('Map not found', {
        description: 'Please ensure the map is loaded'
      });
      return;
    }

    setIsClassifying(true);
    toast.loading('Capturing map screenshot...', { id: 'classify' });

    try {
      // Capture screenshot using utility function
      const screenshotBlob = await captureMapScreenshot(mapElement, {
        backgroundColor: '#000000',
        scale: 1,
      });

      // Convert blob to file
      const filename = generateScreenshotFilename();
      const screenshotFile = blobToFile(screenshotBlob, filename);

      toast.loading('Classifying wildfire...', { id: 'classify' });

      const result = await classifyWildfireArea({ image: screenshotFile });

      toast.success('Classification completed!', {
        id: 'classify',
        description: result.is_wildfire ? `WILDFIRE DETECTED (${Math.round(result.confidence * 100)}%)` : `NO WILDFIRE (${Math.round(result.confidence * 100)}%)`
      });
    } catch (error) {
      console.error('Classification error:', error);
      toast.error('Classification failed', {
        id: 'classify',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Immediately perform search and select first result
    performSearch(searchQuery, true);
  };

  const performSearch = async (query: string, selectFirst: boolean = false) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await LocationSearchService.searchLocation(query);

      if (results.length > 0) {
        setSearchSuggestions(results);
        if (selectFirst && results.length > 0) {
          handleLocationSelect(results[0]);
        }
      } else {
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: ProcessedLocation) => {
    setSelectedLocation({
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      type: location.type,
      importance: location.importance,
      displayName: location.displayName,
    });

    setSearchQuery(location.name);
    setSearchSuggestions([]);
    setContextSearchQuery(location.name);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      // Debounced search
      setTimeout(() => {
        if (value === searchQuery) {
          performSearch(value, true);
        }
      }, 300);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setSearchSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  // Render header based on current pathname
  const renderHeader = () => {
    switch (pathname) {
      case '/main':
      case '/':
        return renderMainHeader();

      default:
        return renderDefaultHeader();
    }
  };


  // Main Page Header
  const renderMainHeader = () => (
    <header className="bg-black/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-white">Flame Prophet</h1>
          </div>
          <span className="text-xs sm:text-sm text-white/70 hidden lg:inline">
            AI Wildfire Classification
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-3">

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative" ref={searchDropdownRef}>
              <div ref={searchInputRef}>
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="w-48 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white px-4 py-2 text-sm shadow-lg"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-black transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white rounded-full"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Search Suggestions Dropdown */}
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchSuggestions.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{location.name}</div>
                      <div className="text-sm text-gray-500">{location.displayName.split(',')[0]}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Classify Area Button */}
          <Button
            onClick={handleClassifyArea}
            disabled={isClassifying}
            className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium disabled:opacity-50"
          >
            {isClassifying ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Classifying...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Classify Area</span>
              </>
            )}
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:bg-white/10 lg:hidden"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu for Main */}
      {renderMainMobileMenu()}
    </header>
  );

  // Default Header (for other pages)
  const renderDefaultHeader = () => (
    <header className="bg-black/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm">FP</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Flame Prophet</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleMainClick}
            className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
          >
            Back to Main
          </Button>
        </div>
      </div>
    </header>
  );


  // Main Mobile Menu
  const renderMainMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Menu */}
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50 lg:hidden">
          <div className="px-4 py-6 space-y-4">
            {/* Navigation */}
            <div className="flex flex-col space-y-3">


              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white px-6 py-3 font-medium shadow-lg"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-black transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white rounded-full"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Classify Area Button */}
              <Button
                onClick={() => {
                  handleClassifyArea();
                  setIsMobileMenuOpen(false); // Close menu after clicking
                }}
                disabled={isClassifying}
                className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium disabled:opacity-50"
              >
                {isClassifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Classifying...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Classify Area</span>
                  </>
                )}
              </Button>

              {/* Upload Button */}
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 flex items-center justify-start space-x-2 bg-transparent"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Data</span>
              </Button>
            </div>

            {/* Additional Info */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs text-white/50 text-center">
                AI Wildfire Classification System
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return renderHeader();
}
