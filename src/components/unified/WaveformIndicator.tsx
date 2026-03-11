"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformIndicatorProps {
  isActive: boolean;
  isVisible?: boolean; // Controls visibility without affecting layout
  audioLevel?: number; // 0-1 scale
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  side: 'left' | 'right';
  className?: string;
}

export function WaveformIndicator({
  isActive,
  isVisible = true,
  audioLevel = 0.5,
  quality = 'good',
  side
}: WaveformIndicatorProps) {
  // Quality color mapping
  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-400';
      case 'good':
        return 'bg-white';
      case 'fair':
        return 'bg-yellow-400';
      case 'poor':
        return 'bg-orange-400';
      default:
        return 'bg-white/50';
    }
  };

  const qualityColor = getQualityColor();

  // Generate modern waveform bars with fixed height and responsive scaleY animation
  const generateBars = () => {
    const barCount = 8;
    const baseHeights = [0.4, 0.7, 0.5, 0.9, 1.0, 0.8, 0.6, 0.3];
    
    return Array.from({ length: barCount }, (_, index) => {
      const baseHeight = baseHeights[index] || 0.5;
      // Create oscillating animation values based on audio level and base height
      const minScale = 0.2;
      const maxScale = isActive ? Math.max(0.4, audioLevel * baseHeight * 1.2) : 0.3;
      
      return (
        <motion.div
          key={index}
          className={cn(
            "w-1 rounded-full shadow-sm",
            qualityColor,
            isActive && "shadow-white/20"
          )}
          style={{
            height: '24px', // Fixed height
            transformOrigin: 'center',
          }}
          animate={{
            opacity: isActive ? 0.9 : 0.3,
            scaleY: isActive ? [minScale, maxScale, minScale] : 0.2,
          }}
          transition={{
            opacity: { duration: 0.3 },
            scaleY: {
              duration: 0.6 + index * 0.1,
              repeat: isActive ? Infinity : 0,
              repeatType: "reverse",
              ease: "easeInOut",
            }
          }}
        />
      );
    });
  };

  return (
    <div className={cn(
      "flex items-center gap-0.5 px-3 py-1 transition-all duration-300",
      "rounded-full backdrop-blur-sm overflow-hidden",
      "h-8 min-h-8 max-h-8", // Fixed height container
      side === 'left' ? 'justify-start' : 'justify-end',
      !isVisible && 'opacity-0 scale-95',
      isVisible && !isActive && 'opacity-40 scale-95',
      isVisible && isActive && 'opacity-100 scale-100 bg-white/5'
    )}>
      {side === 'left' && (
        <div className="w-2 h-2 rounded-full bg-blue-400 mr-1 opacity-60" />
      )}
      {generateBars()}
      {side === 'right' && (
        <div className="w-2 h-2 rounded-full bg-green-400 ml-1 opacity-60" />
      )}
    </div>
  );
}