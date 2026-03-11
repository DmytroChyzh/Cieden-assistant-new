"use client";

import { cn } from "@/lib/utils";

interface MobileFrameProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

export function MobileFrame({ children, className, scale = 0.85 }: MobileFrameProps) {
  return (
    <div className={cn("mx-auto", className)}>
      {/* Outer phone frame with shadow */}
      <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl shadow-purple-500/20">
        {/* Screen bezel */}
        <div className="relative bg-black rounded-[2.5rem] p-1">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-black h-8 w-36 rounded-b-3xl flex items-center justify-center">
              <div className="bg-gray-600 h-1.5 w-20 rounded-full"></div>
            </div>
          </div>
          
          {/* Side buttons */}
          <div className="absolute -left-1 top-20 bg-black h-12 w-1 rounded-l"></div>
          <div className="absolute -left-1 top-36 bg-black h-8 w-1 rounded-l"></div>
          <div className="absolute -left-1 top-48 bg-black h-8 w-1 rounded-l"></div>
          <div className="absolute -right-1 top-32 bg-black h-16 w-1 rounded-r"></div>
          
          {/* Screen content area */}
          <div className="bg-black rounded-[2rem] overflow-hidden relative" style={{ width: '300px', height: '600px' }}>
            {/* iPhone Status Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 text-white text-xs px-6 py-1 flex justify-between items-center" style={{ background: 'var(--Gradient-Dark, linear-gradient(170deg, var(--Background-Gradient-dark-Dark-blue, #262531) -9.44%, var(--Background-Gradient-dark-Black, #000) 100%))' }}>
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                  <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                </div>
                <svg className="w-6 h-3 ml-1" viewBox="0 0 24 12" fill="none">
                  <rect x="1" y="3" width="18" height="6" rx="2" stroke="white" strokeWidth="1" fill="none"/>
                  <rect x="20" y="5" width="2" height="2" rx="1" fill="white"/>
                  <rect x="2" y="4" width="14" height="4" rx="1" fill="white"/>
                </svg>
              </div>
            </div>
            
            <div 
              className="bg-white rounded-[2rem] overflow-hidden relative mt-6" 
              style={{ width: '300px', height: '594px' }}
            >
              <div 
                className="origin-top-left overflow-hidden" 
                style={{ 
                  transform: `scale(${scale})`,
                  width: `${Math.min(800, 300 / scale)}px`, 
                  height: `${594 / scale}px`,
                  transformOrigin: 'top left'
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}