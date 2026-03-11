"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { SavingsCardContainer } from "./SavingsCardContainer";

interface SavingsInsightsCardProps {
  insights?: Array<{
    type: "tip" | "trend" | "milestone";
    content: string;
    priority: number;
  }> | null;
  history?: Array<{
    month: string;
    amount: number;
    percentChange: number;
  }> | null;
  onUserAction?: ((text: string) => void) | null;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  layoutId?: string;
}

const SavingsInsightsCardComponent = ({
  insights,
  history,
  onUserAction,
  isExpanded = false,
  onExpand,
  onCollapse,
  layoutId = "savings-insights-card"
}: SavingsInsightsCardProps) => {
  // Calculate trend from history
  const trend = history && history.length > 1
    ? history[history.length - 1].percentChange > 0 ? 'up' : 'down'
    : 'stable';
  
  const averageChange = history
    ? history.reduce((sum, h) => sum + h.percentChange, 0) / history.length
    : 0;
  
  const trendIcon = trend === 'up' 
    ? <TrendingUp className="h-5 w-5 text-emerald-400" />
    : trend === 'down'
    ? <TrendingDown className="h-5 w-5 text-red-400" />
    : <Activity className="h-5 w-5 text-amber-400" />;
  
  const renderBarChart = () => (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-end justify-between gap-2">
        {history?.slice(-6).map((month, index) => (
          <motion.div
            key={month.month}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(Math.abs(month.percentChange) * 1.6, 8)}px` }}
            transition={{ delay: index * 0.06 }}
            className={cn(
              "w-6 rounded-t-md",
              month.percentChange >= 0
                ? "bg-gradient-to-t from-emerald-400/30 via-emerald-300 to-emerald-200"
                : "bg-gradient-to-t from-rose-400/30 via-rose-300 to-rose-200"
            )}
            title={`${month.percentChange}%`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
        <span>Last 6 months</span>
        <span>Volatility snapshot</span>
      </div>
    </div>
  );

  return (
    <SavingsCardContainer
      accent="insights"
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
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
          >
            {trendIcon}
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Savings Insights</h3>
            <p className="text-xs text-white/60">Performance Analysis</p>
          </div>
        </div>

        {!isExpanded && (
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
            {insights?.length || 0} insights
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-3xl font-semibold text-white">
          {averageChange > 0 ? "+" : ""}{averageChange.toFixed(1)}%
        </div>
        <p className="mt-1 text-xs text-white/60">Average monthly change</p>
      </div>

      {isExpanded ? (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="grid gap-3">
            {(insights?.slice(0, 6) ?? []).map((insight, index) => (
              <motion.div
                key={`${insight.content}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"
              >
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span className="uppercase tracking-[0.18em]">{insight.type}</span>
                  <span className="flex items-center gap-1 text-white/60">
                    Priority
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80">{insight.priority}</span>
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  {insight.content}
                </p>
              </motion.div>
            ))}
          </div>

          {history && history.length > 0 ? renderBarChart() : null}

          <div className="rounded-2xl border border-white/10 bg-indigo-500/15 p-4 text-sm text-white/80">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
              <Sparkles className="h-3 w-3 text-white/60" />
              Insight Summary
            </div>
            <p className="mt-3 leading-6">
              Your savings velocity is {averageChange.toFixed(1)}% on average. Focus on top-ranked tips
              to sustain growth in the next quarter.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {(insights?.slice(0, 3) ?? []).map((insight, index) => (
              <motion.button
                key={`${insight.content}-${index}`}
                type="button"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (onUserAction) {
                    onUserAction(`User read insight: ${insight.content}`);
                  }
                }}
              >
                {insight.content}
              </motion.button>
            ))}
          </div>

          {history && history.length > 0 ? renderBarChart() : null}

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (onUserAction) {
                onUserAction("User opened detailed savings insights");
              }
              onExpand?.();
            }}
            className="mt-auto w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
          >
            View detailed insights
          </Button>
        </>
      )}
    </SavingsCardContainer>
  );
};

// Export memoized component for performance optimization
export const SavingsInsightsCard = memo(SavingsInsightsCardComponent);