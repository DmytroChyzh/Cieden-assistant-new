"use client";

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface WaveformVisualizerProps {
  data: number[];
  isActive: boolean;
}

export function WaveformVisualizer({ data, isActive }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      if (!isActive) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const centerY = height / 2;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const barWidth = width / data.length;
      
      data.forEach((value, index) => {
        const x = index * barWidth;
        const barHeight = (value / 255) * height * 0.8;
        
        ctx.moveTo(x, centerY - barHeight / 2);
        ctx.lineTo(x, centerY + barHeight / 2);
      });

      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isActive) {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, isActive]);

  // Fallback to CSS animation if no data and active
  if ((!data || data.length === 0) && isActive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-white/20 rounded-full"
            animate={{
              height: [4, 20, 4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.5 }}
    />
  );
}