"use client";
import { RegularMessage } from "./RegularMessage";
import {
  BestCaseCard,
  EngagementModelsCard,
  CasesGrid,
  AboutCiedenCard,
  ProcessTimelineCard,
  GettingStartedCard,
  SupportCard,
} from "@/src/components/cieden/SalesUi";
import { ProjectBriefCard } from "@/src/components/cieden/ProjectBriefCard";
import { NextStepsCard } from "@/src/components/cieden/NextStepsCard";
import { SessionSummaryCard } from "@/src/components/cieden/SessionSummaryCard";
import { parseToolCall } from '@/src/utils/parseToolCall';
import type { Id } from "@/convex/_generated/dataModel";
import { ClipboardList, ChevronRight } from "lucide-react";

interface ToolCallMessageRendererProps {
  content: string;
  onUserAction?: ((text: string) => void) | null;
  messageId?: Id<"messages">;
}

export function ToolCallMessageRenderer({
  content,
  onUserAction,
  messageId
}: ToolCallMessageRendererProps) {
  const toolCall = parseToolCall(content);

  if (toolCall?.mode === 'update') {
    return null;
  }

  if (toolCall) {
    const { toolName, data } = toolCall;

    switch (toolName) {
      case 'show_cases':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <CasesGrid />
          </div>
        );

      case 'show_best_case':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <BestCaseCard />
          </div>
        );

      case 'show_engagement_models':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <EngagementModelsCard />
          </div>
        );

      case 'generate_estimate':
      case 'open_calculator':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-estimate-panel"))}
              className="group w-full text-left rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent p-5 hover:border-violet-400/50 hover:from-violet-500/25 transition-all duration-300 ring-1 ring-inset ring-white/[0.06] cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl bg-violet-500/25 p-3 text-violet-300 group-hover:bg-violet-500/35 transition-colors">
                  <ClipboardList className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold text-white/95">
                    Preliminary estimate — short questionnaire
                  </h4>
                  <p className="mt-1 text-sm text-white/60 leading-relaxed">
                    Answer 3–4 quick questions (project type, complexity) and get an approximate price range. Opens in the side panel.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 group-hover:text-violet-200 transition-colors">
                    Open questionnaire
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                  </span>
                </div>
              </div>
            </button>
          </div>
        );

      case 'show_about':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <AboutCiedenCard />
          </div>
        );

      case 'show_process':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <ProcessTimelineCard />
          </div>
        );

      case 'show_getting_started':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <GettingStartedCard />
          </div>
        );

      case 'show_support':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <SupportCard />
          </div>
        );

      // New Cieden assistant utilities
      case 'show_project_brief':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <ProjectBriefCard data={data} />
          </div>
        );

      case 'show_next_steps':
        return (
          <div className="w-full max-w-3xl mx-auto">
            <NextStepsCard data={data} />
          </div>
        );

      case 'show_session_summary': {
        const hasData =
          data &&
          (data.projectName ||
            (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) ||
            (Array.isArray(data.decisions) && data.decisions.length > 0) ||
            (Array.isArray(data.openQuestions) && data.openQuestions.length > 0) ||
            data.recommendedNextStep);

        if (!hasData) {
          // No structured summary yet – show a lightweight helper text instead of an empty card.
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

  return <RegularMessage content={content} />;
}
