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
                BINUS University Artificial Intelligence Course Project - Forest Fire Prediction System
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
          title="Project Overview"
          index={0}
          content={(
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">BINUS University AI Course Project</h3>
              <p className="mb-4">Flame Prophet is an educational project developed as part of the Artificial Intelligence course (COMP6853004) at BINUS University. This project demonstrates practical application of machine learning and data science concepts to solve real-world environmental challenges.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Learning Objectives</h3>
              <p className="mb-4">Through this project, students learn to integrate multiple data sources, implement machine learning algorithms, build full-stack web applications, and apply AI solutions to geospatial problems. The project covers data preprocessing, model training, API development, and user interface design.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Technical Implementation</h3>
              <p className="mb-4">The system demonstrates advanced machine learning techniques including LSTM neural networks for time series prediction, CNN models for image classification, and ensemble methods for improved accuracy. Students gain hands-on experience with Python, TensorFlow, React, and modern web development practices.</p>
            </>
          )}
        />

        <SectionCard
          id="data-source"
          title="Data Science & Machine Learning"
          index={1}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Data Integration and Preprocessing</h3>
              <p className="mb-4">The project demonstrates data integration from multiple sources including NASA POWER API for meteorological data and satellite imagery. Students learn data cleaning, feature engineering, normalization, and handling missing values - essential skills in real-world data science applications.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Machine Learning Implementation</h3>
              <p className="mb-4">Implementation of LSTM (Long Short-Term Memory) networks for time series forecasting and CNN (Convolutional Neural Networks) for image classification. The project covers model training, validation, hyperparameter tuning, and evaluation metrics commonly used in industry.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Geospatial Data Processing</h3>
              <p className="mb-4">Students work with geospatial data formats, coordinate systems, and mapping APIs. The project covers spatial analysis techniques, distance calculations, and visualization of geographical data using modern web mapping technologies.</p>
            </>
          }
        />

        <SectionCard
          id="architecture"
          title="System Architecture & Technologies"
          index={2}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Full-Stack Web Development</h3>
              <p className="mb-4">The project implements a complete full-stack application using Next.js (React) for the frontend and Flask (Python) for the backend API. Students learn modern web development practices including component-based architecture, RESTful API design, and responsive user interface development.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Backend Technologies</h3>
              <p className="mb-4">Built with Python Flask framework, the backend handles machine learning model inference, data processing, and API endpoints. The system demonstrates proper error handling, logging, and scalable API design patterns used in production applications.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Frontend Technologies</h3>
              <p className="mb-4">Modern React application with TypeScript for type safety, Tailwind CSS for styling, and integration with mapping libraries. The project covers state management, asynchronous data fetching, and building interactive user interfaces for data visualization.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Deployment & DevOps</h3>
              <p className="mb-4">Students learn containerization with Docker, environment configuration, and deployment strategies. The project demonstrates best practices for code organization, version control, and collaborative development workflows.</p>
            </>
          }
        />

        <SectionCard
          id="features"
          title="Learning Outcomes & Features"
          index={3}
          content={
            <>
              <h3 className="text-xl font-semibold mb-2 mt-4">Machine Learning Model Implementation</h3>
              <p className="mb-4">Students implement and deploy LSTM neural networks for time series forecasting and CNN models for satellite image classification, learning model training, validation, and deployment in production environments.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Full-Stack Application Development</h3>
              <p className="mb-4">Complete web application development covering frontend (React/TypeScript), backend (Python/Flask), database integration, and API design. Students learn modern development practices and deployment strategies.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Data Pipeline Engineering</h3>
              <p className="mb-4">Building end-to-end data pipelines from external APIs (NASA POWER) to machine learning models. Covers data ingestion, preprocessing, feature engineering, and real-time data processing.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Geospatial Data Analysis</h3>
              <p className="mb-4">Working with geographical data, coordinate systems, and mapping technologies. Students learn spatial analysis techniques and interactive map visualization for environmental monitoring.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Real-World Problem Solving</h3>
              <p className="mb-4">Applying AI and data science to solve environmental challenges. The project demonstrates how theoretical concepts are applied to create practical solutions for forest fire prevention and monitoring.</p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Collaborative Development</h3>
              <p className="mb-4">Team-based software development with version control, code review processes, and collaborative workflows. Students learn professional development practices used in industry.</p>
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
