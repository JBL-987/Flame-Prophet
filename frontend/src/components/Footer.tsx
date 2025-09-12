"use client";
import { Github, Twitter, Mail, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FP</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Flame Prophet</span>
            </div>
            <p className="text-gray-600 text-sm mb-4 max-w-md">
              Advanced AI-powered wildfire prediction system using multimodal analysis
              of satellite imagery, weather data, and geographical features to predict
              and prevent forest fires globally.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Analysis Tools
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Risk Assessment
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  API Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4 md:mb-0">
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>Global Wildfire Monitoring</span>
            </div>
            <span>•</span>
            <span>Real-time AI Predictions</span>
          </div>

          <div className="text-sm text-gray-600">
            © {currentYear} Flame Prophet. Built for environmental protection and forest fire prevention.
          </div>
        </div>

        {/* Additional Footer Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap justify-center md:justify-start space-x-6 text-xs text-gray-500">
            <span>🔥 Advanced ML Models</span>
            <span>🛰️ Satellite Imagery Analysis</span>
            <span>🌦️ Weather Data Integration</span>
            <span>🗺️ Global Geographic Coverage</span>
            <span>📊 Real-time Risk Assessment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
