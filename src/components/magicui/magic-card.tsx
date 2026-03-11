"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // Optional visual props used by callers; accepted for type-compatibility
  gradientColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  style,
}: MagicCardProps) {
  return (
    <div
      className={cn("relative rounded-[inherit]", className)}
      style={style}
    >
      <div className="relative bg-transparent">{children}</div>
    </div>
  );
}
