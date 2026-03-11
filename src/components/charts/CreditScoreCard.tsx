"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Info, Shield, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CreditScoreCardProps {
  score: number;
  range?: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  factors?: Array<{
    name: string;
    impact: 'Positive' | 'Negative' | 'Neutral';
    description: string;
  }>;
  lastUpdated?: string;
  provider?: string;
  tips?: string[];
  className?: string;
  onUserAction?: ((text: string) => void) | null;
  compact?: boolean;
}

export function CreditScoreCard({
  score,
  range,
  factors = [],
  lastUpdated,
  provider = "Credit Bureau",
  tips = [],
  className,
  onUserAction,
  compact = false
}: CreditScoreCardProps) {
  // Calculate score range and color if not provided
  const getScoreRange = (score: number): 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent' => {
    if (score <= 579) return 'Poor';
    if (score <= 669) return 'Fair';
    if (score <= 739) return 'Good';
    if (score <= 799) return 'Very Good';
    return 'Excellent';
  };

  const scoreRange = range || getScoreRange(score);

  // Color scheme based on score range
  const getScoreColors = (range: string) => {
    switch (range) {
      case 'Poor':
        return {
          primary: '#ef4444', // red-500
          secondary: '#fee2e2', // red-50
          gradient: 'from-red-600/95 to-red-700/95'
        };
      case 'Fair':
        return {
          primary: '#f97316', // orange-500
          secondary: '#fff7ed', // orange-50
          gradient: 'from-orange-600/95 to-orange-700/95'
        };
      case 'Good':
        return {
          primary: '#eab308', // yellow-500
          secondary: '#fefce8', // yellow-50
          gradient: 'from-yellow-600/95 to-yellow-700/95'
        };
      case 'Very Good':
        return {
          primary: '#22c55e', // green-500
          secondary: '#f0fdf4', // green-50
          gradient: 'from-green-600/95 to-green-700/95'
        };
      case 'Excellent':
        return {
          primary: '#3b82f6', // blue-500
          secondary: '#eff6ff', // blue-50
          gradient: 'from-blue-600/95 to-blue-700/95'
        };
      default:
        return {
          primary: '#6366f1', // indigo-500
          secondary: '#eef2ff', // indigo-50
          gradient: 'from-indigo-600/95 to-indigo-700/95'
        };
    }
  };

  const colors = getScoreColors(scoreRange);

  // Calculate gauge percentage (850 is max score)
  const gaugePercentage = Math.min((score / 850) * 100, 100);

  // Send contextual update when significant score changes
  useEffect(() => {
    if (onUserAction && score > 0) {
      const contextMessage = `Credit Score displayed: ${score} (${scoreRange}). Range: ${scoreRange === 'Excellent' ? 'Outstanding credit profile' : scoreRange === 'Very Good' ? 'Strong credit standing' : scoreRange === 'Good' ? 'Solid credit history' : scoreRange === 'Fair' ? 'Credit needs improvement' : 'Credit requires attention'}.`;
      console.log('📊 Credit score contextual update:', contextMessage);
    }
  }, [score, scoreRange, onUserAction]);

  // Handle Learn More button
  const handleLearnMore = () => {
    if (onUserAction) {
      const contextMessage = `User clicked 'Learn More' on Credit Score card. Score: ${score} (${scoreRange}). They want detailed information about improving their credit score and understanding factors affecting it.`;
      onUserAction(contextMessage);
      console.log('📊 Learn More clicked:', contextMessage);
    }
  };

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
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1 font-medium">Credit Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-white">{score}</p>
                  <span className="text-sm text-gray-300 font-medium">{scoreRange}</span>
                </div>
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
      className={cn("w-full max-w-md mx-auto", className)}
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
              <Shield className="h-5 w-5" style={{ color: colors.primary }} />
            </motion.div>
            <div>
              <CardTitle className="text-white font-semibold text-lg">Credit Score</CardTitle>
              <CardDescription className="text-gray-400 text-sm">{provider}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-0">
          <div className="relative mx-auto aspect-square max-h-[250px] flex items-center justify-center">
            {/* Custom circular gauge */}
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
                stroke="url(#creditGradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 85}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - gaugePercentage / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="creditGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
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
                  {score}
                </div>
                <div className="text-gray-300 text-sm font-medium mb-1">
                  {scoreRange}
                </div>
                <div className="text-gray-500 text-xs">
                  out of 850
                </div>
              </motion.div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative flex-col gap-3 text-sm pt-2 pb-6">
          {/* Score Status Indicator */}
          <motion.div 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-xs bg-white/10 text-white border border-white/20"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {scoreRange === 'Excellent' || scoreRange === 'Very Good' ? (
              <TrendingUp className="h-3 w-3" />
            ) : scoreRange === 'Poor' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Info className="h-3 w-3" />
            )}
            <span>
              {scoreRange === 'Excellent' ? 'Outstanding' : 
               scoreRange === 'Very Good' ? 'Strong' :
               scoreRange === 'Good' ? 'Solid' :
               scoreRange === 'Fair' ? 'Needs Improvement' : 'Requires Attention'}
            </span>
          </motion.div>

          {lastUpdated && (
            <div className="text-gray-400 text-center text-xs font-medium">
              Last updated: {lastUpdated}
            </div>
          )}

          {/* Call to Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-auto w-full"
          >
            <Button
              onClick={handleLearnMore}
              className="w-full bg-white text-black hover:bg-white/90 font-medium py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
            >
              <span>Learn How to Improve</span>
              <TrendingUp className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </CardFooter>

        {/* Floating Shine Effect */}
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full blur-xl pointer-events-none"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Success Animation Pulse */}
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="absolute inset-0 bg-white/5 rounded-[40px] pointer-events-none"
        />
      </Card>
    </motion.div>
  );
}