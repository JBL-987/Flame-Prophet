import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { Separator } from "./separator"
import { Upload, AlertTriangle, Play, Activity, Eye, TrendingUp, Satellite, Zap, Shield, Target } from "lucide-react"

export function Sidebar() {
  return (
    <div className="w-80 h-full bg-black text-white border-l border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Flame Control
            </h2>
            <p className="text-xs text-gray-400">AI Monitoring Hub</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400 font-medium">Live Monitoring</span>
          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300">
            Active
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Quick Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Upload className="w-5 h-5 text-orange-500" />
              Quick Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-300">
              Upload satellite imagery and metadata for AI analysis
            </p>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Analyze Now
            </Button>
          </CardContent>
        </Card>

        {/* Real-time Analysis */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Play className="w-5 h-5 text-green-500" />
              AI Analysis
              <Badge className="bg-green-500/20 text-green-300 text-xs">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Accuracy Rate</span>
                <span className="text-green-400 font-bold">94.7%</span>
              </div>
              <Progress value={94.7} className="h-2" />
            </div>

            <Separator className="bg-gray-700" />

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="space-y-1">
                <Satellite className="w-4 h-4 text-blue-400 mx-auto" />
                <div className="text-xs text-gray-400">Satellites</div>
                <div className="text-sm font-semibold text-blue-300">8 Active</div>
              </div>
              <div className="space-y-1">
                <Zap className="w-4 h-4 text-yellow-400 mx-auto" />
                <div className="text-xs text-gray-400">Processing</div>
                <div className="text-sm font-semibold text-yellow-300">1.2s</div>
              </div>
            </div>

            <Button variant="outline" className="w-full text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
              <Eye className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Risk Alerts */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Risk Alerts
              <Badge className="bg-red-500/20 text-red-300 text-xs animate-pulse">12 New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-300">High Risk Areas</span>
                </div>
                <Badge className="bg-red-500 text-white text-xs">8 Critical</Badge>
              </div>

              <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-300">Medium Risk Areas</span>
                </div>
                <Badge className="bg-yellow-500 text-white text-xs">4 Warnings</Badge>
              </div>
            </div>

            <Button variant="outline" className="w-full text-red-300 border-red-500/50 hover:bg-red-500/10 hover:text-red-200">
              <Eye className="w-4 h-4 mr-2" />
              View Alerts
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Activity className="w-5 h-5 text-blue-500" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">Security</span>
                </div>
                <Badge className="bg-green-500/20 text-green-300 text-xs">Protected</Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">Performance</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 text-xs">Optimal</Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">Uptime</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 text-xs">99.9%</Badge>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div className="text-center py-2">
              <p className="text-xs text-gray-400 mb-1">Global Coverage</p>
              <div className="text-lg font-bold text-green-400">247 Countries</div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4 text-sm text-gray-400">
          2025 © Flame Prophet. All rights reserved.
        </div>
      </div>
    </div>
  )
}
