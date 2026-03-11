"use client";

import { useState, useCallback } from "react";
import { LendingOptionsCard } from "@/src/components/charts/LendingOptionsCard";

interface LendingOptionsMessageProps {
  data: {
    options?: Array<{
      id: string;
      title: string;
      loanAmount: number;
      interestRate: number;
      term: number;
      monthlyPayment: number;
      totalInterest: number;
      features: string[];
      recommended?: boolean;
    }>;
    currency?: string;
    userProfile?: {
      creditScore?: number;
      monthlyIncome?: number;
    };
  };
  onUserAction?: ((text: string) => void) | null;
}

export function LendingOptionsMessage({ data, onUserAction }: LendingOptionsMessageProps) {
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleExpand = useCallback((optionId: string) => {
    setExpandedOptionId(optionId);
    setIsExpanded(true);
    if (onUserAction) {
      const option = data.options?.find(opt => opt.id === optionId);
      onUserAction(`User expanded lending option details for ${option?.title}`);
    }
  }, [onUserAction, data.options]);
  
  const handleCollapse = useCallback(() => {
    if (onUserAction) {
      onUserAction(`User collapsed lending option details`);
    }
    setIsExpanded(false);
    setExpandedOptionId(null);
  }, [onUserAction]);
  
  return (
    <div className="w-full mt-2 flex justify-center">
      <div className="w-full max-w-3xl">
        <LendingOptionsCard
          options={data.options}
          currency={data.currency}
          userProfile={data.userProfile}
          onUserAction={onUserAction}
          isExpanded={isExpanded}
          expandedOptionId={expandedOptionId}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          layoutId="lending-options-card"
        />
      </div>
    </div>
  );
}