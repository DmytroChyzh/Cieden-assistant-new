"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceDisplayProps {
  balance: number;
  previousBalance?: number;
  currency?: string;
  className?: string;
}

export function BalanceDisplay({
  balance,
  previousBalance,
  currency = "USD",
  className
}: BalanceDisplayProps) {
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

  // Create floating orbs animation
  const orbVariants = {
    float: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.8 
      }}
      className={cn("w-full max-w-sm mx-auto relative", className)}
    >
      {/* Main Balance Container */}
      <div className="relative overflow-hidden rounded-[36px] bg-black/90 backdrop-blur-2xl border border-white/10 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
        
        {/* Floating Background Orbs */}
        <motion.div
          variants={orbVariants}
          animate="float"
          className="absolute top-4 right-4 w-16 h-16 bg-emerald-400/10 rounded-full blur-xl"
        />
        <motion.div
          variants={orbVariants}
          animate="float"
          style={{ animationDelay: "1s" }}
          className="absolute bottom-4 left-4 w-12 h-12 bg-blue-400/10 rounded-full blur-lg"
        />
        
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br opacity-30"
          animate={{
            background: [
              "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(147, 51, 234, 0.1) 100%)",
              "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(59, 130, 246, 0.1) 100%)",
              "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)"
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Header with Icon */}
        <div className="relative flex items-center gap-3 mb-6">
          <motion.div 
            className="p-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Wallet className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-medium text-sm">Account Balance</h3>
            <p className="text-gray-400 text-xs">Available Funds</p>
          </div>
          
          {/* Sparkles Animation */}
          <motion.div
            className="ml-auto"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-4 w-4 text-purple-400/60" />
          </motion.div>
        </div>

        {/* Main Balance Display */}
        <motion.div
          variants={pulseVariants}
          animate="pulse"
          className="relative text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="text-4xl font-bold text-white mb-1 tracking-tight"
          >
            {formatBalance(balance)}
          </motion.div>
          <div className="text-gray-400 text-sm">Current Balance</div>
        </motion.div>

        {/* Change Indicator */}
        {previousBalance && change !== 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm",
              isPositiveChange 
                ? "bg-green-500/15 border border-green-500/30" 
                : "bg-red-500/15 border border-red-500/30"
            )}
          >
            {isPositiveChange ? (
              <TrendingUp className="h-4 w-4 text-green-300" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-300" />
            )}
            <span className={cn(
              "text-sm font-medium text-white",
              isPositiveChange ? "text-green-100" : "text-red-200"
            )}>
              {isPositiveChange ? "+" : ""}{Math.abs(changePercentage).toFixed(1)}%
            </span>
            <span className="text-gray-300 text-xs">
              ({isPositiveChange ? "+" : ""}{formatChange(change)})
            </span>
          </motion.div>
        )}

        {/* Bottom Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-center"
        >
          <div className="text-gray-400 text-xs">
            {previousBalance && change !== 0 
              ? `${isPositiveChange ? "Increased" : "Decreased"} from last update`
              : "Real-time balance overview"
            }
          </div>
        </motion.div>

        {/* Animated Border Glow */}
        <motion.div
          className="absolute inset-0 rounded-[36px]"
          animate={{
            boxShadow: [
              "0 0 20px rgba(16, 185, 129, 0.2)",
              "0 0 30px rgba(59, 130, 246, 0.2)",
              "0 0 20px rgba(147, 51, 234, 0.2)",
              "0 0 20px rgba(16, 185, 129, 0.2)"
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Success Pulse Animation */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ delay: 0.2, duration: 1 }}
        className="absolute inset-0 bg-emerald-400/20 rounded-2xl"
      />
    </motion.div>
  );
}