"use client";

import { useEffect, useState } from "react";

export type EstimateAssistantProgressDetail = {
  active: boolean;
  title?: string;
  subtitle?: string;
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
  const subtitle = detail.subtitle ?? "Work with the assistant";
  const answered = detail.answered ?? 0;
  const total = detail.total ?? 9;
  const percent = Math.min(100, Math.max(0, detail.percent ?? 0));
  const remaining = Math.max(0, total - answered);

  return (
    <div className="w-full pb-2">
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/95 truncate">{title}</p>
            <p className="text-xs text-white/55 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/60 mt-3 mb-1.5">
          <span className="tabular-nums">
            Question <span className="text-white/80 font-medium">{answered}</span> / {total}
          </span>
          <span className="tabular-nums">{percent}% complete</span>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-[width] duration-500 ease-out shadow-[0_0_12px_rgba(168,85,247,0.45)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        {remaining > 0 ? (
          <p className="text-[11px] text-white/45 mt-2">
            About <span className="text-white/65 font-medium">{remaining}</span> more
            {remaining === 1 ? " topic" : " topics"} to cover with the assistant
          </p>
        ) : null}
      </div>
    </div>
  );
}
