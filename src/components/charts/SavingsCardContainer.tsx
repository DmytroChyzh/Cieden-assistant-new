"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";

export type SavingsCardAccent = "goal" | "insights" | "tips" | "history" | "quiz";

const accentBackgrounds: Record<SavingsCardAccent, string> = {
  goal: "bg-gradient-to-br from-[#0B1C22] via-[#0C252C] to-[#0D2F35]",
  insights: "bg-gradient-to-br from-[#10182C] via-[#142138] to-[#182B44]",
  tips: "bg-gradient-to-br from-[#08251F] via-[#0D2E26] to-[#12382D]",
  history: "bg-gradient-to-br from-[#091B2A] via-[#0E2535] to-[#123041]",
  // Quiz accent: cool, slightly bluish indigo gradient to align with Balance/Savings visual language
  quiz: "bg-gradient-to-br from-[#0E1628] via-[#121E32] to-[#172740]",
};

const accentOverlays: Record<SavingsCardAccent, string> = {
  goal: "bg-gradient-to-br from-emerald-300/18 via-emerald-500/10 to-transparent",
  insights: "bg-gradient-to-br from-indigo-300/18 via-purple-400/10 to-transparent",
  tips: "bg-gradient-to-br from-teal-300/18 via-emerald-400/10 to-transparent",
  history: "bg-gradient-to-br from-sky-300/18 via-cyan-400/10 to-transparent",
  // Quiz accent overlay: indigo → purple with a hint of sky for lively interactive feel
  quiz: "bg-gradient-to-br from-indigo-300/18 via-purple-400/12 to-transparent",
};

interface SavingsCardContainerProps extends PropsWithChildren {
  accent: SavingsCardAccent;
  className?: string;
  contentClassName?: string;
  isExpanded?: boolean;
  layoutId?: string;
  onCollapse?: () => void;
  hideCloseButton?: boolean;
}

export function SavingsCardContainer({
  accent,
  children,
  className,
  contentClassName,
  isExpanded = false,
  layoutId,
  onCollapse,
  hideCloseButton = false,
}: SavingsCardContainerProps) {
  return (
    <motion.div
      layoutId={layoutId}
      layoutRoot={false}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 32 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/15 text-white shadow-[0_28px_70px_-30px_rgba(7,26,45,0.35)] backdrop-blur-xl will-change-transform",
        accentBackgrounds[accent],
        "p-6",
        "pointer-events-auto",
        className,
      )}
    >
      <div className="absolute inset-0 bg-teal-50/[0.04] mix-blend-soft-light" />
      <div className={cn("absolute inset-0", accentOverlays[accent])} />
      {isExpanded && onCollapse && !hideCloseButton ? (
        <Button
          onClick={onCollapse}
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 z-20 h-8 w-8 rounded-full border border-white/10 bg-white/10 text-white/80 backdrop-blur-xl hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      <div className={cn("relative z-10 flex h-full flex-col", contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

