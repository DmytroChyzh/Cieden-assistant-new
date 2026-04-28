"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClipboardList, Sparkles, CheckCircle2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { EstimateFinalResult } from "./EstimateWizardPanel";
import { getGuestIdentityFromCookie } from "@/src/utils/guestIdentity";
import {
  getEstimateSession,
  getActiveEstimateSessionId,
  startEstimateSession,
} from "@/src/utils/ciedenEstimateSession";
import {
  extractPrimaryEstimateQuestion,
  normalizeAssistantMessage,
} from "@/src/utils/ciedenChatUi";

type EstimateChoice = "assistant" | "quick";

type ThreadRow = {
  _id: Id<"messages"> | string;
  role: "assistant" | "user";
  content?: string;
};

function isEstimateThreadNoiseMessage(row: ThreadRow): boolean {
  if (row.role !== "assistant") return false;
  const lower = String(row.content ?? "").trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("preliminary estimate chooser") ||
    lower.includes("estimate chooser is now available") ||
    lower.includes("please select an option there to proceed") ||
    lower.includes("please select whether you'd like to work with the assistant") ||
    lower.includes("виберіть опцію в картці естімейту") ||
    lower.includes("оберіть варіант у попередньому естімейті")
  );
}

function areAdjacentAssistantEstimatesDuplicate(a: string, b: string): boolean {
  const aq = extractPrimaryEstimateQuestion(a);
  const bq = extractPrimaryEstimateQuestion(b);
  if (aq && bq) {
    const na = normalizeAssistantMessage(aq);
    const nb = normalizeAssistantMessage(bq);
    if (na && nb && na === nb) return true;
  }

  const x = normalizeAssistantMessage(a);
  const y = normalizeAssistantMessage(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const short = x.length <= y.length ? x : y;
  const long = x.length > y.length ? x : y;
  if (short.length < 80) return false;
  const head = short.slice(0, Math.min(360, short.length));
  return long.includes(head);
}

function dedupeAdjacentAssistantEstimateMessages<T extends ThreadRow>(rows: T[]): T[] {
  const out: T[] = [];
  for (const row of rows) {
    if (row.role !== "assistant" || out.length === 0 || out[out.length - 1].role !== "assistant") {
      out.push(row);
      continue;
    }
    const prev = out[out.length - 1];
    if (areAdjacentAssistantEstimatesDuplicate(prev.content || "", row.content || "")) {
      if ((row.content || "").length < (prev.content || "").length) {
        out[out.length - 1] = row;
      }
      continue;
    }
    out.push(row);
  }
  return out;
}

function getEstimateThreadDisplayRows(messages: ThreadRow[] | undefined, sliceFrom: number): ThreadRow[] {
  const raw = (messages ?? [])
    .filter((m) => m.role === "assistant" || m.role === "user")
    .filter((m) => !isEstimateThreadNoiseMessage(m));
  const sliced = raw.slice(sliceFrom);
  return dedupeAdjacentAssistantEstimateMessages(sliced);
}

function fmtUsdRange(min: number, max: number): string {
  const f = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  return `${f(min)}–${f(max)}`;
}

/** Strip model-appended quick-reply JSON array from estimate-thread display. */
function stripEstimateThreadDisplayContent(raw: string): string {
  return String(raw ?? "")
    .replace(/\[ESTIMATE\s+(?:MODE|PANEL)\][^\n]*\n?/gi, "")
    .replace(/\n?\s*\[\s*("[^"]*"\s*,\s*)*"[^"]*"\s*\]\s*$/m, "")
    .trim();
}

/** Improve readability: split summary and next question into separate paragraphs. */
function formatEstimateAssistantDisplayContent(raw: string): string {
  const cleaned = stripEstimateThreadDisplayContent(raw);
  if (!cleaned || cleaned.includes("\n\n")) return cleaned;
  return cleaned.replace(
    /([.!?])\s+(?=(Do|Does|Did|Can|Could|Would|Will|Are|Is|What|Which|Who|When|Where|Why|How|Should|May|Чи|Що|Який|Яка|Які|Як|Коли|Де|Чому|Скільки)\b)/g,
    "$1\n\n",
  );
}

/** Same shell as thread rows — reads as one Assistant message inside Estimate chat. */
function EstimateAssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full justify-start">
      <div className="w-full max-w-[85%]">
        <div className="mb-1.5 text-left text-xs font-medium tracking-wide text-white/48">Assistant</div>
        <div className="rounded-2xl rounded-bl-none bg-white/[0.08] px-4 py-3 text-base leading-7 text-white">
          {children}
        </div>
      </div>
    </div>
  );
}

interface EstimateInlineChooserCardProps {
  messageId?: Id<"messages">;
  conversationId?: Id<"conversations"> | null;
}

export function EstimateInlineChooserCard({ messageId, conversationId = null }: EstimateInlineChooserCardProps) {
  const [choice, setChoice] = useState<EstimateChoice | null>(null);
  const [finalResult, setFinalResult] = useState<EstimateFinalResult | null>(null);
  const [, forceUpdate] = useState(0);
  const estimateChatScrollRef = useRef<HTMLDivElement | null>(null);

  const myId = messageId ? String(messageId) : null;

  const selectedLabel = useMemo(() => {
    if (choice === "assistant") return "Work with the assistant";
    if (choice === "quick") return "Answer a quick questionnaire";
    return null;
  }, [choice]);

  // Check session status from the global map
  const sessionData = myId ? getEstimateSession(myId) : undefined;
  const guestId = getGuestIdentityFromCookie()?.guestId;
  const estimateThreadMessages = useQuery(
    api.messages.list,
    conversationId && sessionData?.threadId
      ? {
          conversationId,
          guestId: guestId ?? undefined,
          includeEstimateThread: true,
          estimateThreadId: sessionData.threadId,
        }
      : "skip",
  );
  const isCompletedSession = sessionData?.status === "completed" || !!finalResult;
  const isCancelledSession = sessionData?.status === "cancelled";
  const isActiveSession = myId === getActiveEstimateSessionId() && sessionData?.status === "active";

  // Determine if this is an old, non-interactive card (previous session)
  const isOldSession = !!sessionData && !isActiveSession && (isCompletedSession || isCancelledSession);

  const estimateThreadScrollKey = useMemo(() => {
    const msgs = estimateThreadMessages ?? [];
    const tail = msgs
      .slice(-8)
      .map((m) => `${String(m._id)}:${(m.content ?? "").length}`)
      .join("|");
    return `${msgs.length}|${tail}|${isCompletedSession ? 1 : 0}`;
  }, [estimateThreadMessages, isCompletedSession]);

  useEffect(() => {
    const el = estimateChatScrollRef.current;
    if (!el) return;
    const scrollToEnd = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(scrollToEnd);
    const t = window.setTimeout(scrollToEnd, 80);
    return () => window.clearTimeout(t);
  }, [estimateThreadScrollKey]);

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
    if (myId) startEstimateSession(myId, next === "quick" ? "quick" : "assistant");

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

  const handleStartOver = () => {
    if (choice !== "assistant") return;
    setFinalResult(null);
    if (myId) startEstimateSession(myId, "assistant");
    forceUpdate((n) => n + 1);
    setChoice("assistant");
    window.dispatchEvent(
      new CustomEvent("estimate-start-over", {
        detail: { messageId: messageId ?? null },
      }),
    );
  };

  const openResultPanel = () => {
    const data = finalResult ?? sessionData?.result ?? (window as any).__lastEstimateFinalResult;
    if (data) {
      window.dispatchEvent(new CustomEvent("estimate-reopen", { detail: data }));
    }
  };

  const completedActions = (
    <div className="mt-4 flex flex-col gap-2">
      <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300/90">
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
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
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 8h2m4 0h4M7 12h10" />
        </svg>
        View estimate result
      </button>
    </div>
  );

  // Active session with a choice made: show selected + cancel
  if (choice) {
    const assistantDone = choice === "assistant" && isCompletedSession;
    const quickDone = choice === "quick" && isCompletedSession;
    const flowDone = assistantDone || quickDone;
    const messageSlice = assistantDone ? -40 : -8;
    const displayThread = getEstimateThreadDisplayRows(estimateThreadMessages as ThreadRow[] | undefined, messageSlice);
    const rawForLang = (estimateThreadMessages ?? []).filter((m) => m.role === "user" || m.role === "assistant");
    const lastUserContent = [...rawForLang].reverse().find((m) => m.role === "user")?.content ?? "";
    const isUa = /[іїєґІЇЄҐ]/.test(lastUserContent);
    const resultForLine = finalResult ?? (sessionData?.result as EstimateFinalResult | undefined);
    const closingSummaryLine =
      assistantDone &&
      resultForLine &&
      Number.isFinite(resultForLine.minPrice) &&
      Number.isFinite(resultForLine.maxPrice)
        ? isUa
          ? `Дякуємо за деталі. Попередній діапазон: ${fmtUsdRange(resultForLine.minPrice, resultForLine.maxPrice)}. Точну пропозицію уточнить менеджер після короткої розмови.`
          : `Thanks for the details. Your preliminary range is about ${fmtUsdRange(resultForLine.minPrice, resultForLine.maxPrice)}. Our managers can refine an exact quote after a short call.`
        : null;

    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em]">
            Preliminary estimate
          </p>
          <div className="mt-3">
            <p className="text-[22px] font-semibold leading-tight text-white/96">{selectedLabel}</p>
            <p className="mt-1.5 text-sm leading-6 text-white/58">
              {flowDone
                ? "Estimate completed successfully."
                : choice === "quick"
                  ? "Questionnaire is open on the right. Fill it step-by-step."
                  : "Assistant will start asking questions in the chat."}
            </p>
            {!flowDone ? (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {choice === "assistant" ? (
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="w-full rounded-xl border border-violet-400/45 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/20 px-4 py-2.5 text-sm font-semibold text-violet-50 hover:from-violet-500/45 hover:to-fuchsia-500/30 hover:border-violet-300/60 transition-all duration-200 cursor-pointer shadow-[0_10px_28px_rgba(139,92,246,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 focus-visible:ring-offset-0"
                    aria-label="Start estimate over from the beginning"
                    aria-disabled={false}
                  >
                    Start over
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/[0.1] hover:border-white/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0"
                  aria-label="Cancel estimate flow"
                  aria-disabled={false}
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {choice === "assistant" ? (
              <div className="mt-4 px-1 py-1">
                <p className="text-[17px] font-semibold leading-6 text-white/86">Estimate chat</p>
                <div
                  ref={estimateChatScrollRef}
                  className="mt-3 max-h-[500px] overflow-y-auto space-y-3 pr-1"
                >
                  {displayThread.map((m) => (
                      <div key={String(m._id)} className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className="w-full max-w-[85%]">
                          <div className={`mb-1.5 text-xs font-medium tracking-wide text-white/48 ${m.role === "user" ? "text-right" : "text-left"}`}>
                            {m.role === "user" ? "You" : "Assistant"}
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-3 text-base leading-7 ${
                              m.role === "assistant"
                                ? "rounded-bl-none bg-white/[0.08] text-white"
                                : "rounded-br-none bg-[#3C2780]/70 text-white"
                            }`}
                          >
                            <span className="whitespace-pre-wrap">
                              {m.role === "assistant"
                                ? formatEstimateAssistantDisplayContent(String(m.content ?? ""))
                                : stripEstimateThreadDisplayContent(String(m.content ?? ""))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  {assistantDone && closingSummaryLine ? (
                    <EstimateAssistantBubble>
                      <p className="leading-7 whitespace-pre-wrap">{closingSummaryLine}</p>
                    </EstimateAssistantBubble>
                  ) : null}
                  {(estimateThreadMessages ?? []).length === 0 ? (
                    <p className="text-sm text-white/55 px-1">
                      Assistant is starting estimate questions...
                    </p>
                  ) : null}
                </div>
                {assistantDone ? (
                  completedActions
                ) : (
                  <p className="mt-3 text-xs text-white/42">
                    Type your answer in the main input below.
                  </p>
                )}
              </div>
            ) : isCompletedSession ? (
              <div className="mt-4">{completedActions}</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Completed quick flow but chooser state was lost (e.g. remount)
  if (isCompletedSession && sessionData?.flow === "quick" && myId) {
    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em]">
            Preliminary estimate
          </p>
          <div className="mt-3">
            <p className="text-[22px] font-semibold leading-tight text-white/96">Answer a quick questionnaire</p>
            <p className="mt-1.5 text-sm leading-6 text-white/58">Estimate completed successfully.</p>
            <div className="mt-4">{completedActions}</div>
          </div>
        </div>
      </div>
    );
  }

  // Completed assistant flow but chooser state was lost (e.g. remount): still show transcript + actions
  if (isCompletedSession && sessionData?.threadId && myId && sessionData.flow !== "quick") {
    const displayRemount = getEstimateThreadDisplayRows(estimateThreadMessages as ThreadRow[] | undefined, -40);
    const rawR = (estimateThreadMessages ?? []).filter((m) => m.role === "user" || m.role === "assistant");
    const lastUserR = [...rawR].reverse().find((m) => m.role === "user")?.content ?? "";
    const isUaR = /[іїєґІЇЄҐ]/.test(lastUserR);
    const resultR = sessionData?.result as EstimateFinalResult | undefined;
    const closingR =
      resultR && Number.isFinite(resultR.minPrice) && Number.isFinite(resultR.maxPrice)
        ? isUaR
          ? `Дякуємо за деталі. Попередній діапазон: ${fmtUsdRange(resultR.minPrice, resultR.maxPrice)}. Точну пропозицію уточнить менеджер після короткої розмови.`
          : `Thanks for the details. Your preliminary range is about ${fmtUsdRange(resultR.minPrice, resultR.maxPrice)}. Our managers can refine an exact quote after a short call.`
        : null;
    return (
      <div className="w-full max-w-[900px] mx-auto">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em]">
            Preliminary estimate
          </p>
          <div className="mt-3">
            <p className="text-[22px] font-semibold leading-tight text-white/96">Work with the assistant</p>
            <p className="mt-1.5 text-sm leading-6 text-white/58">Estimate completed successfully.</p>
            <div className="mt-4 px-1 py-1">
              <p className="text-[17px] font-semibold leading-6 text-white/86">Estimate chat</p>
              <div
                ref={estimateChatScrollRef}
                className="mt-3 max-h-[500px] overflow-y-auto space-y-3 pr-1"
              >
                {displayRemount.map((m) => (
                    <div key={String(m._id)} className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="w-full max-w-[85%]">
                        <div className={`mb-1.5 text-xs font-medium tracking-wide text-white/48 ${m.role === "user" ? "text-right" : "text-left"}`}>
                          {m.role === "user" ? "You" : "Assistant"}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-base leading-7 ${
                            m.role === "assistant"
                              ? "rounded-bl-none bg-white/[0.08] text-white"
                              : "rounded-br-none bg-[#3C2780]/70 text-white"
                          }`}
                        >
                          <span className="whitespace-pre-wrap">
                            {m.role === "assistant"
                              ? formatEstimateAssistantDisplayContent(String(m.content ?? ""))
                              : stripEstimateThreadDisplayContent(String(m.content ?? ""))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {closingR ? (
                  <EstimateAssistantBubble>
                    <p className="leading-7 whitespace-pre-wrap">{closingR}</p>
                  </EstimateAssistantBubble>
                ) : null}
              </div>
              {completedActions}
            </div>
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
