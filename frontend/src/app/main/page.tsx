"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  AlertTriangle, 
  Flame, 
  Wind, 
  Thermometer, 
  Droplets, 
  Activity,
  TrendingUp,
  MapPin,
  Clock,
  Shield,
  Database,
  Menu
} from "lucide-react";

// Define interfaces for the data structures
interface Alert {
  id: string;
  location: string;
  riskLevel: string;
  time: string;
  confidence: number;
  factors?: string[];
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  riskLevel: string;
}

// Dynamically import MapComponent to avoid SSR issues with leaflet
const MapComponent = dynamic(() => import("@/components/MapComponent").then(mod => ({
  default: mod.MapComponent
})), {
  ssr: false
}) as React.ComponentType<{ className?: string }>;

export default function MainPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [systemStatus, setSystemStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch real data when component mounts
  useEffect(() => {
    if (user) {
      fetchSystemData();
    }
  }, [user]);

  const fetchSystemData = async () => {
    setIsLoadingData(true);
    try {
      // Add your actual API calls here
      // const alertsResponse = await fetch('/api/alerts');
      // const weatherResponse = await fetch('/api/weather');
      // const alerts = await alertsResponse.json();
      // const weather = await weatherResponse.json();
      
      // For now, set empty states until real API is connected
      setAlerts([]);
      setWeatherData(null);
      setSystemStatus('active');
    } catch (error) {
      console.error('Error fetching system data:', error);
      setSystemStatus('error');
    } finally {
      setIsLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case 'active': return 'bg-green-400';
      case 'error': return 'bg-red-400';
      case 'loading': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  const getSystemStatusText = () => {
    switch (systemStatus) {
      case 'active': return 'Active Monitoring';
      case 'error': return 'System Error';
      case 'loading': return 'Connecting...';
      default: return 'Unknown Status';
    }
  };

  const getRiskColor = (level: string | undefined): string => {
    switch (level?.toLowerCase()) {
      case "high": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-300 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Sidebar content component for reuse in both desktop and mobile
  const SidebarContent = ({ onClose = () => {} }) => (
    <div className="h-full bg-black border-r border-white/10 lg:border-r flex flex-col">
      {/* Sidebar Header */}
      <div className="p-3 sm:p-4 border-b border-white/10 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold flex items-center text-white">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-white" />
          Forest Fire Detection
        </h2>
        <p className="text-xs sm:text-sm text-white/70 mt-1">
          Real-time monitoring and prediction system
        </p>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-4 h-full">
          {/* Current Conditions */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-white">Current Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                  <span className="ml-2 text-xs sm:text-sm text-white/70">Loading weather data...</span>
                </div>
              ) : weatherData ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                      <span className="text-xs sm:text-sm text-white">Temperature</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">{weatherData.temperature}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Droplets className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                      <span className="text-xs sm:text-sm text-white">Humidity</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">{weatherData.humidity}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wind className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                      <span className="text-xs sm:text-sm text-white">Wind Speed</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">{weatherData.windSpeed} km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                      <span className="text-xs sm:text-sm text-white">Fire Risk</span>
                    </div>
                    <Badge className={getRiskColor(weatherData.riskLevel)}>
                      {weatherData.riskLevel}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Database className="h-6 w-6 sm:h-8 sm:w-8 text-white/30 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-white/70">No weather data available</p>
                  <Button
                    onClick={fetchSystemData}
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium mx-auto"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator className="bg-white/10" />

          {/* Active Alerts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-white">Active Alerts</h3>
              <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                {alerts.length} total
              </Badge>
            </div>
            
            {isLoadingData ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                <span className="ml-2 text-xs sm:text-sm text-white/70">Loading alerts...</span>
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3 text-white/70" />
                            <span className="text-xs font-medium truncate text-white">
                              {alert.location}
                            </span>
                          </div>
                          <Badge
                            className={getRiskColor(alert.riskLevel)}
                          >
                            {alert.riskLevel}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{alert.time}</span>
                          </div>
                          <span>{alert.confidence}% confidence</span>
                        </div>
                        
                        {alert.factors && (
                          <div className="flex flex-wrap gap-1">
                            {alert.factors.map((factor: string, index: number) => (
                              <Badge 
                                key={index}
                                variant="outline" 
                                className="text-xs px-2 py-0 border-white/20 text-white/60"
                              >
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-white/30 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-white/70">No active alerts</p>
                <p className="text-xs text-white/50 mt-1">System is monitoring for potential threats</p>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-medium mb-3 text-white">Quick Actions</h3>
            <Button 
              variant="outline" 
              className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium mx-auto"
              onClick={onClose}
            >
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Generate Report
            </Button>
            <Button 
              variant="outline" 
              className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium mx-auto"
              onClick={onClose}
            >
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              variant="outline" 
              className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium mx-auto"
              onClick={() => {
                fetchSystemData();
                onClose();
              }}
            >
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10">
        <Header />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Left Sidebar */}
        <div className="w-80 xl:w-96 bg-black border-r border-white/10 hidden lg:flex flex-col">
          <SidebarContent />
        </div>

        {/* Map Section */}
        <div className="flex-1 bg-black relative min-h-full">
          <div className="absolute inset-0">
            <MapComponent className="w-full h-full" />
          </div>
          
          {/* Mobile Sidebar Toggle Button - Moved to right for left sidebar */}
          <div className="absolute top-4 left-4 z-10 lg:hidden">
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button className="bg-black/90 border border-white/20 backdrop-blur-sm hover:bg-white/10">
                  <Menu className="h-4 w-4 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 sm:w-96 p-0 bg-black border-white/10">
                <SidebarContent onClose={() => setIsMobileSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop Floating Status Panel - Adjusted position for left sidebar */}
          <div className="absolute top-4 right-4 z-10 hidden lg:block">
            <Card className="bg-black/90 border-white/20 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white">System Status</p>
                    <p className="text-xs text-white/70">{getSystemStatusText()}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getSystemStatusColor()} ${systemStatus === 'active' ? 'animate-pulse' : ''}`}></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats - Moved to bottom right to avoid overlap with status panel */}
          <div className="absolute bottom-4 right-4 z-10 space-y-2">
            <Card className="bg-black/90 border-white/20 backdrop-blur-sm">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-black/90 border-white/20 backdrop-blur-sm">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  <span className="text-xs sm:text-sm font-medium text-white">
                    Risk: {weatherData?.riskLevel || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Mobile System Status */}
            <Card className="bg-black/90 border-white/20 backdrop-blur-sm lg:hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  <span className="text-xs sm:text-sm font-medium text-white">{getSystemStatusText()}</span>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getSystemStatusColor()} ${systemStatus === 'active' ? 'animate-pulse' : ''}`}></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10">
        <Footer />
      </div>
    </div>
  );
}
