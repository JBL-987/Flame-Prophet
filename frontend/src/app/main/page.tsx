"use client";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { MapComponent } from "@/components/MapComponent";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Play, Settings, BarChart3, AlertTriangle, Activity } from "lucide-react";

export default function MainPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Action Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">Global Wildfire Monitor</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Monitoring Active</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="outline" size="sm">
                  <Activity className="w-4 h-4 mr-2" />
                  Live Feed
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="flex-1">
          <MapComponent className="w-full h-screen" />
        </div>

        {/* Dashboard Cards */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              {/* Quick Upload Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Upload className="w-5 h-5 text-orange-500" />
                    <span>Quick Upload</span>
                  </CardTitle>
                  <CardDescription>
                    Upload satellite imagery and metadata for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Analyze
                  </Button>
                </CardContent>
              </Card>

              {/* Real-time Analysis Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Play className="w-5 h-5 text-green-500" />
                    <span>Real-time Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Live wildfire risk assessment and prediction
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Monitoring</span>
                      <span className="text-green-600 font-medium">ON</span>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Alerts Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>Risk Alerts</span>
                  </CardTitle>
                  <CardDescription>
                    Critical wildfire risk notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Risk Areas</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        12 Active
                      </span>
                    </div>
                    <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" size="sm">
                      View Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <span>System Status</span>
                  </CardTitle>
                  <CardDescription>
                    AI model performance and system health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Model Accuracy</span>
                      <span className="font-medium text-green-600">94.2%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Response Time</span>
                      <span className="font-medium">1.2s</span>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      View Metrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technology Highlights */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced AI Technology</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h4 className="font-semibold mb-2">Multimodal AI</h4>
                  <p className="text-gray-600 text-sm">
                    Combines satellite imagery, weather data, and geographical features for comprehensive wildfire prediction
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🛰️</span>
                  </div>
                  <h4 className="font-semibold mb-2">Global Coverage</h4>
                  <p className="text-gray-600 text-sm">
                    Real-time satellite imagery analysis with worldwide geographic coverage and high-resolution monitoring
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className="font-semibold mb-2">Real-time Processing</h4>
                  <p className="text-gray-600 text-sm">
                    Instant risk assessment with automated alert system for immediate wildfire prevention actions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
