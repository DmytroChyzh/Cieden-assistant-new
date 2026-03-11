"use client";

import { useState } from 'react';
import { motion } from "framer-motion";
import { TrendingUp, Shield, Zap, X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompactLendingCard } from './CompactLendingCard';
import { LendingTermsModal } from './LendingTermsModal';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface LendingOption {
  id: string;
  title: string;
  loanAmount: number;
  interestRate: number;
  term: number; // in months
  monthlyPayment: number;
  totalInterest: number;
  features: string[];
  recommended?: boolean;
  // Optional fees (render conditionally)
  processingFee?: number;
  flexiFee?: number;
  maintenanceFee?: number;
  // Generic fee for backward compatibility with handler payloads
  fee?: number;
  // EMI structure for split payments
  emiStructure?: {
    initialPeriod: {
      months: number;
      amount: number;
    };
    laterPeriod: {
      months: number;
      amount: number;
    };
  };
}

interface LendingOptionsCardProps {
  options?: LendingOption[];
  currency?: string;
  userProfile?: {
    creditScore?: number;
    monthlyIncome?: number;
  };
  onUserAction?: ((text: string) => void) | null;
  onExpand?: (optionId: string) => void;
  onCollapse?: () => void;
  isExpanded?: boolean;
  layoutId?: string;
  expandedOptionId?: string | null;
  viewMode?: 'compact' | 'full'; // Override user preference
  userId?: string; // For fetching preferences
}

// Default benchmark options seeded with publicly reported U.S. rates (November 2025):
// - 30-year fixed mortgage average 6.27% (Associated Press, Oct. 16, 2025)
// - Prime lending rate reset to 7.00% after Sept. 2025 Fed cut (Reuters, Sept. 17, 2025)
// - Top 5-year CDs yielding ~4.15% APY (Kiplinger, Oct. 2025)
const defaultOptions: LendingOption[] = [
  {
    id: "mortgage-30y",
    title: "30-Year Fixed Mortgage",
    loanAmount: 350000,
    interestRate: 6.27,
    term: 360,
    monthlyPayment: 2160,
    totalInterest: 427600,
    features: [
      "Matches national average 30-year fixed rate reported Oct. 2025",
      "Fixed payment over 360 months",
      "Best for long-term home financing"
    ],
    recommended: true,
    processingFee: 1295
  },
  {
    id: "heloc-prime",
    title: "Prime-Based HELOC",
    loanAmount: 150000,
    interestRate: 7.0,
    term: 60,
    monthlyPayment: 875,
    totalInterest: 52500,
    features: [
      "Rate tracks U.S. prime (7.00% after Sept. 2025 Fed cut)",
      "Interest-only payments for first 5 years",
      "Flexible access for renovations or tuition"
    ],
    flexiFee: 199
  },
  {
    id: "cd-ladder",
    title: "5-Year CD Ladder",
    loanAmount: 50000,
    interestRate: 4.15,
    term: 60,
    monthlyPayment: 208,
    totalInterest: 10375,
    features: [
      "Top credit union CD rates around 4.15% APY",
      "Estimated monthly interest about $208 on $50k balance",
      "FDIC/NCUA insured principal"
    ],
    maintenanceFee: 0
  }
];

export function LendingOptionsCard({
  options = defaultOptions,
  currency = "USD",
  userProfile,
  onUserAction,
  onExpand,
  onCollapse,
  isExpanded = false,
  layoutId,
  expandedOptionId,
  viewMode: propViewMode,
  userId = "default-user"
}: LendingOptionsCardProps) {
  // State for locally expanded cards in compact mode
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showTermsModal, setShowTermsModal] = useState<string | null>(null);
  
  // Fetch user preferences
  const userPreferences = useQuery(api.userPreferences.get, { userId });
  
  // Determine view mode: prop > user preference > default
  const viewMode = propViewMode || userPreferences?.lendingViewMode || 'compact';

  // Format currency
  const formatCurrency = (amount: number) => {
    const resolvedCurrency = currency || "USD";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

const getCardVisuals = (option: LendingOption) => {
  if (option.recommended) {
    return {
      collapsed: {
        background: "linear-gradient(135deg, rgba(14,24,56,0.96), rgba(22,40,82,0.9))",
        border: "rgba(96,165,250,0.35)",
        shadow: "0 24px 60px -26px rgba(59,130,246,0.5)",
        overlay: "radial-gradient(140% 140% at 18% 120%, rgba(59,130,246,0.35) 0%, transparent 74%)"
      },
      expanded: {
        background: "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.92))",
        border: "rgba(191,219,254,0.65)",
        shadow: "0 44px 100px -22px rgba(59,130,246,0.58)",
        overlay: "radial-gradient(160% 160% at 50% -20%, rgba(147,197,253,0.55) 0%, transparent 78%)"
      }
    };
  }

  return {
    collapsed: {
      background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.88))",
      border: "rgba(148,163,184,0.28)",
      shadow: "0 22px 60px -28px rgba(15,23,42,0.6)",
      overlay: "radial-gradient(140% 140% at 10% 115%, rgba(45,212,191,0.28) 0%, transparent 72%)"
    },
    expanded: {
      background: "linear-gradient(135deg, rgba(30,41,59,0.96), rgba(17,94,89,0.88))",
      border: "rgba(134,239,172,0.45)",
      shadow: "0 40px 96px -24px rgba(16,185,129,0.4)",
      overlay: "radial-gradient(150% 150% at 50% -10%, rgba(16,185,129,0.45) 0%, transparent 76%)"
    }
  };
};
  
  // Handle compact card expansion
  const handleCompactExpand = (optionId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        // Close other cards and open this one
        newSet.clear();
        newSet.add(optionId);
      }
      return newSet;
    });
    
    if (onUserAction) {
      onUserAction(`User expanded ${options.find(o => o.id === optionId)?.title} loan details`);
    }
  };
  
  // Handle view full terms
  const handleViewTerms = (option: LendingOption) => {
    setShowTermsModal(option.id);
    if (onUserAction) {
      onUserAction(`User viewed full terms for ${option.title}`);
    }
  };

  // Handle Learn More click for each option
  const handleLearnMore = (option: LendingOption) => {
    if (onUserAction) {
      const contextMessage = `User clicked 'Learn More' for ${option.title}. Details: Loan amount ${formatCurrency(option.loanAmount)}, Interest rate ${option.interestRate}%, Term ${option.term} months, Monthly payment ${formatCurrency(option.monthlyPayment)}`;
      onUserAction(contextMessage);
      console.log('💰 Lending option interaction sent to agent:', contextMessage);
    }
    
    // Trigger expansion to show detailed loan breakdown
    if (onExpand) {
      onExpand(option.id);
    }
  };
  
  // Handle Apply Now
  const handleApplyNow = (option: LendingOption) => {
    if (onUserAction) {
      onUserAction(`User clicked Apply Now for ${option.title}. Ready to start application process.`);
    }
  };

  // Find the expanded option
  const expandedOptionData = expandedOptionId ? options.find(opt => opt.id === expandedOptionId) : null;
  
  // Find the option for terms modal
  const termsOption = showTermsModal ? options.find(opt => opt.id === showTermsModal) : null;

  // Render compact mode
  if (viewMode === 'compact' && !isExpanded) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        {options.map((option) => {
          const isCardExpanded = expandedCards.has(option.id);
          const layoutIdForCard = `lending-option-${option.id}`;
          const visuals = getCardVisuals(option);

          return (
            <CompactLendingCard
              key={option.id}
              option={option}
              currency={currency}
              isExpanded={isCardExpanded}
              onExpand={() => handleCompactExpand(option.id)}
              onCollapse={() => handleCompactExpand(option.id)}
              onViewTerms={() => handleViewTerms(option)}
              onApplyNow={() => handleApplyNow(option)}
              layoutId={layoutIdForCard}
              visuals={visuals}
            />
          );
        })}
      </div>
    );
  }

  // Original full view mode (existing code)
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <motion.div
        layoutId={layoutId}
        layoutRoot={isExpanded}
        initial={isExpanded ? { opacity: 1, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          duration: 3.0 
        }}
        className={cn(
          "flex flex-col",
          isExpanded
            ? "fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4" 
            : "w-full"
        )}
      >
        {isExpanded && (
          <div 
            className="fixed inset-0 -z-10" 
            onClick={onCollapse}
            style={{ pointerEvents: 'auto' }}
          />
        )}
        
        {/* Main Content Container */}
        {isExpanded ? (
          <div className={cn(
            "relative overflow-hidden rounded-2xl flex-1 flex flex-col w-full max-h-[95vh] max-w-md p-6 pointer-events-auto",
            expandedOptionData?.recommended 
              ? "bg-gradient-to-br from-emerald-600/95 to-teal-700/95 border border-emerald-500/30"
              : "bg-gradient-to-br from-blue-600/95 to-indigo-700/95 border border-blue-500/30"
          )}>
            {/* Expanded: Detailed loan breakdown */}
            <>
              {/* Expanded: Detailed loan breakdown */}
              {expandedOptionData && (
                <>
                {/* Close button */}
                <Button
                  onClick={onCollapse}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-white/60 hover:text-white hover:bg-white/10 z-10"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-2xl">
                      {expandedOptionData.title}
                    </h2>
                    <p className="text-white/70">
                      Detailed loan breakdown
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Loan Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <div className="text-white/60 text-sm mb-1">We'll lend you</div>
                      <div className="text-white font-bold text-2xl">
                        {formatCurrency(expandedOptionData.loanAmount)}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <div className="text-white/60 text-sm mb-1">You'll pay monthly</div>
                      <div className="text-white font-bold text-2xl">
                        {formatCurrency(expandedOptionData.monthlyPayment)}
                      </div>
                    </div>
                  </div>

                  {/* Detailed breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold text-lg mb-3">Loan Details</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Interest Rate</span>
                          <span className="text-white font-bold">{expandedOptionData.interestRate}%</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Loan Term</span>
                          <span className="text-white font-bold">{expandedOptionData.term} months</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Cost of borrowing</span>
                          <span className="text-white font-bold">{formatCurrency(expandedOptionData.totalInterest)}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Total Repayment</span>
                          <span className="text-white font-bold">
                            {formatCurrency(expandedOptionData.loanAmount + expandedOptionData.totalInterest)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-6">
                    <h3 className="text-white font-semibold text-lg mb-3">Features</h3>
                    <div className="space-y-2">
                      {expandedOptionData.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-400" />
                          <span className="text-white/80 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={() => handleLearnMore(expandedOptionData)}
                    className="w-full mt-6 bg-white text-blue-700 hover:bg-white/90 font-medium py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                  >
                    Apply Now
                  </Button>
                </div>
              </>
            )}
          </>
        </div>
        ) : (
          <>
            {/* Full View: Enhanced Single Card View */}
            <div className="space-y-6">
              {options.map((option, index) => {
                const totalPrincipal = option.loanAmount;
                const totalInterest = option.totalInterest;
                const principalPercentage = (totalPrincipal / (totalPrincipal + totalInterest)) * 100;
                const interestPercentage = (totalInterest / (totalPrincipal + totalInterest)) * 100;
                
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring", 
                      stiffness: 200, 
                      damping: 20
                    }}
                    className="w-full max-w-md mx-auto"
                  >
                    <div className={cn(
                      "relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl",
                      option.recommended 
                        ? "bg-gradient-to-br from-blue-500/95 to-blue-600/95 border-blue-400/30"
                        : "bg-gradient-to-br from-indigo-600/95 to-purple-700/95 border-indigo-500/30"
                    )}>
                      {/* Recommended Badge */}
                      {option.recommended && (
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                          className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          RECOMMENDED
                        </motion.div>
                      )}

                      {/* Glass effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.02] pointer-events-none" />

                      <div className="p-6">
                        {/* Header */}
                        <div className="text-center mb-6">
                          <h2 className="text-white font-bold text-xl mb-2">{option.title}</h2>
                          <p className="text-white/70 text-sm">EMI for {option.term} months at {option.interestRate}% p.a.</p>
                        </div>

                        {/* EMI Period Structure */}
                        {option.emiStructure ? (
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/10 rounded-xl p-4 text-center">
                              <div className="text-white font-bold text-2xl mb-2">
                                {formatCurrency(option.emiStructure.initialPeriod.amount)}
                              </div>
                              <div className="text-white/70 text-sm">
                                EMI for 1<sup>st</sup> to {option.emiStructure.initialPeriod.months}<sup>th</sup> months
                              </div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-4 text-center">
                              <div className="text-white font-bold text-2xl mb-2">
                                {formatCurrency(option.emiStructure.laterPeriod.amount)}
                              </div>
                              <div className="text-white/70 text-sm">
                                EMI for {(option.emiStructure.initialPeriod.months + 1)}<sup>th</sup> to {option.term}<sup>th</sup> months
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 mb-6">
                            <div className="bg-white/10 rounded-xl p-4 text-center">
                              <div className="text-white font-bold text-2xl mb-2">
                                {formatCurrency(option.monthlyPayment)}
                              </div>
                              <div className="text-white/70 text-sm">
                                Monthly EMI for {option.term} months
                              </div>
                            </div>
                          </div>
                        )}


                        {/* Principal vs Interest Breakdown Bar */}
                        <div className="mb-6">
                          <div className="flex justify-between text-white/70 text-sm mb-2">
                            <span>{formatCurrency(totalPrincipal)}</span>
                            <span>{formatCurrency(totalInterest)}</span>
                          </div>
                          <div className="h-6 rounded-xl overflow-hidden flex bg-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${principalPercentage}%` }}
                              transition={{ duration: 1, delay: 0.3 }}
                              className="bg-gradient-to-r from-purple-500 to-purple-600"
                            />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${interestPercentage}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className="bg-gradient-to-r from-amber-400 to-orange-500"
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-purple-500" />
                              <span className="text-white/70 text-sm">Principal Amount</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-amber-500" />
                              <span className="text-white/70 text-sm">Total Interest</span>
                            </div>
                          </div>
                        </div>

                        {/* Loan Details */}
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">We'll lend you:</span>
                            <span className="text-white font-semibold">{formatCurrency(option.loanAmount)}</span>
                          </div>
                          {typeof option.processingFee === 'number' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">One-time setup cost:</span>
                              <span className="text-white font-semibold">{formatCurrency(option.processingFee)}</span>
                            </div>
                          )}
                          {typeof option.flexiFee === 'number' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Flexi Facility Fee:</span>
                              <span className="font-semibold text-orange-400">{formatCurrency(option.flexiFee)}</span>
                            </div>
                          )}
                          {typeof option.maintenanceFee === 'number' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/70">Annual Maintenance:</span>
                              <span className="text-white font-semibold">{formatCurrency(option.maintenanceFee)}</span>
                            </div>
                          )}
                        </div>

                        {/* Best For Section */}
                        <div className="bg-blue-500/20 rounded-lg p-3 mb-6">
                          <div className="text-blue-200 font-medium text-sm mb-1">Perfect if you:</div>
                          <div className="text-blue-100 text-sm">
                            {option.emiStructure 
                              ? "Expect your income to grow and want lower EMI initially"
                              : "Want fixed, predictable monthly payments"
                            }
                          </div>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-2 mb-6">
                          <h4 className="text-white font-medium text-sm">Why choose this?</h4>
                          {option.features.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-white/80 text-xs">
                              <div className="w-1 h-1 rounded-full bg-green-400" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>

                        {/* Action Button */}
                        <Button
                          onClick={() => handleLearnMore(option)}
                          className="w-full bg-white text-blue-700 hover:bg-white/90 font-medium py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                        >
                          Learn More
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
      
      {/* Credit Score Indicator (if provided and not expanded) */}
      {userProfile?.creditScore && !isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-white/80 text-sm">
              Based on your credit score: {userProfile.creditScore}
            </span>
          </div>
        </motion.div>
      )}
      
      {/* Lending Terms Modal */}
      {termsOption && (
        <LendingTermsModal
          isOpen={!!showTermsModal}
          onClose={() => setShowTermsModal(null)}
          option={termsOption}
          currency={currency}
          onApply={() => {
            handleApplyNow(termsOption);
            setShowTermsModal(null);
          }}
        />
      )}
    </div>
  );
}