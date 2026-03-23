"use client";

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from 'lucide-react';

interface QuizProcessingScreenProps {
  stage: 'analyzing' | 'calculating';
  isFullScreen?: boolean;
}

export function QuizProcessingScreen({ stage, isFullScreen = false }: QuizProcessingScreenProps) {
  const getStageContent = () => {
    switch (stage) {
      case 'analyzing':
        return {
          icon: '🤔',
          title: 'Analyzing Your Profile',
          subtitle: 'Reviewing your financial information...',
          details: [
            'Processing income and employment details',
            'Evaluating credit profile',
            'Analyzing existing financial commitments'
          ]
        };
      case 'calculating':
        return {
          icon: '💰',
          title: 'Calculating Best Options',
          subtitle: 'Finding personalized loan offers...',
          details: [
            'Comparing interest rates across lenders',
            'Calculating optimal loan terms',
            'Generating personalized recommendations'
          ]
        };
      default:
        return {
          icon: '⏳',
          title: 'Processing',
          subtitle: 'Please wait...',
          details: []
        };
    }
  };

  const content = getStageContent();
  // Freeze header title/subtitle on first render to prevent text changes between stages
  const staticHeaderRef = useRef<{ title: string; subtitle: string } | null>(null);
  if (!staticHeaderRef.current) {
    staticHeaderRef.current = { title: content.title, subtitle: content.subtitle };
  }
  const totalRows = content.details.length;
  const [completedCount, setCompletedCount] = useState(0);

  // Reset on analyzing; when calculating, flip rows to completed sequentially
  useEffect(() => {
    const timers: Array<number> = [];
    if (stage === 'analyzing') {
      setCompletedCount(0);
      return () => {
        timers.forEach((t) => window.clearTimeout(t));
      };
    }
    if (stage === 'calculating') {
      setCompletedCount(0);
      // Ensure the calculation phase lasts at least 3000ms in total
      const minTotalMs = 3000;
      const stepMs = totalRows > 0 ? Math.ceil(minTotalMs / totalRows) : minTotalMs;
      for (let i = 0; i < totalRows; i++) {
        const t = window.setTimeout(() => {
          setCompletedCount((c) => Math.min(c + 1, totalRows));
        }, stepMs * (i + 1));
        timers.push(t);
      }
      return () => {
        timers.forEach((t) => window.clearTimeout(t));
      };
    }
  }, [stage, totalRows]);

  return (
    <div className={cn("processing-screen", isFullScreen && "full-screen")}>
      <div className="processing-container bg-black/90 border border-white/10 rounded-[28px] p-8 text-white min-h-[400px] flex flex-col justify-center items-center text-center backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">

        {/* Main Title */}
        <h2 className="text-2xl font-bold mb-3">
          {staticHeaderRef.current.title}
        </h2>

        {/* Subtitle */}
        <p className="text-white/70 text-lg mb-6">
          {staticHeaderRef.current.subtitle}
        </p>

        {/* Processing rows only (no global progress) */}
        {totalRows > 0 && (
          <div className="processing-details max-w-md">
            <ul className="space-y-2 text-white/70 text-sm">
              {content.details.map((detail, index) => {
                const done = index < completedCount;
                return (
                  <motion.li
                    key={index}
                    className="flex items-center justify-center"
                    initial={{ opacity: 0.85, scale: 0.98 }}
                    animate={{ opacity: done ? 1 : 0.85, scale: done ? 1 : 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {done ? (
                      <CheckCircle2 className="mr-3 h-4 w-4 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
                    ) : (
                      <Loader2 className="mr-3 h-4 w-4 text-white/60 animate-spin" />
                    )}
                    <span className={done ? "text-white" : "text-white/70"}>{detail}</span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Patient Message */}
        <p className="text-white/60 text-sm mt-6">
          This will only take a moment...
        </p>
      </div>
    </div>
  );
}