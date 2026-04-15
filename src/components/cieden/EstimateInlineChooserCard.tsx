"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Sparkles, CheckCircle2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { EstimateFinalResult } from "./EstimateWizardPanel";
import {
  getEstimateSession,
  getActiveEstimateSessionId,
  startEstimateSession,
} from "@/src/utils/ciedenEstimateSession";

type EstimateChoice = "assistant" | "quick";

interface EstimateInlineChooserCardProps {
  messageId?: Id<"messages">;
}

export function EstimateInlineChooserCard({ messageId }: EstimateInlineChooserCardProps) {
  const [choice, setChoice] = useState<EstimateChoice | null>(null);
  const [finalResult, setFinalResult] = useState<EstimateFinalResult | null>(null);
  const [, forceUpdate] = useState(0);

  const myId = messageId ? String(messageId) : null;

  const selectedLabel = useMemo(() => {
    if (choice === "assistant") return "Work with the assistant";
    if (choice === "quick") return "Answer a quick questionnaire";
    return null;
  }, [choice]);

  // Check session status from the global map
  const sessionData = myId ? getEstimateSession(myId) : undefined;
  const isCompletedSession = sessionData?.status === "completed" || !!finalResult;
  const isCancelledSession = sessionData?.status === "cancelled";
  const isActiveSession = myId === getActiveEstimateSessionId() && sessionData?.status === "active";

  // Determine if this is an old, non-interactive card (previous session)
  const isOldSession = !!sessionData && !isActiveSession && (isCompletedSession || isCancelledSession);

  useEffect(() => {
    const handleCancel = () => {
      if (myId === getActiveEstimateSessionId()) {
        setChoice(null);
        setFinalResult(null);
      }
    };

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ token?: number } & EstimateFinalResult>).detail;
      if (!detail) return;
      // Only set result if this is the active session's card
      if (myId === getActiveEstimateSessionId()) {
        const { token: _token, ...rest } = detail;
        setFinalResult(rest as EstimateFinalResult);
      }
    };

    const handlePanelClosed = () => {
      forceUpdate((n) => n + 1);
    };

    window.addEventListener("estimate-cancel", handleCancel as EventListener);
    window.addEventListener("estimate-final-ready", handler as EventListener);
    window.addEventListener("estimate-panel-closed", handlePanelClosed);
    return () => {
      window.removeEventListener("estimate-cancel", handleCancel as EventListener);
      window.removeEventListener("estimate-final-ready", handler as EventListener);
      window.removeEventListener("estimate-panel-closed", handlePanelClosed);
    };
  }, [myId]);

  const dispatchChoose = (next: EstimateChoice) => {
    if (choice || isOldSession) return;
    setChoice(next);

    // Register this card as the active session
    if (myId) startEstimateSession(myId);

    window.dispatchEvent(
      new CustomEvent(next === "quick" ? "estimate-choose-quick" : "estimate-choose-assistant", {
        detail: { messageId: messageId ?? null },
      }),
    );
  };

  const handleCancel = () => {
    setChoice(null);
    setFinalResult(null);
    window.dispatchEvent(new CustomEvent("estimate-cancel"));
  };

  const openResultPanel = () => {
    const data = finalResult ?? sessionData?.result ?? (window as any).__lastEstimateFinalResult;
    if (data) {
      window.dispatchEvent(new CustomEvent("estimate-reopen", { detail: data }));
    }
  };

  // Completed state: show badge + reopen button
  if (isCompletedSession) {
    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
            Preliminary estimate
          </p>
          <div className="mt-3">
            <p className="text-sm font-semibold text-white/90">{selectedLabel ?? "Work with the assistant"}</p>
            <p className="mt-1 text-xs text-white/50">Estimate completed successfully.</p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300/90">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
              <button
                type="button"
                onClick={openResultPanel}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/40 to-indigo-600/40 hover:from-purple-600/60 hover:to-indigo-600/60 border border-purple-400/20 px-4 py-2.5 text-sm font-medium text-white transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/15"
                aria-label="View estimate result"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" /><path d="M12 17v4" />
                  <path d="M7 8h2m4 0h4M7 12h10" />
                </svg>
                View estimate result
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active session with a choice made: show selected + cancel
  if (choice) {
    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
            Preliminary estimate
          </p>
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
        </div>
      </div>
    );
  }

  // Fresh card: show choice buttons (only if not old cancelled session)
  if (isCancelledSession) {
    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
            Preliminary estimate
          </p>
          <div className="mt-3">
            <p className="text-sm text-white/50">Cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[900px] mx-auto">
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
          Preliminary estimate
        </p>
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
      </div>
    </div>
  );
}
