"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/config/supabase";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

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

export default function ForgotPassword() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [email, setEmail] = useState("");
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
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('User not found') || error.message.includes('email not found')) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "No account found with this email address.",
          });
        } else if (error.message.includes('Invalid email')) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Invalid email format.",
          });
        } else if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
          Swal.fire({
            icon: "error",
            title: "Too Many Attempts",
            text: "Too many password reset attempts. Please try again later.",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: error.message,
          });
        }
      } else {
        // Success - password reset email sent
        Swal.fire({
          icon: "success",
          title: "Email Sent",
          text: "A password reset link has been sent to your email address. Please check your inbox and follow the instructions.",
          confirmButtonText: "Back to Login"
        }).then((result) => {
          if (result.isConfirmed) {
            router.push("/login");
          }
        });
      }
    } catch (err) {
      console.error('Password reset error:', err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "An unexpected error occurred. Please try again.",
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
      {!isLoaded && (
        <div className="fixed inset-0 w-full h-full -z-10 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white">Loading Graphics...</p>
          </div>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col items-center justify-center h-screen p-6">
        <main className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-md dark:drop-shadow-lg transition-all duration-300">
            Forgot Password
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
            Please fill the email address to reset your password
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
                  value={email}
                  onChange={handleChange} 
                  required
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white gap-2 px-6 py-3 font-medium shadow-lg w-full" 
                />
              </div>
              
              <div className="flex justify-center">
                <button 
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white px-6 py-3 font-medium shadow-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending to your email..." : "Send Reset Link"}
                </button>
              </div>
            </form>
            
            <div className="flex justify-center mt-4">
              <a 
                href="/login" 
                className="text-white/90 hover:text-white hover:underline transition-all duration-300 ease-out text-sm"
              >
                Back to Login
              </a>
            </div>
          </div>
        </main>
        
        <footer className="absolute bottom-4 text-white/80 text-sm">
          2025 © Flame Prophet. All rights reserved.
        </footer>
      </div>
    </div>
  );
}