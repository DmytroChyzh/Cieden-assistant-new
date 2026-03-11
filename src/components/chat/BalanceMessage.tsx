"use client";

import { BalanceCard } from "@/src/components/charts/BalanceCard";

interface BalanceMessageProps {
  data: {
    balance: number;
    previousBalance?: number;
    currency?: string;
  };
  onUserAction?: ((text: string) => void) | null;
}

export function BalanceMessage({ data, onUserAction }: BalanceMessageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here&apos;s your current balance:</p>
      <div className="mt-2 flex justify-center">
        <div className="w-full max-w-3xl">
          <BalanceCard
            balance={data.balance}
            previousBalance={data.previousBalance}
            currency={data.currency || "USD"}
            compact={false}
            onUserAction={onUserAction}
          />
        </div>
      </div>
    </div>
  );
}