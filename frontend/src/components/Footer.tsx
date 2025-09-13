"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white px-6 py-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="text-sm text-gray-400">
          © {currentYear} Flame Prophet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
