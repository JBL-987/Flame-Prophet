"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Menu, LogOut, X, Search, BarChart3, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LocationSearchService, ProcessedLocation } from "@/lib/locationSearch";
import { useLocationContext } from "@/contexts/LocationContext";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    selectedLocation,
    searchSuggestions,
    isSearching,
    setSelectedLocation,
    setSearchSuggestions,
    setIsSearching,
    setSearchQuery: setContextSearchQuery,
    clearSearch,
  } = useLocationContext();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    router.push('/login');
  };

  const handleDashboardClick = () => {
    router.push('/dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleMainClick = () => {
    router.push('/main');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Immediately perform search and select first result
    performSearch(searchQuery, false, true);
  };

  const performSearch = async (query: string, debounce: boolean = false, selectFirst: boolean = false) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsSearching(true);
      const results = await LocationSearchService.searchLocation(query);

      if (results.length > 0) {
        setSearchSuggestions(results);
        if (selectFirst && results.length > 0) {
          handleLocationSelect(results[0]);
        } else {
          setShowSuggestions(true);
        }
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
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
    setShowSuggestions(false);
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
      setShowSuggestions(false);
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
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render header based on current pathname
  const renderHeader = () => {
    switch (pathname) {
      case '/dashboard':
        return renderDashboardHeader();
      
      case '/main':
      case '/':
        return renderMainHeader();
      
      default:
        return renderDefaultHeader();
    }
  };

  // Dashboard Header
  const renderDashboardHeader = () => (
    <header className="bg-black/95 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={handleMainClick}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="text-lg font-semibold">Back to Main</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-orange-400">Dashboard</h1>
          
          {/* User Avatar */}
          {user && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/80 hidden lg:inline">
                {user.email?.split("@")[0]}
              </span>
            </div>
          )}
          
          {/* Mobile menu for dashboard */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:bg-white/10 sm:hidden"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu for Dashboard */}
      {renderDashboardMobileMenu()}
    </header>
  );

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
            AI Wildfire Prediction
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-3">

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative" ref={searchDropdownRef}>
              <div ref={searchInputRef}>
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
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


            </div>
          </form>

          {/* Upload Button */}
          <Button
            variant="outline"
            className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Data</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDashboardClick}
            className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
            >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:bg-white/10 md:hidden"
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
          
          {user && (
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // Dashboard Mobile Menu
  const renderDashboardMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Menu */}
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50 sm:hidden">
          <div className="px-4 py-6 space-y-4">
            {/* User Info */}
            {user && (
              <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user.email?.split("@")[0]}</p>
                  <p className="text-white/60 text-sm">{user.email}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleMainClick}
                className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Main</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-start space-x-2 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Main Mobile Menu
  const renderMainMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Menu */}
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50 md:hidden">
          <div className="px-4 py-6 space-y-4">
            {/* User Info */}
            {user ? (
              <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user.email?.split("@")[0]}</p>
                  <p className="text-white/60 text-sm">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/60 text-center py-2 border-b border-white/10">
                Not signed in
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col space-y-3">
              {/* Dashboard Link */}
              <Button
                variant="outline"
                className="w-full border-orange-500/30 text-orange-300 hover:bg-orange-500/10 flex items-center justify-start space-x-2 bg-transparent"
                onClick={handleDashboardClick}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>

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

              {/* Upload Button */}
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 flex items-center justify-start space-x-2 bg-transparent"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Data</span>
              </Button>

              {user && (
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-start space-x-2 bg-transparent"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              )}
            </div>

            {/* Additional Info */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs text-white/50 text-center">
                AI Wildfire Prediction System
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return renderHeader();
}
