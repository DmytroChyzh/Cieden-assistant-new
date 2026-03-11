"use client";

import React from "react";

const TOTAL_STEPS = 5;

interface EstimateProgressBarProps {
  /** Current question/step (1-based). */
  currentStep: number;
  /** Total steps (default 5). */
  totalSteps?: number;
  /** Whether the estimate flow is active (show bar). */
  isActive: boolean;
  /** Optional language. */
  language?: "uk" | "en";
  /** Optional class name. */
  className?: string;
}

export const EstimateProgressBar: React.FC<EstimateProgressBarProps> = ({
  currentStep,
  totalSteps = TOTAL_STEPS,
  isActive,
  language = "en",
  className = "",
}) => {
  if (!isActive) return null;

  const step = Math.min(Math.max(1, currentStep), totalSteps);
  const percent = Math.round((step / totalSteps) * 100);

  return (
    <div
      className={`flex flex-col gap-1.5 px-4 py-3 bg-black/40 rounded-xl border border-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={
        language === "uk"
          ? `Питання ${step} з ${totalSteps}, естімейт`
          : `Question ${step} of ${totalSteps}, estimate progress`
      }
    >
      <div className="flex items-center justify-between text-sm text-white/90">
        <span>
          {language === "uk" ? `Питання` : "Question"} {step} / {totalSteps}
        </span>
        <span>{percent}% {language === "uk" ? "готово" : "complete"}</span>
      </div>
      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default EstimateProgressBar;
