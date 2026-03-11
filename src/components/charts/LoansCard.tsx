"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, TrendingUp, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanData {
  month: string;
  amount: number;
  isPaid?: boolean;
}

interface LoansCardProps {
  totalLoans: number;
  paidAmount: number;
  currency?: string;
  monthlyData?: LoanData[];
  className?: string;
  onUserAction?: ((text: string) => void) | null;
}

export function LoansCard({
  totalLoans,
  paidAmount,
  currency = "USD",
  monthlyData,
  className,
  onUserAction
}: LoansCardProps) {
  // Ensure monthlyData has default values
  const defaultMonthlyData = [
    { month: "Jan", amount: 980, isPaid: true },
    { month: "Feb", amount: 1200, isPaid: true },
    { month: "Mar", amount: 1450, isPaid: true },
    { month: "Apr", amount: 890, isPaid: true },
    { month: "May", amount: 1100, isPaid: false },
    { month: "Jun", amount: 950, isPaid: false },
  ];
  
  const actualMonthlyData = monthlyData && monthlyData.length > 0 ? monthlyData : defaultMonthlyData;
  const [isExpanded, setIsExpanded] = useState(false);
  const remainingAmount = totalLoans - paidAmount;
  const paidPercentage = (paidAmount / totalLoans) * 100;
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  useEffect(() => {
    if (onUserAction && paidPercentage > 75) {
      const message = `Loan payment progress: ${paidPercentage.toFixed(0)}% paid. ${formatAmount(remainingAmount)} remaining.`;
      onUserAction(message);
    }
  }, [paidPercentage, remainingAmount, onUserAction, formatAmount]);

  const maxAmount = Math.max(...actualMonthlyData.map(d => d.amount));

  const collapsedVisuals = {
    background: "linear-gradient(135deg, rgba(11,21,43,0.95), rgba(29,53,87,0.9))",
    border: "rgba(148,163,184,0.28)",
    shadow: "0 30px 72px -28px rgba(56,189,248,0.45)",
    overlay: "radial-gradient(140% 140% at 18% 115%, rgba(129,230,217,0.35) 0%, transparent 74%)"
  };

  const expandedVisuals = {
    background: "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(15,118,110,0.82))",
    border: "rgba(74,222,128,0.45)",
    shadow: "0 46px 120px -30px rgba(34,197,94,0.45)",
    overlay: "radial-gradient(160% 160% at 50% -10%, rgba(45,212,191,0.5) 0%, transparent 78%)"
  };

  const activeVisuals = isExpanded ? expandedVisuals : collapsedVisuals;
  const contentTransition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn("w-full max-w-3xl mx-auto", className)}
    >
      <motion.div
        layout
        onClick={() => setIsExpanded((prev) => !prev)}
        className="relative overflow-hidden rounded-[36px] border backdrop-blur-2xl cursor-pointer"
        animate={{
          background: activeVisuals.background,
          borderColor: activeVisuals.border,
          boxShadow: activeVisuals.shadow
        }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.32 } }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{ background: activeVisuals.overlay, opacity: isExpanded ? 0.88 : 0.6 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="relative p-6">
          <motion.div layout className="flex items-start justify-between gap-3">
            <motion.div layoutId="loans-card-title" className="space-y-1">
              <motion.h2 layout className="text-lg font-semibold text-white/95">
                {isExpanded ? "Loan Details" : "Total Loans"}
              </motion.h2>
              <motion.p layout className="text-xs uppercase tracking-[0.2em] text-white/50">
                {isExpanded ? "Today’s activity" : "Overview"}
              </motion.p>
            </motion.div>

            <motion.div
              layout
              className="flex-none rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white/80"
              whileHover={{ scale: 1.05 }}
            >
              {isExpanded ? `${paidPercentage.toFixed(1)}% paid` : currency}
              {!isExpanded && <ChevronDown className="ml-1 inline h-3 w-3" />}
            </motion.div>
          </motion.div>

          <AnimatePresence initial={false} mode="wait">
            {!isExpanded ? (
              <motion.div
                key="collapsed"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={contentTransition}
                className="mt-5 space-y-6"
              >
                <motion.div layout className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-white/60">Outstanding total</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        {currency === "USD" ? "$" : ""}{formatCompact(totalLoans)}
                      </span>
                      <span className="text-2xl text-white/40">.00</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50">Paid amount</p>
                    <p className="text-sm font-semibold text-white">{formatAmount(paidAmount)}</p>
                  </div>
                </motion.div>

                <div className="flex h-24 items-end justify-between gap-2">
                  {actualMonthlyData.map((data, index) => (
                    <div key={data.month} className="flex flex-1 flex-col items-center">
                      <motion.div
                        className={cn(
                          "w-full rounded-t-lg",
                          data.isPaid ? "bg-white/85" : "bg-white/35"
                        )}
                        initial={{ height: 0 }}
                        animate={{ height: `${(data.amount / maxAmount) * 100}%` }}
                        transition={{ delay: index * 0.08, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                      />
                      <span className="mt-2 text-xs text-white/60">{data.month}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={contentTransition}
                className="mt-6 space-y-6"
              >
                <motion.div layout className="grid gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Total loans</span>
                      <span className="font-semibold text-white">{formatAmount(totalLoans)}</span>
                    </div>
                    <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${paidPercentage}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-emerald-300">Paid: {formatAmount(paidAmount)}</span>
                      <span className="text-white/60">Remaining: {formatAmount(remainingAmount)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
                    <div className="mb-3 flex items-center justify-between text-xs text-white/60">
                      <span className="flex items-center gap-2 text-white/70">
                        <Calendar className="h-4 w-4" /> Monthly breakdown
                      </span>
                      <span>Avg: {formatAmount(totalLoans / actualMonthlyData.length)}</span>
                    </div>
                    <div className="flex h-32 items-end justify-between gap-3">
                      {actualMonthlyData.map((data, index) => (
                        <div key={data.month} className="flex flex-1 flex-col items-center">
                          <motion.div
                            className="relative w-full overflow-hidden rounded-t-lg"
                            initial={{ height: 0 }}
                            animate={{ height: `${(data.amount / maxAmount) * 100}%` }}
                            transition={{ delay: index * 0.07, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                          >
                            <div
                              className={cn(
                                "h-full w-full",
                                data.isPaid
                                  ? "bg-gradient-to-t from-emerald-500/80 to-lime-300/75"
                                  : "bg-gradient-to-t from-slate-600/65 to-slate-400/55"
                              )}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/15" />
                          </motion.div>
                          <span className="mt-2 text-xs text-white/70">{data.month}</span>
                          <span className="text-[10px] text-white/50">{(data.amount / 1000).toFixed(1)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-emerald-300">
                        <TrendingUp className="h-3 w-3" /> Payment rate
                      </div>
                      <div className="text-white font-semibold">
                        {(paidAmount / actualMonthlyData.filter((d) => d.isPaid).length).toFixed(0)} /mo
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-xs text-white/50">Estimated completion</p>
                      <p className="mt-1 text-white font-semibold">
                        {Math.ceil(remainingAmount / (paidAmount / actualMonthlyData.filter((d) => d.isPaid).length))} months
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Auto-pay suggestion</p>
                    <p className="text-xs text-white/60">Turn on auto-pay to stay ahead of schedule.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}