"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

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

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const vantaRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll-based visual effects
  const { scrollY } = useScroll();
  const modelOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const headerOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const currentYear = new Date().getFullYear();

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
      // Load Three.js first
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
      document.head.appendChild(threeScript);

      //Then load Vanta.js
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

  const SectionCard = ({ id, title, content, index }: {
    id: string;
    title: string;
    content: React.ReactNode;
    index: number;
  }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, {
      once: true,
      margin: "0px 0px -200px 0px"
    });

    return (
      <motion.section
        ref={ref}
        id={id}
        className={`min-h-[50vh] h-auto flex flex-col justify-center w-full px-2 sm:px-4 md:px-6 lg:px-8 py-12 relative z-20 ${
          index > 0 ? 'border-t border-white/10' : ''
        }`}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
      >
        <div className="max-w-6xl mx-auto w-full px-2 sm:px-3 md:px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6 md:mb-8 text-center leading-tight">{title}</h2>
          <div className="text-gray-300 text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl max-w-4xl mx-auto leading-relaxed px-1">
            {content}
          </div>
        </div>
      </motion.section>
    );
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-black w-full overflow-x-hidden font-[family-name:var(--font-geist-sans)] flex flex-col">
      {/* Vanta.js Globe Background */}
      <motion.div
        ref={vantaRef}
        className="fixed inset-0 w-full h-full z-10"
        style={{ opacity: modelOpacity }}
        transition={{ duration: 0.3 }}
      />

      {/* Vanta 3D Loading Screen - Clean Black Background */}
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

      {/* Homepage Content - Only show after Vanta loads */}
      {isLoaded && (
        <>
          <div ref={headerRef} className="relative z-10 flex flex-col items-center justify-center h-screen p-6">
            <motion.main
              className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6"
              style={{ opacity: headerOpacity }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white transition-all duration-300">
                Flame Prophet
              </h1>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                Comprehensive geospatial AI solution for Indonesia forest fire crisis prevention
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  className="rounded-full bg-white text-black border border-transparent transition-all duration-300 ease-out transform hover:scale-105 hover:bg-black hover:text-white hover:border-white flex items-center justify-center gap-2 px-6 py-3 font-medium"
                  href="/main"
                >
                  Explore Features
                </a>
              </div>
            </motion.main>
          </div>

          <div className="relative z-20 flex-1 flex flex-col">
        <SectionCard
          id="about-us"
          title="About Our Mission"
          index={0}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Advanced Forest Fire Prediction System</h3>
              <p className="mb-4">Flame Prophet is a comprehensive geospatial AI solution designed to combat Indonesia recurring forest and peatland fire crisis. The platform integrates multiple data sources including NASA satellite imagery, meteorological data, vegetation indices, and historical fire patterns to create predictive models that can forecast fire risks with high accuracy.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Environmental Impact</h3>
              <p className="mb-4">Our mission addresses the critical environmental challenges facing Southeast Asia by preventing forest fires that contribute to climate change, protect biodiversity, and eliminate transboundary haze pollution affecting 60+ million people across the region.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Advanced ML Implementation</h3>
              <p className="mb-4">The system employs advanced machine learning techniques including Random Forest, XGBoost, and deep learning models, with extensive hyperparameter tuning to optimize prediction accuracy and ensure reliable forest fire prevention.</p>
            </>
          }
        />

        <SectionCard
          id="data-source"
          title="Data Sources & Technology"
          index={1}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Multi-Source Data Integration</h3>
              <p className="mb-4">Flame Prophet integrates comprehensive geospatial data sources including NASA satellite imagery, meteorological data, vegetation indices, and historical fire patterns to create predictive models that forecast fire risks with high accuracy.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Real-Time Satellite Monitoring</h3>
              <p className="mb-4">Our system processes live satellite imagery from multiple sources, ensuring real-time fire hotspot detection and monitoring. Real-time data streams provide the foundation for our predictive analytics and early warning systems.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Advanced Geospatial Analysis</h3>
              <p className="mb-4">Machine learning models analyze complex environmental patterns, weather conditions, and vegetation health to predict potential fire occurrences with unprecedented accuracy, enabling proactive prevention measures.</p>
            </>
          }
        />

        <SectionCard
          id="licensing"
          title="Platform Architecture"
          index={2}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Modern Fullstack Architecture</h3>
              <p className="mb-4">Flame Prophet is built with modern fullstack architecture using Supabase for real-time data management. The platform ensures seamless integration of geospatial data with powerful AI capabilities for unprecedented forest fire prediction accuracy.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Real-Time Data Processing</h3>
              <p className="mb-4">Our system processes massive datasets in real-time, utilizing distributed computing infrastructure to handle the complexity of satellite imagery analysis and meteorological data integration across Southeast Asia vast landscapes.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Scalable AI Infrastructure</h3>
              <p className="mb-4">The platform leverages cloud computing resources with auto-scaling capabilities to handle peak loads during fire seasons. Advanced ML models run on optimized hardware infrastructure, ensuring fast response times and reliable predictions.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Enterprise-Grade Security</h3>
              <p className="mb-4">Built with enterprise-grade security protocols, Flame Prophet ensures data privacy and system integrity. All satellite imagery, meteorological data, and predictions are processed through encrypted channels with role-based access control.</p>
            </>
          }
        />

        <SectionCard
          id="contact"
          title="Contact Us"
          index={3}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">General Inquiries</h3>
              <p className="mb-4">Email: team@tradetalk.io<br/>
              Twitter: @TradeTalk<br/>
              Discord: discord.tradetalk.io</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Business Development</h3>
              <p className="mb-4">For partnership opportunities and enterprise solutions:<br/>
              Email: partnerships@tradetalk.io<br/>
              Schedule a call: calendly.com/tradetalk-partnerships</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Support</h3>
              <p className="mb-4">Technical support and customer service:<br/>
              Email: support@tradetalk.io<br/>
              Help Center: help.tradetalk.io<br/>
              Response Time: Within 24 hours</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Office Locations</h3>
              <p className="mb-4">Singapore HQ: 60 Anson Road, #12-01, Singapore 079914<br/>
              San Francisco: 535 Mission St, 14th Floor, San Francisco, CA 94105</p>
            </>
          }
        />

        <SectionCard
          id="products"
          title="Key Features"
          index={4}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">🔥 Real-time Fire Hotspot Detection</h3>
              <p className="mb-4">Advanced thermal imaging analysis provides real-time detection and monitoring of forest fire hotspots across Indonesia vast landscapes.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">🌡️ Weather-based Fire Risk Prediction</h3>
              <p className="mb-4">Hyperparameter-tuned ML models analyze meteorological data to predict fire risks with unprecedented accuracy, enabling proactive prevention measures.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">🗺️ Interactive Geospatial Mapping</h3>
              <p className="mb-4">OpenStreetMap integration provides responsive geospatial mapping capabilities with real-time fire risk visualization and historical data overlay.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">📊 Historical Fire Pattern Analysis</h3>
              <p className="mb-4">Comprehensive trend analysis of historical fire patterns enables predictive modeling and early warning system development for stakeholders.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">⚠️ Automated Early Warning Alert System</h3>
              <p className="mb-4">Smart alert system delivers automated notifications to authorities and stakeholders based on real-time risk assessments and predictive analytics.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">📱 Responsive Web Dashboard</h3>
              <p className="mb-4">Intuitive dashboard provides stakeholders and authorities with comprehensive fire monitoring tools, real-time insights, and decision support capabilities.</p>
            </>
          }
        />
          </div>

          {/* Footer */}
          <footer
            ref={footerRef}
            className="w-full py-6 text-center text-white/80 text-sm bg-black mt-8 border-t border-white/10"
          >
            {currentYear} © Flame Prophet. All rights reserved.
          </footer>
        </>
      )}
    </div>
  );
}
