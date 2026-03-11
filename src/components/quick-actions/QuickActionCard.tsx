"use client";

import React from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { MagicCard } from '@/src/components/magicui/magic-card';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  title: string;
  subtitle?: string;
  onClick: () => void;
  className?: string;
  value?: string | number;
  trend?: number;
  trendLabel?: string;
}

export function QuickActionCard({
  title,
  onClick,
  className,
}: QuickActionCardProps) {
  return (
    <MagicCard 
      className={cn(
        "cursor-pointer w-full",
        className
      )}
    >
      <div 
        onClick={onClick}
        className="flex flex-col gap-4 px-4 py-4 rounded-2xl"
        style={{
          background: 'rgba(7, 7, 7, 0.10)',
          border: '1px solid',
          borderImage: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6) 1',
          backdropFilter: 'blur(5px)'
        }}
      >
        {/* Only show the top label (title) as requested */}
        <div className="flex flex-col">
          <h3
            style={{
              color: '#FFF',
              textAlign: 'left',
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal',
              letterSpacing: '-0.32px',
            }}
          >
            {title}
          </h3>
        </div>
         
      </div>
    </MagicCard>
  );
}
