"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  previousBalance?: number;
  currency?: string;
  compact?: boolean;
  className?: string;
  onUserAction?: ((text: string) => void) | null;
}

export function BalanceCard({
  balance,
  previousBalance,
  currency = "USD",
  compact = false,
  className,
  onUserAction
}: BalanceCardProps) {
  // Calculate change from previous balance
  const change = previousBalance ? balance - previousBalance : 0;
  const changePercentage = previousBalance && previousBalance > 0 
    ? (change / previousBalance) * 100 
    : 0;
  
  const isPositiveChange = change >= 0;
  
  // Format balance with appropriate decimal places
  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format change amount
  const formatChange = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };


  // Calculate radial chart data - use balance as percentage of a target (like 100k for visualization)
  const targetBalance = Math.max(balance * 1.2, 100000); // Show balance as 80% of target for nice visual
  const balancePercentage = Math.min((balance / targetBalance) * 100, 100);
  
  const chartData = [
    { 
      name: "balance", 
      value: balance,
      fill: "var(--color-balance)"
    },
  ];

  const chartConfig = {
    value: {
      label: "Balance",
    },
    balance: {
      label: "Current Balance",
      color: "#a78bfa", // Light purple for the progress bar
    },
  } satisfies ChartConfig;

  // Send contextual update when balance changes significantly
  useEffect(() => {
    if (onUserAction && previousBalance && Math.abs(changePercentage) > 10) {
      const formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(balance);
      const contextMessage = `Balance alert: Significant ${isPositiveChange ? 'increase' : 'decrease'} detected. Balance changed by ${Math.abs(changePercentage).toFixed(1)}% to ${formattedBalance}`;
      onUserAction(contextMessage);
      console.log('💰 Balance change sent to agent:', contextMessage);
    }
  }, [balance, previousBalance, changePercentage, isPositiveChange, onUserAction, currency]);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.6 
        }}
        className={className}
      >
        <Card className="bg-black/90 border border-white/10 rounded-[32px] backdrop-blur-xl shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1 font-medium">Current Balance</p>
                <p className="text-xl font-bold text-white">
                  {formatBalance(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.8,
      }}
      className={cn("max-w-md w-full mx-auto", className)}
    >
      <Card className="flex flex-col relative overflow-hidden bg-black/90 border border-white/10 rounded-[40px] backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.02] pointer-events-none" />
        
        {/* Subtle animated shimmer */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)",
            backgroundSize: "200% 200%"
          }}
          animate={{
            backgroundPosition: ["200% 0%", "-200% 0%"]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <CardHeader className="relative items-center pb-2 pt-6">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Wallet className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-white font-semibold text-lg">Account Balance</CardTitle>
              <CardDescription className="text-gray-400 text-sm">Current Available Funds</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-0">
          <div className="relative mx-auto aspect-square max-h-[250px] flex items-center justify-center">
            {/* Custom circular progress */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="12"
                fill="none"
              />
              {/* Progress circle */}
              <motion.circle
                cx="100"
                cy="100"
                r="85"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 85}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - balancePercentage / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#e9d5ff" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <div className="text-3xl font-bold text-white mb-1">
                  {formatBalance(balance).length > 10 
                    ? formatBalance(balance).replace(/,/g, '').length > 12
                      ? `${(balance / 1000).toFixed(0)}K`
                      : formatBalance(balance)
                    : formatBalance(balance)
                  }
                </div>
                <div className="text-gray-400 text-sm font-medium">
                  Available
                </div>
              </motion.div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative flex-col gap-3 text-sm pt-2 pb-6">
          {previousBalance && change !== 0 && (
            <motion.div 
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-xs",
                isPositiveChange 
                  ? "bg-green-500/15 text-green-200 border border-green-400/30" 
                  : "bg-red-500/15 text-red-200 border border-red-400/30"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TrendingUp className={cn(
                "h-3 w-3", 
                !isPositiveChange && "rotate-180"
              )} />
              {isPositiveChange ? "+" : ""}{Math.abs(changePercentage).toFixed(1)}%
              <span className="opacity-70">•</span>
              {formatChange(change)}
            </motion.div>
          )}
          <div className="text-gray-400/70 leading-none text-center text-xs font-medium">
            {previousBalance && change !== 0 
              ? "Compared to previous balance"
              : "Current account balance overview"
            }
          </div>
        </CardFooter>

      </Card>
    </motion.div>
  );
}