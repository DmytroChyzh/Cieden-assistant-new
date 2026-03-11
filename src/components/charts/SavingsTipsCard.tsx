"use client";

import { motion } from "framer-motion";
import { Lightbulb, Sparkles, CheckCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memo } from "react";
import { SavingsCardContainer } from "./SavingsCardContainer";

interface SavingsTipsCardProps {
  tips?: Array<{
    type: "tip" | "trend" | "milestone";
    content: string;
    priority: number;
  }> | null;
  onUserAction?: ((text: string) => void) | null;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  layoutId?: string;
}

const SavingsTipsCardComponent = ({
  tips,
  onUserAction,
  isExpanded = false,
  onExpand,
  onCollapse,
  layoutId = "savings-tips-card"
}: SavingsTipsCardProps) => {
  const handleTipClick = (tip: string, index: number) => {
    if (onUserAction) {
      onUserAction(`User interacted with savings tip ${index + 1}: ${tip}`);
    }
  };
  
  // Default tips if none provided
  const displayTips = tips && tips.length > 0 ? tips : [
    { content: "Set up automatic transfers on payday", priority: 5 },
    { content: "Review and cancel unused subscriptions", priority: 4 },
    { content: "Try the 52-week savings challenge", priority: 3 }
  ];
  
  return (
    <SavingsCardContainer
      accent="tips"
      isExpanded={isExpanded}
      onCollapse={onCollapse}
      layoutId={layoutId}
      className="w-full"
      contentClassName="gap-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/10 p-3"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Lightbulb className="h-5 w-5 text-emerald-200" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Smart Tips</h3>
            <p className="text-xs text-white/60">Personalized Advice</p>
          </div>
        </div>
        {!isExpanded && (
          <Sparkles className="h-4 w-4 text-white/60" />
        )}
      </div>

      {isExpanded ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid gap-3">
            {displayTips.map((tip, index) => (
              <motion.div
                key={`${tip.content}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 flex-none text-emerald-300" />
                  <p className="text-sm leading-relaxed text-white/85">
                    {tip.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-emerald-500/15 p-4 text-sm text-white/80">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
              <ListChecks className="h-4 w-4 text-white/60" />
              Recommended Next Steps
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li>Automate transfers the day you get paid.</li>
              <li>Set aside discretionary spending limits each week.</li>
              <li>Schedule a quarterly subscription audit.</li>
            </ul>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (onUserAction) {
                onUserAction("User requested additional savings guidance");
              }
            }}
            className="mt-auto w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
          >
            Share with my coach
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayTips.slice(0, 4).map((tip, index) => (
              <motion.button
                key={`${tip.content}-${index}`}
                type="button"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleTipClick(tip.content, index)}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>{tip.content}</span>
                </div>
              </motion.button>
            ))}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (onUserAction) {
                onUserAction("User requested more savings tips");
              }
              onExpand?.();
            }}
            className="mt-auto w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
          >
            Get More Tips
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </>
      )}
    </SavingsCardContainer>
  );
};

// Export memoized component for performance optimization
export const SavingsTipsCard = memo(SavingsTipsCardComponent);