"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SavingsHistoryGridProps {
  history: Array<{
    month: string;
    amount: number;
    percentChange: number;
  }>;
  goalName?: string;
  onClose: () => void;
  onUserAction?: ((text: string) => void) | null;
}

export function SavingsHistoryGrid({ 
  history, 
  goalName = "Financial Goal",
  onClose, 
  onUserAction 
}: SavingsHistoryGridProps) {
  
  useEffect(() => {
    if (onUserAction) {
      onUserAction(`User is viewing 6-month savings history grid for ${goalName}`);
    }
  }, [onUserAction, goalName]);
  
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const shortYear = year.slice(2);
    return `${monthNames[parseInt(month) - 1]} '${shortYear}`;
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Calculate statistics
  const totalSaved = history.reduce((sum, m) => sum + m.amount, 0);
  const averageSaved = history.length > 0 ? totalSaved / history.length : 0;
  const bestMonth = history.reduce((best, current) => 
    current.amount > best.amount ? current : best, 
    history[0] || { month: '', amount: 0, percentChange: 0 }
  );
  const positiveMonths = history.filter(m => m.percentChange > 0).length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full h-full max-w-full max-h-full flex flex-col bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl shadow-2xl overflow-hidden relative pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex justify-between items-center p-4 border-b border-black/10">
          <div>
            <h2 className="text-xl font-bold text-black">6-Month Savings History</h2>
            <p className="text-sm text-black/70 mt-1">{goalName}</p>
          </div>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="icon"
            className="text-black/60 hover:text-black hover:bg-black/10"
          >
            <X className="h-5 w-5 text-black" />
          </Button>
        </div>
        
        {/* Grid of months */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {history.map((month, index) => (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative bg-black/10 backdrop-blur-sm rounded-xl p-4 border border-black/20 hover:bg-black/15 transition-colors"
                onClick={() => {
                  if (onUserAction) {
                    onUserAction(`User tapped on ${formatMonth(month.month)} with ${formatAmount(month.amount)} saved`);
                  }
                }}
              >
                {/* Month Label */}
                <div className="text-xs text-black/60 mb-2">
                  {formatMonth(month.month)}
                </div>
                
                {/* Amount */}
                <div className="text-2xl font-bold text-black mb-2">
                  {formatAmount(month.amount)}
                </div>
                
                {/* Change Indicator */}
                <div className="flex items-center gap-1">
                  {month.percentChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    month.percentChange >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {month.percentChange >= 0 ? '+' : ''}{month.percentChange}%
                  </span>
                </div>
                
                {/* Best Month Badge */}
                {month.month === bestMonth.month && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                  >
                    Best
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Summary Statistics */}
        <div className="p-4 border-t border-black/10 bg-black/5 backdrop-blur-sm">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-black/70" />
                <span className="text-xs text-black/60">Total Saved</span>
              </div>
              <div className="text-xl font-bold text-black">
                {formatAmount(totalSaved)}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-black/70" />
                <span className="text-xs text-black/60">Average/Month</span>
              </div>
              <div className="text-xl font-bold text-black">
                {formatAmount(Math.round(averageSaved))}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-black/60">Positive Months</span>
              <span className="text-xs text-black font-medium">
                {positiveMonths}/{history.length}
              </span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(positiveMonths / history.length) * 100}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Invisible backdrop for closing */}
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose}
        style={{ pointerEvents: 'auto' }}
      />
    </motion.div>
  );
}