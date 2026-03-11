"use client";

import { WaveDots } from "@/components/ui/wave-dots";

export default function LuminaGradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {/* Base dark navy background */}
      <div className="absolute inset-0 bg-[#0a0a14]" />

      {/* Purple glow — upper center-right */}
      <div className="absolute -top-20 right-1/4 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(120,50,180,0.25),transparent_65%)] blur-3xl" />

      {/* Blue glow — left edge */}
      <div className="absolute top-1/3 -left-20 h-[500px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(30,80,220,0.2),transparent_65%)] blur-3xl" />

      {/* Subtle deep blue ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,20,60,0.4),transparent_70%)]" />
    </div>
  );
}
