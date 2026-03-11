"use client";

import { SavingsCarousel } from "@/src/components/charts/SavingsCarousel";
import { Id } from "@/convex/_generated/dataModel";

interface SavingsMessageProps {
  data: {
    goalId?: Id<"savingsGoals"> | string;
    currentSavings: number;
    goalAmount: number;
    goalName?: string;
    currency?: string;
    deadline?: string;
    monthlyTarget?: number;
  };
  onUserAction?: ((text: string) => void) | null;
}

export function SavingsMessage({ data, onUserAction }: SavingsMessageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here&apos;s your savings progress:</p>
      {/* Center the savings carousel nicely within the message card */}
      <div className="mt-2 flex justify-center">
        <div className="w-full max-w-3xl">
          <SavingsCarousel
            key={`carousel-${data.goalId || 'default'}-${onUserAction ? 'active' : 'inactive'}`}
            goalId={data.goalId}
            initialData={{
              currentSavings: data.currentSavings,
              goalAmount: data.goalAmount,
              goalName: data.goalName,
              currency: data.currency || "USD",
              deadline: data.deadline,
              monthlyTarget: data.monthlyTarget
            }}
            onUserAction={onUserAction}
          />
        </div>
      </div>
    </div>
  );
}