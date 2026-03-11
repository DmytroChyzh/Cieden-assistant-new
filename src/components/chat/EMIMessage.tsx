"use client";

import { EMICard } from "@/src/components/charts/EMICard";

interface EMIMessageProps {
  data: {
    loanAmount: number;
    interestRate: number;
    termMonths: number;
    emi: number;
    currency?: string;
    principal?: number;
    interest?: number;
    totalAmount?: number;
    loanType?: string;
    simpleExample?: boolean;
  };
  onUserAction?: ((text: string) => void) | null;
}

export function EMIMessage({ data, onUserAction }: EMIMessageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here&apos;s your EMI calculation:</p>
      <div className="mt-2 flex justify-center">
        <div className="w-full max-w-3xl">
          <EMICard
            loanAmount={data.loanAmount}
            interestRate={data.interestRate}
            termMonths={data.termMonths}
            emi={data.emi}
            currency={data.currency}
            principal={data.principal}
            interest={data.interest}
            totalAmount={data.totalAmount}
            loanType={data.loanType}
            simpleExample={data.simpleExample}
            onUserAction={onUserAction}
          />
        </div>
      </div>
    </div>
  );
}