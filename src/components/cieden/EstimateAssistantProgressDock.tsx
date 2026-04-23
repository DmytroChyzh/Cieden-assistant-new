"use client";

import { useEffect, useState } from "react";

export type EstimateAssistantProgressDetail = {
  active: boolean;
  title?: string;
  subtitle?: string;
  asked?: number;
  answered?: number;
  total?: number;
  percent?: number;
};

/** Fired from UnifiedChatInput after `--vc-composer-bottom-inset` updates (resize). */
export const VOICE_CHAT_COMPOSER_LAYOUT = "voice-chat-composer-layout";

/**
 * Shown above UnifiedChatInput while EstimateWizardPanel (hidden / assistant mode) is active.
 * Bottom inset for the chat is driven by measuring the full composer root in UnifiedChatInput.
 */
export function EstimateAssistantProgressDock() {
  const [detail, setDetail] = useState<EstimateAssistantProgressDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<EstimateAssistantProgressDetail>).detail;
      if (!d?.active) {
        setDetail(null);
        return;
      }
      setDetail(d);
    };
    window.addEventListener("estimate-assistant-progress", handler as EventListener);
    return () => window.removeEventListener("estimate-assistant-progress", handler as EventListener);
  }, []);

  if (!detail?.active) return null;

  const title = detail.title ?? "Preliminary estimate";
  const subtitle =
    !detail.subtitle || detail.subtitle === "Work with the assistant"
      ? "Answer the questions to complete estimate"
      : detail.subtitle;
  const percent = Math.min(100, Math.max(0, detail.percent ?? 0));
  const asked = Math.max(0, detail.asked ?? 0);
  const answered = Math.max(0, detail.answered ?? 0);
  const total = Math.max(0, detail.total ?? 0);
  const hasSteps = total > 0;
  const clampedAsked = hasSteps ? Math.min(total, asked) : asked;
  const approxLeft = hasSteps ? Math.max(0, total - clampedAsked) : 0;
  const progressLabel =
    percent >= 100
      ? "Estimate ready"
      : hasSteps
        ? clampedAsked > 0
          ? `Progress: ${clampedAsked}/${total} • ${approxLeft} left`
          : `Progress: 0/${total}`
        : "Estimate in progress";

  return (
    <div className="w-full pb-2">
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/95 truncate">{title}</p>
            <p className="text-xs text-white/55 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="mt-3 mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[11px] sm:text-xs text-white/70 truncate">{progressLabel}</p>
          <div className="flex items-center text-[11px] sm:text-xs text-white/60">
            <span className="tabular-nums">{percent}%</span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-[width] duration-500 ease-out shadow-[0_0_12px_rgba(168,85,247,0.45)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
