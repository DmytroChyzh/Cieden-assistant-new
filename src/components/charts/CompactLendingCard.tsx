'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles, TrendingUp, Clock, Check, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_EASE = [0.22, 1, 0.36, 1] as const;
const DEFAULT_DURATION = 0.35;

interface VisualState {
  background: string;
  border: string;
  shadow: string;
  overlay: string;
}

interface CompactLendingCardVisuals {
  collapsed: VisualState;
  expanded: VisualState;
}

interface CompactLendingCardProps {
  option: {
    id: string;
    title: string;
    loanAmount: number;
    interestRate: number;
    term: number;
    monthlyPayment: number;
    totalInterest: number;
    recommended?: boolean;
    processingFee?: number;
    flexiFee?: number;
    maintenanceFee?: number;
    features: string[];
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
  };
  currency?: string;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onViewTerms: () => void;
  onApplyNow: () => void;
  layoutId: string;
  visuals: CompactLendingCardVisuals;
}

const getLoanDifferentiator = (option: CompactLendingCardProps['option']) => {
  if (option.emiStructure) {
    return {
      text: 'Start low, increase later',
      icon: TrendingUp,
      color: 'text-emerald-300'
    };
  }

  if (option.interestRate < 10) {
    return {
      text: 'Lowest rates available',
      icon: Sparkles,
      color: 'text-sky-300'
    };
  }

  if (option.term <= 3) {
    return {
      text: 'Money in 10 minutes',
      icon: Clock,
      color: 'text-amber-300'
    };
  }

  return {
    text: 'Fixed, predictable payments',
    icon: ChevronRight,
    color: 'text-slate-200'
  };
};

const formatCurrencyFactory = (currency: string) => (amount: number) => {
  const resolvedCurrency = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const CompactLendingCard = memo(function CompactLendingCard({
  option,
  currency = 'USD',
  isExpanded,
  onExpand,
  onCollapse,
  onViewTerms,
  onApplyNow,
  layoutId,
  visuals
}: CompactLendingCardProps) {
  const formatCurrency = formatCurrencyFactory(currency);

  const differentiator = getLoanDifferentiator(option);
  const Icon = differentiator.icon;

  const setupCost = (option.processingFee || 0) + (option.flexiFee || 0) + (option.maintenanceFee || 0);
  const displayEMI = option.emiStructure ? option.emiStructure.initialPeriod.amount : option.monthlyPayment;

  const handleExpand = useCallback(() => {
    if (!isExpanded) onExpand();
  }, [isExpanded, onExpand]);

  const handleExpandKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isExpanded && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onExpand();
      }
    },
    [isExpanded, onExpand]
  );

  const handleCollapseClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onCollapse();
    },
    [onCollapse]
  );

  const handleViewTermsClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onViewTerms();
    },
    [onViewTerms]
  );

  const handleApplyNowClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onApplyNow();
    },
    [onApplyNow]
  );

  const handleCollapsedButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onExpand();
    },
    [onExpand]
  );

  const activeVisuals = isExpanded ? visuals.expanded : visuals.collapsed;
  const secondaryVisuals = isExpanded ? visuals.collapsed : visuals.expanded;

  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={false}
      animate={{
        background: activeVisuals.background,
        borderColor: activeVisuals.border,
        boxShadow: activeVisuals.shadow,
        opacity: 1,
        scale: 1
      }}
      whileHover={!isExpanded ? { scale: 1.01 } : undefined}
      transition={{
        duration: DEFAULT_DURATION,
        ease: DEFAULT_EASE,
        layout: { duration: DEFAULT_DURATION, ease: DEFAULT_EASE }
      }}
      className={cn(
        'relative overflow-hidden rounded-[32px] border backdrop-blur-2xl text-white transition-all',
        isExpanded ? 'cursor-default' : 'cursor-pointer'
      )}
      style={{ borderColor: secondaryVisuals.border }}
      onClick={handleExpand}
      role={!isExpanded ? 'button' : undefined}
      tabIndex={!isExpanded ? 0 : undefined}
      onKeyDown={handleExpandKeyDown}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{
          background: activeVisuals.overlay,
          opacity: isExpanded ? 0.9 : 0.6
        }}
        transition={{ duration: DEFAULT_DURATION + 0.15, ease: DEFAULT_EASE }}
      />

      <div className="relative flex flex-col gap-4 p-6">
        <motion.div layout className="flex items-start justify-between gap-4">
          <motion.div layoutId={`${layoutId}-title`} className="space-y-1">
            <h3 className="text-lg font-semibold text-white/95">{option.title}</h3>
            {isExpanded && (
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">Personalized offer</p>
            )}
          </motion.div>

          {isExpanded ? (
            <Button
              size="icon"
              variant="ghost"
              className="flex-none rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              onClick={handleCollapseClick}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10"
            >
              <ChevronRight className="h-4 w-4 text-white/70" />
            </motion.div>
          )}
        </motion.div>

        {option.recommended && (
          <motion.div
            layout
            className="w-fit rounded-full bg-blue-500/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg"
          >
            Recommended
          </motion.div>
        )}

        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <motion.div layoutId={`${layoutId}-hero`} className="space-y-1">
              <div className="text-3xl font-bold text-white">
                {formatCurrency(displayEMI)}
                <span className="ml-1 text-sm font-normal text-white/70">/month</span>
              </div>
              {option.emiStructure && (
                <p className="text-xs text-white/60">
                  for first {option.emiStructure.initialPeriod.months} months
                </p>
              )}
            </motion.div>

            <div className="flex items-center gap-2 text-sm text-white/85">
              <Icon className={cn('h-4 w-4', differentiator.color)} />
              <span className={cn('font-medium', differentiator.color)}>{differentiator.text}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span>{option.interestRate}% p.a.</span>
              <span className="text-white/30">•</span>
              <span>{option.term} months</span>
              {setupCost > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span>{formatCurrency(setupCost)} setup</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              className="mt-2 w-full border-white/20 bg-white/5 text-white hover:bg-white/15"
              onClick={handleCollapsedButtonClick}
            >
              View detailed breakdown
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="space-y-5"
          >
            <motion.div layoutId={`${layoutId}-hero`} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Loan amount</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(option.loanAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Monthly payment</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {option.emiStructure
                    ? formatCurrency(option.emiStructure.initialPeriod.amount)
                    : formatCurrency(option.monthlyPayment)}
                </p>
                {option.emiStructure && (
                  <p className="mt-1 text-[11px] text-white/60">
                    for first {option.emiStructure.initialPeriod.months} months
                  </p>
                )}
              </div>
            </motion.div>

            {option.emiStructure && (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/85">
                <p className="font-medium text-white">Payment schedule</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Months 1-{option.emiStructure.initialPeriod.months}:</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(option.emiStructure.initialPeriod.amount)}/month
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">
                      Months {option.emiStructure.initialPeriod.months + 1}-{option.term}:
                    </span>
                    <span className="font-semibold text-white">
                      {formatCurrency(option.emiStructure.laterPeriod.amount)}/month
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Cost of borrowing</span>
                <span className="font-semibold text-white">{formatCurrency(option.totalInterest)}</span>
              </div>
              {option.processingFee && (
                <div className="flex items-center justify-between">
                  <span className="text-white/70">One-time setup cost</span>
                  <span className="font-semibold text-white">{formatCurrency(option.processingFee)}</span>
                </div>
              )}
              {option.flexiFee && (
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Flexi facility fee</span>
                  <span className="font-semibold text-amber-200">{formatCurrency(option.flexiFee)}</span>
                </div>
              )}
              {option.maintenanceFee && (
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Annual maintenance</span>
                  <span className="font-semibold text-white">{formatCurrency(option.maintenanceFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/15 pt-3">
                <span className="font-medium text-white">Total you'll repay</span>
                <span className="text-lg font-semibold text-white">
                  {formatCurrency(option.loanAmount + option.totalInterest)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Why choose this</p>
              <div className="grid gap-2 text-sm">
                {option.features.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-white/85">
                    <Check className="h-4 w-4 text-emerald-300" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
                onClick={handleViewTermsClick}
              >
                <FileText className="mr-2 h-4 w-4" />
                View full terms
              </Button>
              <Button className="bg-white text-slate-900 hover:bg-white/90" onClick={handleApplyNowClick}>
                Apply now
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

CompactLendingCard.displayName = 'CompactLendingCard';
