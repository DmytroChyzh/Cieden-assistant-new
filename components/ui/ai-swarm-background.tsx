"use client";

import { useState, useEffect, useRef } from "react";

export const Component = () => {
  const [particleCount] = useState(80);
  const [speed] = useState(0.5);
  const [connectionDistance] = useState(150);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  interface Particle {
    x: number;
    y: number;
    radius: number;
    color: string;
    vx: number;
    vy: number;
    opacity: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }

  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles
  useEffect(() => {
    const initParticles = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          color: '#8B5CF6',
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          opacity: Math.random() * 0.2 + 0.1
        });
      }
      
      particlesRef.current = particles;
    };
    
    initParticles();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, speed]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    resizeCanvas();
    
    const handleResize = () => {
      resizeCanvas();
      // Reposition particles proportionally when canvas is resized
      if (particlesRef.current.length > 0) {
        const oldWidth = particlesRef.current[0].canvasWidth || canvas.width;
        const oldHeight = particlesRef.current[0].canvasHeight || canvas.height;
        
        particlesRef.current.forEach(particle => {
          particle.x = (particle.x / oldWidth) * canvas.width;
          particle.y = (particle.y / oldHeight) * canvas.height;
          particle.canvasWidth = canvas.width;
          particle.canvasHeight = canvas.height;
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update particle positions
      particlesRef.current.forEach(particle => {
        // Move particles
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx = -particle.vx;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy = -particle.vy;
        }
        
        // Random motion adjustments
        if (Math.random() > 0.97) {
          particle.vx += (Math.random() - 0.5) * 0.2;
          particle.vy += (Math.random() - 0.5) * 0.2;
        }
        
        // Limit velocity
        const maxVelocity = 2 * speed;
        const vSquared = particle.vx * particle.vx + particle.vy * particle.vy;
        if (vSquared > maxVelocity * maxVelocity) {
          const ratio = maxVelocity / Math.sqrt(vSquared);
          particle.vx *= ratio;
          particle.vy *= ratio;
        }
        
        // Draw particles
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      
      // Draw connections
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.05)';
      ctx.lineWidth = 0.3;
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        const particle = particlesRef.current[i];
        
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const particle2 = particlesRef.current[j];
          const dx = particle.x - particle2.x;
          const dy = particle.y - particle2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionDistance) {
            // Calculate opacity based on distance - much more subtle
            ctx.globalAlpha = (1 - (distance / connectionDistance)) * 0.1;
            
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle2.x, particle2.y);
            ctx.stroke();
          }
        }
      }
      
      ctx.globalAlpha = 1;
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [speed, connectionDistance]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
};