"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Sparkles } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { EstimateFinalResult } from "./EstimateWizardPanel";

type EstimateChoice = "assistant" | "quick";

interface EstimateInlineChooserCardProps {
  messageId?: Id<"messages">;
}

export function EstimateInlineChooserCard({ messageId }: EstimateInlineChooserCardProps) {
  const [choice, setChoice] = useState<EstimateChoice | null>(null);
  const [finalResult, setFinalResult] = useState<EstimateFinalResult | null>(null);

  const selectedLabel = useMemo(() => {
    if (choice === "assistant") return "Work with the assistant";
    if (choice === "quick") return "Answer a quick questionnaire";
    return null;
  }, [choice]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ token?: number } & EstimateFinalResult>).detail;
      if (!detail) return;

      // Update chat card when final numbers are ready.
      const { token: _token, ...rest } = detail;
      setFinalResult(rest as EstimateFinalResult);
    };

    window.addEventListener("estimate-final-ready", handler as EventListener);
    return () => window.removeEventListener("estimate-final-ready", handler as EventListener);
  }, []);

  const dispatchChoose = (next: EstimateChoice) => {
    if (choice) return; // prevent duplicate dispatch after selection
    setChoice(next);

    window.dispatchEvent(
      new CustomEvent(next === "quick" ? "estimate-choose-quick" : "estimate-choose-assistant", {
        detail: { messageId: messageId ?? null },
      }),
    );
  };

  const priceText =
    finalResult
      ? `${finalResult.minPrice.toLocaleString()} – ${finalResult.maxPrice.toLocaleString()}`
      : null;

  const hoursText = (() => {
    if (!finalResult) return null;
    if (typeof finalResult.totalHours === "number") return `${Math.round(finalResult.totalHours)} hrs`;
    if (typeof finalResult.minHours === "number" && typeof finalResult.maxHours === "number") {
      return `${finalResult.minHours}–${finalResult.maxHours} hrs`;
    }
    return "— hrs";
  })();

  const handleCancel = () => {
    setChoice(null);
    setFinalResult(null);
    window.dispatchEvent(new CustomEvent("estimate-cancel"));
  };

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {finalResult ? (
        <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] to-violet-600/[0.08] backdrop-blur-md p-4 shadow-[0_0_32px_rgba(99,102,241,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-300" aria-hidden />
                <p className="text-sm font-semibold text-white/90">Estimate result (in chat)</p>
              </div>
              <p className="mt-1 text-xs text-white/45">Side panel also shows the same final numbers.</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-3xl font-bold text-white leading-none">
              ${priceText}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1 text-[12px] font-medium text-white/75">
                <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                {hoursText}
              </span>
              {typeof finalResult.weeks === "number" && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1 text-[12px] font-medium text-white/75">
                  {finalResult.weeks} weeks
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
            Preliminary estimate
          </p>

          {choice ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-white/90">{selectedLabel}</p>
              <p className="mt-1 text-xs text-white/50">
                {choice === "quick"
                  ? "Questionnaire is open on the right. Fill it step-by-step."
                  : "Assistant will start asking questions in the chat."}
              </p>

              <button
                type="button"
                onClick={handleCancel}
                className="mt-3 w-full rounded-xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/[0.08] hover:border-white/[0.2] transition-colors cursor-pointer"
                aria-label="Cancel estimate flow"
                aria-disabled={false}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => dispatchChoose("assistant")}
                className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-4 py-4 text-left hover:bg-white/[0.09] hover:border-white/[0.28] transition-all cursor-pointer shadow-[0_14px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] min-h-[130px]"
                aria-label="Work with the assistant"
                aria-disabled={false}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/[0.08] px-2 py-2 text-violet-200">
                    <Sparkles className="w-4 h-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/95">Work with the assistant</p>
                    <p className="mt-1 text-xs text-white/65">
                      Describe your project. Assistant asks only what is needed.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => dispatchChoose("quick")}
                className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-4 py-4 text-left hover:bg-white/[0.09] hover:border-white/[0.28] transition-all cursor-pointer shadow-[0_14px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] min-h-[130px]"
                aria-label="Answer a quick questionnaire"
                aria-disabled={false}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-violet-500/20 px-2 py-2 text-violet-200">
                    <ClipboardList className="w-4 h-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/95">Answer a quick questionnaire</p>
                    <p className="mt-1 text-xs text-white/65">
                      Step-by-step inputs on the right panel.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

