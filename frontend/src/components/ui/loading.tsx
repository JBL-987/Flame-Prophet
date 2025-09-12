import React from "react";

interface LoadingProps {
  isVisible: boolean;
  message?: string;
  withBackdrop?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  isVisible,
  message = "Loading...",
  withBackdrop = true
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        zIndex: 9999 // Very high z-index to be above everything
      }}
    >
      {/* Black backdrop */}
      {withBackdrop && (
        <div className="absolute inset-0 bg-black bg-opacity-80"></div>
      )}

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center bg-black bg-opacity-90 rounded-lg p-8 max-w-sm mx-4">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>

        {/* Message */}
        <p className="text-white text-center font-medium">
          {message}
        </p>

        {/* Subtle pulse effect */}
        <div className="mt-4 text-orange-400 text-sm opacity-75 animate-pulse">
          Please wait...
        </div>
      </div>
    </div>
  );
};

export default Loading;
