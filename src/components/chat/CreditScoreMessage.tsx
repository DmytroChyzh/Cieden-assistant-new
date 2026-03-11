"use client";

import { CreditScoreCard } from "@/src/components/charts/CreditScoreCard";

interface CreditScoreMessageProps {
  data: {
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
  };
  onUserAction?: ((text: string) => void) | null;
}

export function CreditScoreMessage({ data, onUserAction }: CreditScoreMessageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here&apos;s your credit score overview:</p>
      <div className="mt-2 flex justify-center">
        <div className="w-full max-w-3xl">
          <CreditScoreCard
            score={data.score}
            range={data.range}
            factors={data.factors}
            lastUpdated={data.lastUpdated}
            provider={data.provider}
            tips={data.tips}
            onUserAction={onUserAction}
          />
        </div>
      </div>
    </div>
  );
}