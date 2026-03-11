"use client";

import { motion } from "framer-motion";
import { Target, TrendingUp, ArrowRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo, useMemo, useCallback } from "react";
import { SavingsCardContainer } from "./SavingsCardContainer";

interface SavingsGoalCardProps {
  currentSavings: number;
  goalAmount: number;
  goalName?: string;
  currency?: string;
  deadline?: string;
  monthlyTarget?: number;
  className?: string;
  onUserAction?: ((text: string) => void) | null;
  onExpand?: () => void;
  onCollapse?: () => void;
  isExpanded?: boolean;
  layoutId?: string;
  history?: Array<{
    month: string;
    amount: number;
    percentChange: number;
  }>;
}

const SavingsGoalCardComponent = ({
  currentSavings,
  goalAmount,
  goalName = "Financial Goal",
  currency = "USD",
  deadline,
  monthlyTarget,
  className,
  onUserAction,
  onExpand,
  onCollapse,
  isExpanded = false,
  layoutId,
  history
}: SavingsGoalCardProps) => {
  // Debug logging to verify onUserAction prop - only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 SavingsGoalCard rendered with onUserAction:', !!onUserAction, typeof onUserAction);
  }
  
  // Calculate progress - memoized for performance
  const progress = useMemo(() => Math.min((currentSavings / goalAmount) * 100, 100), [currentSavings, goalAmount]);
  const remaining = useMemo(() => Math.max(goalAmount - currentSavings, 0), [goalAmount, currentSavings]);
  
  // Format currency - memoized to prevent recreation on every render
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency]);

  // Format large numbers with K notation
  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    if (numAmount >= 1000000) {
      return `${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(1)}K`;
    }
    return numAmount.toFixed(0);
  };

  // Handle button click with contextual update AND expansion
  const handleLearnMoreClick = () => {
    // Send contextual update to voice agent if available
    if (onUserAction) {
      const contextMessage = `User clicked 'Learn More About Your Goal' button for ${goalName}. Current progress: ${progress.toFixed(0)}% (${formatCurrency(currentSavings)} of ${formatCurrency(goalAmount)})`;
      onUserAction(contextMessage);
      console.log('🎯 Button click sent to agent:', contextMessage);
    }
    
    // Trigger expansion to show 6-month grid
    if (onExpand) {
      onExpand();
    }
  };

  // Format functions for expanded view
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const shortYear = year.slice(2);
    return `${monthNames[parseInt(month) - 1]} '${shortYear}`;
  };

  // Calculate statistics for expanded view
  const totalSaved = history ? history.reduce((sum, m) => sum + m.amount, 0) : 0;
  const averageSaved = history && history.length > 0 ? totalSaved / history.length : 0;
  const bestMonth = history && history.length > 0 
    ? history.reduce((best, current) => current.amount > best.amount ? current : best)
    : null;
  const positiveMonths = history ? history.filter(m => m.percentChange > 0).length : 0;

  return (
    <SavingsCardContainer
      accent="goal"
      isExpanded={isExpanded}
      layoutId={layoutId}
      onCollapse={onCollapse}
      className={cn(
        isExpanded ? "w-full max-w-xl" : "w-full max-w-sm mx-auto h-full",
        className
      )}
      contentClassName="gap-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/10 p-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <Target className="h-5 w-5 text-amber-200" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">
              {isExpanded ? "Savings Goal Overview" : goalName}
            </h3>
            <p className="text-xs text-white/60">
              {isExpanded ? goalName : "Savings Progress"}
            </p>
          </div>
        </div>

        {!isExpanded && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 18 }}
            className="text-right"
          >
            <div className="text-lg font-semibold text-white">
              {progress.toFixed(0)}%
            </div>
            <div className="text-xs text-white/60">Complete</div>
          </motion.div>
        )}
      </div>

      {isExpanded ? (
        <div className="flex h-full flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {history?.slice(-6).map((month, index) => (
              <motion.button
                key={month.month}
                type="button"
                className="group relative rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  if (onUserAction) {
                    onUserAction(`User tapped on ${formatMonth(month.month)} with ${formatCurrency(month.amount)} saved`);
                  }
                }}
              >
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>{formatMonth(month.month)}</span>
                  <span
                    className={cn(
                      "font-medium",
                      month.percentChange >= 0 ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {month.percentChange >= 0 ? "+" : ""}
                    {month.percentChange}%
                  </span>
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  {formatCurrency(month.amount)}
                </div>
                {bestMonth && month.month === bestMonth.month ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 right-2 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-950"
                  >
                    Best
                  </motion.span>
                ) : null}
              </motion.button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] text-white/55">
                <DollarSign className="h-3.5 w-3.5 text-amber-200" />
                Total Saved
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(totalSaved)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] text-white/55">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                Average / Month
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(Math.round(averageSaved))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex items-center justify-between text-[11px] text-white/55">
                <span>Positive Months</span>
                <span className="font-medium text-white">
                  {positiveMonths}/{history?.length || 0}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${history && history.length > 0 ? (positiveMonths / history.length) * 100 : 0}%` }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-6">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-3xl font-bold text-white"
            >
              {formatCurrency(currentSavings)}
            </motion.div>
            <p className="mt-1 text-sm text-white/60">
              of {formatCurrency(goalAmount)} goal
            </p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="flex items-center justify-center gap-1 text-xs text-white/60">
                <TrendingUp className="h-3 w-3 text-emerald-200" />
                Remaining
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatAmount(remaining)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Monthly</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {monthlyTarget ? formatAmount(monthlyTarget) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Deadline</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {deadline || "Open"}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-auto"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleLearnMoreClick}
              className="w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
            >
              View 6-Month History
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      )}
    </SavingsCardContainer>
  );
};

// Export memoized component for performance optimization
export const SavingsGoalCard = memo(SavingsGoalCardComponent);