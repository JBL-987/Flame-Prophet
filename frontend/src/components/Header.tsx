"use client";
import { Button } from "@/components/ui/button";
import { Upload, Menu, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Flame Prophet</h1>
          </div>
          <span className="text-sm text-gray-500 hidden md:inline">
            AI Wildfire Prediction
          </span>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-3">
          {/* Upload Button */}
          <Button
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Image & Metadata</span>
            <span className="sm:hidden">Upload</span>
          </Button>

          {/* User Menu */}
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="w-4 h-4" />
                <span className="hidden md:inline">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Not signed in
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
