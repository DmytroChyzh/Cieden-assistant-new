"use client";

import { LoansCard } from "@/src/components/charts/LoansCard";

interface LoansMessageProps {
  data: {
    totalLoans: number;
    paidAmount: number;
    currency?: string;
    monthlyData?: Array<{
      month: string;
      amount: number;
      isPaid?: boolean;
    }>;
  };
  onUserAction?: ((text: string) => void) | null;
}

export function LoansMessage({ data, onUserAction }: LoansMessageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here&apos;s your loan payment overview:</p>
      <div className="mt-2 flex justify-center">
        <div className="w-full max-w-3xl">
          <LoansCard
            totalLoans={data.totalLoans}
            paidAmount={data.paidAmount}
            currency={data.currency || "USD"}
            monthlyData={data.monthlyData}
            onUserAction={onUserAction}
          />
        </div>
      </div>
    </div>
  );
}