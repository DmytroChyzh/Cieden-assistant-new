"use client";
import { useEffect } from "react";
import { RegularMessage } from "./RegularMessage";
import {
  BestCaseCard,
  EngagementModelsCard,
  CasesGrid,
  AboutCiedenCard,
  ProcessTimelineCard,
  GettingStartedCard,
  SupportCard,
  CASES,
} from "@/src/components/cieden/SalesUi";
import SimilarCasesResultCard from "@/src/components/cieden/SimilarCasesResultCard";
import type { FindSimilarCasesToolPayload } from "@/src/lib/case-studies/types";
import { ProjectBriefCard } from "@/src/components/cieden/ProjectBriefCard";
import { NextStepsCard } from "@/src/components/cieden/NextStepsCard";
import { BookCallCard } from "@/src/components/cieden/BookCallCard";
import { SessionSummaryCard } from "@/src/components/cieden/SessionSummaryCard";
import { parseToolCall } from '@/src/utils/parseToolCall';
import { isCiedenEstimateSessionCompleted } from "@/src/utils/ciedenEstimateSession";
import type { Id } from "@/convex/_generated/dataModel";
import { ClipboardList, ChevronRight } from "lucide-react";
import { EstimateInlineChooserCard } from "@/src/components/cieden/EstimateInlineChooserCard";

interface ToolCallMessageRendererProps {
  content: string;
  onUserAction?: ((text: string) => void) | null;
  messageId?: Id<"messages">;
  conversationId?: Id<"conversations"> | null;
}

export function ToolCallMessageRenderer({
  content,
  onUserAction,
  messageId,
  conversationId,
}: ToolCallMessageRendererProps) {
  const toolCall = parseToolCall(content);
  const toolName = toolCall?.toolName ?? null;
  const data = toolCall?.data;

  const findDomainFromFilter = (filter: unknown): string | null => {
    if (!filter || typeof filter !== "string") return null;
    const needle = filter.trim().toLowerCase();
    if (!needle) return null;

    const allDomains = Array.from(new Set(CASES.flatMap((c) => c.domain)));
    const exact = allDomains.find((d) => d.toLowerCase() === needle);
    if (exact) return exact;

    const includes = allDomains
      .filter((d) => {
        const hay = d.toLowerCase();
        return hay.includes(needle) || needle.includes(hay);
      })
      .sort((a, b) => a.length - b.length);

    return includes[0] ?? null;
  };

  const desiredDomain =
    toolName === "show_cases" ? findDomainFromFilter((data as any)?.filter) : null;

  const similarCasesDedupKey =
    toolName === "find_similar_cases" &&
    data &&
    typeof data === "object" &&
    Array.isArray((data as FindSimilarCasesToolPayload).results)
      ? (data as FindSimilarCasesToolPayload).results.map((r) => r.id).join(",")
      : "";

  // Auto-open cases panel only once per tool message.
  // IMPORTANT: never dispatch in render, otherwise the user can't close the panel.
  useEffect(() => {
    if (!toolCall) return;
    if (toolName !== "show_cases") return;
    if (!desiredDomain) return;
    if (typeof window === "undefined") return;
    if ((window as any).__ciedenEstimatePanelOpen === true) return;

    const isOpen = !!(window as any).__ciedenCasesPanelOpen;
    if (isOpen) return;

    const userClosed = (window as any).__ciedenCasesPanelUserClosed;
    const lastDismissed = (window as any).__ciedenCasesPanelLastDismissedDomain;
    const closedAt = (window as any).__ciedenCasesPanelClosedAt as number | undefined;

    // Cooldown: prevents instant reopen right after user closes the panel.
    if (userClosed && typeof closedAt === "number" && Date.now() - closedAt < 10000) {
      return;
    }
    if (userClosed && lastDismissed === desiredDomain) return;

    window.dispatchEvent(
      new CustomEvent("open-cases-panel", { detail: { domain: desiredDomain } }),
    );
  }, [toolCall, toolName, desiredDomain]);

  if (toolCall?.mode === "update") return null;
  if (!toolCall) return <RegularMessage content={content} />;

  // Block generate_estimate tool card when session already completed (prevents dups)
  if (toolName === "generate_estimate" && isCiedenEstimateSessionCompleted()) {
    return null;
  }

  // Each open_calculator card represents a session boundary.
  // All cards render — EstimateInlineChooserCard handles its own state (fresh/active/completed/cancelled).

  switch (toolName) {
    case "show_cases":
      return desiredDomain ? (
        <div className="w-full max-w-[900px] mx-auto font-[Gilroy]">
          <div className="text-sm text-white/70">Showing {desiredDomain} case studies...</div>
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              (window as any).__ciedenCasesPanelUserClosed = false;
              (window as any).__ciedenCasesPanelOpen = true;
              (window as any).__ciedenCasesPanelOpenDomain = desiredDomain;
              window.dispatchEvent(
                new CustomEvent("open-cases-panel", { detail: { domain: desiredDomain } }),
              );
            }}
            className="mt-3 w-full group text-left rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent backdrop-blur-sm px-5 py-4 text-sm font-medium text-white/90 hover:border-violet-400/50 hover:from-violet-500/25 transition-all cursor-pointer shadow-[0_0_24px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
            aria-label={`Open ${desiredDomain} cases`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 rounded-xl bg-violet-500/20 p-2 text-violet-200/90 group-hover:bg-violet-500/30 transition-colors">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 truncate">Open {desiredDomain} cases</span>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-violet-200/90 group-hover:text-violet-100 transition-colors">
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[900px] mx-auto font-[Gilroy]">
          <CasesGrid />
        </div>
      );

    case "show_best_case":
      return (
        <div className="w-full max-w-4xl mx-auto">
          <BestCaseCard />
        </div>
      );

    case "find_similar_cases": {
      const payload = data as FindSimilarCasesToolPayload;
      if (!payload?.results?.length) {
        return (
          <div className="text-sm text-white/60 italic" aria-live="polite">
            No similar cases were returned for this message.
          </div>
        );
      }
      return (
        <SimilarCasesResultCard payload={payload} onUserAction={onUserAction} />
      );
    }

    case "show_engagement_models":
      return (
        <div className="w-full max-w-4xl mx-auto">
          <EngagementModelsCard />
        </div>
      );

    case "generate_estimate":
    case "open_calculator":
      return <EstimateInlineChooserCard messageId={messageId} conversationId={conversationId} />;

    case "show_about":
      return (
        <div className="w-full max-w-4xl mx-auto">
          <AboutCiedenCard />
        </div>
      );

    case "show_process":
      return (
        <div className="w-full max-w-4xl mx-auto">
          <ProcessTimelineCard />
        </div>
      );

    case "show_getting_started":
      return (
        <div className="w-full max-w-[900px] mx-auto">
          <GettingStartedCard />
        </div>
      );

    case "show_support":
      return (
        <div className="w-full max-w-[900px] mx-auto">
          <SupportCard />
        </div>
      );

    case "show_project_brief":
      return (
        <div className="w-full max-w-[900px] mx-auto">
          <ProjectBriefCard data={data} />
        </div>
      );

    case "show_next_steps":
      return (
        <div className="w-full max-w-[900px] mx-auto">
          <NextStepsCard data={data} />
        </div>
      );

    case "book_call":
      return (
        <div className="w-full max-w-[900px] mx-auto">
          <BookCallCard />
        </div>
      );

    case "show_session_summary": {
      const hasData =
        data &&
        (data.projectName ||
          (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) ||
          (Array.isArray(data.decisions) && data.decisions.length > 0) ||
          (Array.isArray(data.openQuestions) && data.openQuestions.length > 0) ||
          data.recommendedNextStep);

      if (!hasData) {
        return (
          <div className="text-sm text-white/60 italic">
            I’m not ready to show a session summary yet — I need a bit more information about your
            project and decisions before I can create it.
          </div>
        );
      }

      return (
        <div className="w-full max-w-4xl mx-auto">
          <SessionSummaryCard data={data} />
        </div>
      );
    }

    default:
      return (
        <div className="text-sm text-white/50 italic">
          This action is no longer available.
        </div>
      );
  }
}
