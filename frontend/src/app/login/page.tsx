"use client";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { supabase } from "@/config/supabase";

// Vanta.js Type Declaration
declare global {
  interface Window {
    VANTA: {
      GLOBE: (config: object) => {
        destroy: () => void;
      };
    };
  }
}

export default function Login() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const vantaRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vanta.js Globe Effect
  useEffect(() => {
    let vantaEffect: { destroy: () => void } | null = null;

    const setVanta = () => {
      if (!vantaRef.current) return;

      if (window.VANTA) {
        try {
          vantaEffect = window.VANTA.GLOBE({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 0.8,
            scaleMobile: 0.6,
            color: 0xFFA500,   
            color2: 0xFF8C00,  
            backgroundColor: 0x000000
          });
          setIsLoaded(true);
        } catch (error) {
          console.warn('Vanta.js failed to initialize:', error);
        }
      }
    };

    // Load Vanta.js scripts dynamically
    const loadVantaScripts = () => {
      // Check if scripts are already loaded
      if (window.VANTA) {
        setVanta();
        return;
      }

      // Load Three.js first
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
      document.head.appendChild(threeScript);

      // Then load Vanta.js
      threeScript.onload = () => {
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js';
        document.head.appendChild(vantaScript);

        vantaScript.onload = () => {
          setTimeout(setVanta, 100); // Small delay to ensure VANTA is available
        };
      };
    };

    loadVantaScripts();

    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [isMobile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authService.login(formData);

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Login successful!",
        timer: 1500,
        showConfirmButton: false
      });
      router.push("/main");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";

      if (errorMessage.includes('Invalid credentials')) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Invalid email or password. Please try again."
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/main`
        }
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
      Swal.fire({
        icon: "success",
        title: "Redirecting...",
        text: "Redirecting to Google OAuth",
        timer: 1000,
        showConfirmButton: false
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred with Google login";
      setError(errorMessage);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* Vanta.js Globe Background */}
      <div 
        ref={vantaRef}
        className="fixed inset-0 w-full h-full -z-10"
      />
      {/* Vanta 3D Loading Screen - Clean Black Background (same as home page) */}
      {!isLoaded && (
        <div
          className="fixed inset-0 w-full h-full flex items-center justify-center bg-black transition-all duration-500"
          style={{ zIndex: 9999 }}
        >
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col items-center justify-center h-screen p-6">
        <main className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-md dark:drop-shadow-lg transition-all duration-300">
            Login to your account
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
            Please fill in the form below to login to your account
          </p>
          
          {error && (
            <div className="bg-red-500/80 text-white p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex flex-col space-y-4 w-full max-w-md">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              <div>
                <label htmlFor="email" className="text-white block text-left mb-2">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange} 
                  required
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white gap-2 px-6 py-3 font-medium shadow-lg w-full" 
                />
              </div>
              <div>
                <label htmlFor="password" className="text-white block text-left mb-2">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white gap-2 px-6 py-3 font-medium shadow-lg w-full" 
                />
              </div>
              
              <div className="flex justify-center hover:text-white hover:underline transition-all duration-300 ease-out text-sm">
                <a href="/forgot-password" className="text-white/90 hover:text-white text-sm">Forgot Password?</a>
              </div>
              
              <div className="flex justify-center">
                <button 
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white px-6 py-3 font-medium shadow-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
            
            <div className="flex items-center my-2">
              <div className="flex-1 border-t border-white/30"></div>
              <span className="mx-4 text-white">or</span>
              <div className="flex-1 border-t border-white/30"></div>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white px-6 py-3 font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Connecting..." : "Login with Google"}
            </button>
          </div>
          
          <p className="text-white/90">Don&apos;t have an account? <a href="/signup" className="text-white hover:underline transition-all duration-300 ease-out">Sign Up now</a></p>
        </main>
        <footer className="absolute bottom-4 text-white/80 text-sm">
          2025 © Flame Prophet. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
