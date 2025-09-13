"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  Activity,
  Flame,
  Eye,
  FileText,
  Settings,
  Download,
  Upload,
  ChevronRight,
  Star,
  Shield,
  Zap,
  Globe,
  LogOut
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);

  const handleSignOut = async () => {
    const result = await Swal.fire({
      title: "Sign Out?",
      text: "Are you sure you want to sign out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Sign Out",
      cancelButtonText: "Cancel",
      background: "#000",
      color: "#fff"
    });

    if (result.isConfirmed) {
      try {
        await logout();
        router.push("/login");
        Swal.fire({
          icon: "success",
          title: "Signed Out",
          text: "You have been successfully signed out.",
          background: "#000",
          color: "#fff",
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error("Sign out error:", error);
        Swal.fire({
          icon: "error",
          title: "Sign Out Failed",
          text: "Failed to sign out. Please try again.",
          background: "#000",
          color: "#fff"
        });
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // User stats (mock data for demonstration)
  const userStats = {
    totalPredictions: 156,
    activeAlerts: 3,
    riskAreas: 12,
    processorsUsed: 8,
    accuracy: 94.6
  };

  // Recent activities
  const recentActivities = [
    {
      id: 1,
      type: "prediction",
      location: "California Wilderness",
      risk: "High",
      timestamp: "2 hours ago",
      action: "Processed satellite imagery"
    },
    {
      id: 2,
      type: "alert",
      location: "Arizona Forest",
      risk: "Medium",
      timestamp: "4 hours ago",
      action: "Fire risk alert generated"
    },
    {
      id: 3,
      type: "analysis",
      location: "Colorado Mountains",
      risk: "Low",
      timestamp: "6 hours ago",
      action: "Weather data analysis completed"
    },
    {
      id: 4,
      type: "update",
      location: "New Mexico Desert",
      risk: "High",
      timestamp: "8 hours ago",
      action: "Prediction model updated"
    }
  ];

  // Quick actions
  const quickActions = [
    {
      icon: Upload,
      title: "Upload Data",
      description: "Upload satellite imagery and environmental data",
      color: "bg-blue-500/20 text-blue-300"
    },
    {
      icon: MapPin,
      title: "Create Alert",
      description: "Set up monitoring alerts for specific locations",
      color: "bg-orange-500/20 text-orange-300"
    },
    {
      icon: BarChart3,
      title: "View Reports",
      description: "Access detailed analysis reports",
      color: "bg-green-500/20 text-green-300"
    },
    {
      icon: Settings,
      title: "Configure",
      description: "Adjust prediction settings and preferences",
      color: "bg-purple-500/20 text-purple-300"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-white/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Simple Header for Dashboard */}
      <header className="bg-black/95 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push('/main')}
              className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-lg font-semibold">Back to Main</span>
            </Button>
            <div className="h-6 border-l border-white/30"></div>
            <h1 className="text-xl font-bold text-orange-400">Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {user.email?.split("@")[0]}!
                </h1>
                <p className="text-white/70">
                  Here's your wildfire prediction dashboard overview
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  <Shield className="w-3 h-3 mr-1" />
                  System Active
                </Badge>
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Predictions */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-400 text-sm font-medium">Total Predictions</p>
                      <p className="text-white text-2xl font-bold">{userStats.totalPredictions}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Active Alerts */}
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30 hover:border-orange-400/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-400 text-sm font-medium">Active Alerts</p>
                      <p className="text-white text-2xl font-bold">{userStats.activeAlerts}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Risk Areas Monitoring */}
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 text-sm font-medium">Risk Areas</p>
                      <p className="text-white text-2xl font-bold">{userStats.riskAreas}</p>
                    </div>
                    <Globe className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Model Accuracy */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-400 text-sm font-medium">Model Accuracy</p>
                      <p className="text-white text-2xl font-bold">{userStats.accuracy}%</p>
                      <Progress value={userStats.accuracy} className="mt-2 h-2" />
                    </div>
                    <Zap className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card className="bg-white/5 border-white/10 h-full">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-orange-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {recentActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <div className={`p-2 rounded-full ${activity.risk === "High" ? "bg-red-500/20" : activity.risk === "Medium" ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                              <Activity className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-white font-medium">{activity.location}</h4>
                                <Badge
                                  className={
                                    activity.risk === "High"
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                      : activity.risk === "Medium"
                                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                      : 'bg-green-500/20 text-green-300 border-green-500/30'
                                  }
                                >
                                  {activity.risk}
                                </Badge>
                              </div>
                              <p className="text-white/70 text-sm">{activity.action}</p>
                              <div className="flex items-center mt-2 text-xs text-white/50">
                                <Clock className="h-3 w-3 mr-1" />
                                {activity.timestamp}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-orange-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start p-4 h-auto rounded-full transition-all duration-300 group hover:bg-white/10"
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <div className={`p-2 rounded-lg ${action.color}`}>
                            <action.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">{action.title}</p>
                            <p className="text-white/70 text-xs">{action.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Performance & Analytics Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* System Overview */}
              <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Flame className="h-5 w-5 mr-2 text-orange-400" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Prediction Engine</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">ML Models</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      Optimized
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Real-time Monitoring</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">API Response Time</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      {"< 200ms"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Heat Map Summary */}
              <Card className="bg-gradient-to-br from-red-500/5 to-pink-500/5 border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                    Global Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">High Risk Areas</span>
                    <span className="text-red-400 font-bold">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Medium Risk Areas</span>
                    <span className="text-yellow-400 font-bold">28</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Low Risk Areas</span>
                    <span className="text-green-400 font-bold">45</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Total Monitored</span>
                    <span className="text-white font-bold">85</span>
                  </div>
                  <Separator className="my-4 bg-white/10" />
                  <Button className="w-full rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium">
                    <Eye className="h-4 w-4 mr-2" />
                    View Detailed Map
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button className="flex-1 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium">
                <Flame className="h-4 w-4 mr-2" />
                View Main Dashboard
              </Button>
              <Button className="flex-1 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button className="flex-1 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button onClick={handleSignOut} className="flex-1 rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10">
        <Footer />
      </div>
    </div>
  );
}
