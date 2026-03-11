"use client";

import { motion } from "framer-motion";
import { Calendar, ArrowUpRight, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { SavingsCardContainer } from "./SavingsCardContainer";

interface SavingsHistoryPreviewProps {
  history?: Array<{
    month: string;
    amount: number;
    percentChange: number;
  }> | null;
  onExpand?: () => void;
  onUserAction?: ((text: string) => void) | null;
  isExpanded?: boolean;
  onCollapse?: () => void;
  layoutId?: string;
}

const SavingsHistoryPreviewComponent = ({
  history,
  onExpand,
  onUserAction,
  isExpanded = false,
  onCollapse,
  layoutId = "savings-history-card"
}: SavingsHistoryPreviewProps) => {
  const formatMonth = (monthStr: string) => {
    const [, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1] || month;
  };
  
  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };
  
  const handleViewFullHistory = () => {
    if (onUserAction) {
      onUserAction("User clicked to view full savings history");
    }
    if (onExpand) {
      onExpand();
    }
  };
  
  // Default history if none provided
  const displayHistory = history && history.length > 0 ? history : [
    { month: "2024-10", amount: 1100, percentChange: 2 },
    { month: "2024-11", amount: 1350, percentChange: 23 },
    { month: "2024-12", amount: 1500, percentChange: 11 }
  ];
  
  return (
    <SavingsCardContainer
      accent="history"
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
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <Calendar className="h-5 w-5 text-sky-200" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Savings History</h3>
            <p className="text-xs text-white/60">
              {isExpanded ? "Detailed breakdown" : "Last 3 months snapshot"}
            </p>
          </div>
        </div>

        {!isExpanded && (
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
            6 months
          </span>
        )}
      </div>

      {isExpanded ? (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="grid gap-3 pr-1 md:grid-cols-2">
            {history?.map((item, index) => (
              <motion.div
                key={item.month}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{formatMonth(item.month)}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      item.percentChange >= 0 ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {item.percentChange >= 0 ? "+" : ""}
                    {item.percentChange}%
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-lg font-semibold text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                    <DollarSign className="h-4 w-4 text-white/80" />
                  </div>
                  {formatAmount(item.amount)}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Cumulative saved</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatAmount(displayHistory.reduce((sum, entry) => sum + entry.amount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Best performing month</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatMonth(displayHistory.reduce((best, entry) => entry.percentChange > best.percentChange ? entry : best, displayHistory[0]).month)}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (onUserAction) {
                onUserAction("User exported savings history as CSV");
              }
            }}
            className="mt-auto w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
          >
            Export history
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayHistory.slice(-3).map((item, index) => (
              <motion.div
                key={item.month}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/10 p-2">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatMonth(item.month)}
                      </div>
                      <div className="text-xs text-white/60">{formatAmount(item.amount)}</div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.percentChange >= 0 ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {item.percentChange >= 0 ? "+" : ""}
                    {item.percentChange}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleViewFullHistory}
            className="mt-auto w-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white"
          >
            View full 6-month history
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      )}
    </SavingsCardContainer>
  );
};

// Export memoized component for performance optimization
export const SavingsHistoryPreview = memo(SavingsHistoryPreviewComponent);