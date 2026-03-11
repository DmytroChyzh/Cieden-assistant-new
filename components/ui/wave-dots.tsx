"use client";

import { useEffect, useRef } from "react";

interface WaveDotsProps {
  className?: string;
}

export function WaveDots({ className }: WaveDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const cols = 100;
    const rows = 60;
    const gridSpacing = 12;

    const fov = 300;
    const cameraHeight = 180;
    const tiltAngle = 0.75;

    const cosT = Math.cos(tiltAngle);
    const sinT = Math.sin(tiltAngle);

    const animate = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);

      timeRef.current += 0.006;
      const t = timeRef.current;

      const mouse = mouseRef.current;

      const originX = w * 0.85;
      const originY = h * 0.95;

      for (let row = rows - 1; row >= 0; row--) {
        for (let col = 0; col < cols; col++) {
          const gx = (col - cols * 0.5) * gridSpacing;
          const gz = row * gridSpacing + 20;

          const wave1 = Math.sin(gx * 0.015 + t * 1.5) * 25;
          const wave2 = Math.cos(gz * 0.012 + t * 0.9) * 20;
          const wave3 = Math.sin((gx + gz) * 0.01 + t * 0.7) * 15;
          const wave4 = Math.cos(gx * 0.025 - t * 1.1) * Math.sin(gz * 0.02 + t * 0.5) * 18;

          const gy = wave1 + wave2 + wave3 + wave4;

          const ry = gy * cosT - gz * sinT;
          const rz = gy * sinT + gz * cosT;

          const eyeZ = rz + fov;
          if (eyeZ <= 10) continue;

          const scale = fov / eyeZ;
          const sx = originX + gx * scale;
          const sy = originY + (ry - cameraHeight) * scale;

          if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;

          const dx = mouse.x - sx;
          const dy = mouse.y - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mouseRadius = 120;

          let fx = sx;
          let fy = sy;

          if (dist < mouseRadius) {
            const force = (1 - dist / mouseRadius) * 20;
            fx -= (dx / dist) * force;
            fy -= (dy / dist) * force;
          }

          const depthFade = Math.max(0, Math.min(1, 1 - rz / (rows * gridSpacing * 0.8)));
          const edgeFade = Math.max(0, 1 - Math.abs(gx) / (cols * gridSpacing * 0.55));
          const opacity = depthFade * edgeFade * 0.7;

          if (opacity < 0.02) continue;

          const dotSize = Math.max(0.4, scale * 1.5);

          const bri = 140 + depthFade * 60;
          const r = bri * 0.55 + Math.sin(t + col * 0.03) * 15;
          const g = bri * 0.5;
          const b = bri * 0.95 + depthFade * 40;

          ctx.beginPath();
          ctx.arc(fx, fy, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${opacity})`;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
