"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Calculator, Info, DollarSign, ArrowRight, Percent } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EMICardProps {
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  emi: number;
  currency?: string;
  principal?: number;
  interest?: number;
  totalAmount?: number;
  loanType?: string;
  className?: string;
  onUserAction?: ((text: string) => void) | null;
  compact?: boolean;
  simpleExample?: boolean;
}

export function EMICard({
  loanAmount = 0,
  interestRate = 0,
  termMonths = 0,
  emi = 0,
  currency = "USD",
  principal,
  interest,
  totalAmount,
  className,
  onUserAction,
  compact = false,
  simpleExample = false
}: EMICardProps) {
  // Choose realistic defaults and compute derived values safely
  const defaultProfile = {
    loan: 2500,
    rate: 9,
    term: 12,
  };

  const simpleExampleProfile = {
    loan: 2500,
    rate: 0,
    term: 10,
    monthlyPayment: 250,
  };

  const resolvedLoanAmount = Number.isFinite(loanAmount) && loanAmount > 0 ? loanAmount : defaultProfile.loan;
  const resolvedTermMonths = Number.isFinite(termMonths) && termMonths > 0 ? termMonths : defaultProfile.term;
  const resolvedInterestRate = Number.isFinite(interestRate) && interestRate > 0 ? interestRate : defaultProfile.rate;
  const principalValue = typeof principal === "number" ? principal : undefined;
  const totalAmountValue = typeof totalAmount === "number" ? totalAmount : undefined;
  const interestValue = typeof interest === "number" ? interest : undefined;

  const effectiveLoanAmount = simpleExample ? simpleExampleProfile.loan : resolvedLoanAmount;
  const effectiveTermMonths = simpleExample ? simpleExampleProfile.term : resolvedTermMonths;
  const effectiveInterestRate = simpleExample ? simpleExampleProfile.rate : resolvedInterestRate;
  const computeEmi = (p: number, annualRatePercent: number, nMonths: number) => {
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(nMonths) || nMonths <= 0) return 0;
    const monthlyRate = Number.isFinite(annualRatePercent) && annualRatePercent > 0 ? (annualRatePercent / 12) / 100 : 0;
    if (monthlyRate === 0) return p / nMonths;
    const pow = Math.pow(1 + monthlyRate, nMonths);
    return (p * monthlyRate * pow) / (pow - 1);
  };
  const calculatedEmi = simpleExample
    ? simpleExampleProfile.monthlyPayment
    : (Number.isFinite(emi) && emi > 0 ? emi : Math.round(computeEmi(effectiveLoanAmount, effectiveInterestRate, effectiveTermMonths)));
  const calculatedPrincipal = simpleExample
    ? simpleExampleProfile.loan
    : (principalValue !== undefined && Number.isFinite(principalValue) && principalValue > 0
      ? principalValue
      : effectiveLoanAmount);
  const calculatedTotalAmount = simpleExample
    ? simpleExampleProfile.monthlyPayment * simpleExampleProfile.term
    : (totalAmountValue !== undefined && Number.isFinite(totalAmountValue) && totalAmountValue > 0
      ? totalAmountValue
      : (calculatedEmi * effectiveTermMonths));
  const calculatedInterest = simpleExample
    ? 0
    : (interestValue !== undefined && Number.isFinite(interestValue) && interestValue >= 0
      ? interestValue
      : (calculatedTotalAmount - calculatedPrincipal));

  // Monthly breakdown that sums to monthly EMI
  const monthlyRate = simpleExample
    ? 0
    : (Number.isFinite(effectiveInterestRate) && effectiveInterestRate > 0 ? (effectiveInterestRate / 12) / 100 : 0);
  const monthlyInterestPortion = simpleExample ? 0 : (effectiveLoanAmount * monthlyRate);
  const monthlyPrincipalPortion = simpleExample ? calculatedEmi : Math.max(calculatedEmi - monthlyInterestPortion, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    const resolvedCurrency = currency || "USD";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate years from months
  const years = Math.floor(effectiveTermMonths / 12);
  const remainingMonths = effectiveTermMonths % 12;
  const termDisplay = years > 0 ? 
    (remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`) : 
    `${effectiveTermMonths} months`;

  // Send contextual update
  useEffect(() => {
    // Quiet by default to reduce console noise; keep for future analytics if needed
    // if (onUserAction && calculatedEmi > 0) {
    //   const contextMessage = `EMI Calculator displayed: Loan amount ${formatCurrency(effectiveLoanAmount)}, Interest rate ${effectiveInterestRate}%, Term ${termDisplay}, Monthly EMI ${formatCurrency(calculatedEmi)}. Total interest: ${formatCurrency(calculatedInterest)}.`;
    //   console.log('🧮 EMI contextual update:', contextMessage);
    // }
  }, [effectiveLoanAmount, effectiveInterestRate, effectiveTermMonths, calculatedEmi, calculatedInterest, onUserAction, termDisplay]);

  // Handle Learn More button
  const handleLearnMore = () => {
    if (onUserAction) {
      const contextMessage = `User clicked 'Learn About EMI Calculation' for loan amount ${formatCurrency(effectiveLoanAmount)}. They want to understand the EMI breakdown, amortization schedule, and tips for managing loan payments effectively.`;
      onUserAction(contextMessage);
      console.log('🧮 Learn More clicked:', contextMessage);
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
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1 font-medium">Monthly EMI</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(calculatedEmi)}
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
        duration: 0.8 
      }}
      className={cn("w-full max-w-3xl mx-auto", className)}
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

        <CardHeader className="relative items-center pb-4 pt-6">
          <div className="text-center">
            <CardTitle className="text-white font-bold text-2xl mb-1">What is EMI?</CardTitle>
            <CardDescription className="text-gray-400 text-base">Equated Monthly Installment</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-0">
          {/* Simple Meaning Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border-l-4 border-white/20">
              <p className="text-gray-300 text-sm leading-relaxed">
                <strong className="text-white">Simple Meaning:</strong> EMI is the fixed amount you pay every month to the bank when you take a loan. It&apos;s like breaking your big loan into small, equal monthly payments!
              </p>
            </div>
          </motion.div>

          {/* Example Section with Loan Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
              <h3 className="text-white font-semibold text-lg">Example:</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Loan Amount */}
              <div className="bg-blue-500/15 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30">
                <div className="text-center">
                  <h4 className="text-gray-300 font-semibold text-xs mb-1">Loan Amount</h4>
                  <div className="text-lg font-bold text-white mb-1 break-all">
                    {formatCurrency(effectiveLoanAmount)}
                  </div>
                  <div className="text-blue-200 text-xs">What you borrowed</div>
                </div>
              </div>

              {/* Loan Period */}
              <div className="bg-blue-500/15 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30">
                <div className="text-center">
                  <h4 className="text-gray-300 font-semibold text-xs mb-1">Loan Period</h4>
                  <div className="text-lg font-bold text-white mb-1">
                    {termDisplay}
                  </div>
                  <div className="text-blue-200 text-xs">Time to repay</div>
                </div>
              </div>
            </div>

            {/* EMI Breakdown Formula - Mobile Optimized */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/5">
              <div className="flex flex-col space-y-3">
                {/* Top Row: Principal + Interest */}
                <div className="flex items-center justify-center gap-2">
                  {/* Principal */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mb-1">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-gray-300 font-bold text-xs">Monthly Principal</div>
                      <div className="text-white text-sm font-bold">
                        {formatCurrency(monthlyPrincipalPortion)}
                      </div>
                    </div>
                  </div>

                  {/* Plus Icon */}
                  <div className="text-white text-lg font-bold px-2">+</div>

                  {/* Interest */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mb-1">
                      <Percent className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-gray-300 font-bold text-xs">Monthly Interest</div>
                      <div className="text-white text-sm font-bold">
                        {formatCurrency(monthlyInterestPortion)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center justify-center">
                  <div className="w-16 h-px bg-white/30"></div>
                  <div className="text-white text-lg font-bold px-2">=</div>
                  <div className="w-16 h-px bg-white/30"></div>
                </div>

                {/* Bottom Row: Monthly EMI */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white font-bold text-xs">EMI</span>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">Monthly EMI</div>
                    <div className="text-white text-xl font-bold">
                      {formatCurrency(calculatedEmi)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Important Tips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <Info className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-amber-200 font-bold text-sm">Important Tips</h4>
            </div>
            
            <div className="space-y-2 text-gray-200 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Same amount every month - no surprises!</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Pay on the same date each month</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>EMI should be max 30-40% of your monthly income</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Missing EMI = penalty charges</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Higher EMI = loan ends faster</span>
              </div>
            </div>
          </motion.div>

          {/* Call to Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="pb-6"
          >
            <Button
              onClick={handleLearnMore}
              className="w-full bg-white text-purple-700 hover:bg-white/90 font-medium py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
            >
              <span>Learn About EMI Calculation</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </CardContent>

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