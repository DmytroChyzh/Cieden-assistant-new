"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  markCiedenEstimateSessionCompleted,
  isCiedenEstimateSessionCompleted,
} from "@/src/utils/ciedenEstimateSession";
import { ToolCallMessageRenderer } from "./ToolCallMessageRenderer";
import { Id } from "@/convex/_generated/dataModel";
import { parseToolCall } from "@/src/utils/parseToolCall";

interface MessageCardProps {
  message: {
    _id: Id<"messages">;
    role: "user" | "assistant" | "system";
    content: string;
    source?: "voice" | "text" | "contextual" | "websocket" | "webrtc";
  };
  onUserAction?: ((text: string) => void) | null;
  compact?: boolean;
}

export function MessageCard({ message, onUserAction, compact = false }: MessageCardProps) {
  const toolCall = parseToolCall(message.content);
  const isToolMessage = !!toolCall;
  const isUser = message.role === "user";

  const hasExplicitEstimateResult = !isUser && /ESTIMATE_PANEL_RESULT:\s*\{/.test(message.content);

  // Also detect final estimate text (no ESTIMATE_PANEL_RESULT marker, but has estimate content)
  const looksLikeFinalEstimate = useMemo(() => {
    if (isUser || hasExplicitEstimateResult) return false;
    if (message.content.length < 150) return false;
    if (message.content.trim().endsWith("?")) return false;
    const lower = message.content.toLowerCase();
    const hasEstimateWords = /(попередн|preliminary|оцінк|estimate|вартіст|cost|бюджет|budget|підсум|summar)/i.test(lower);
    const hasNumbers = /\$\s?\d|\d[\d,.\s]*(usd|грн|eur)/.test(lower) || /\d{2,}/.test(message.content);
    return hasEstimateWords && hasNumbers;
  }, [isUser, hasExplicitEstimateResult, message.content]);

  const hasCachedEstimate = typeof window !== "undefined" && !!(window as any).__lastEstimateFinalResult;
  const showEstimateButton = hasExplicitEstimateResult || (looksLikeFinalEstimate && hasCachedEstimate);

  useEffect(() => {
    if (message.role !== "assistant") return;
    if (!/ESTIMATE_PANEL_RESULT:\s*\{/.test(message.content)) return;
    markCiedenEstimateSessionCompleted();
  }, [message._id, message.role, message.content]);

  const estimateResultData = useMemo(() => {
    if (!hasExplicitEstimateResult) return null;
    const match = message.content.match(/ESTIMATE_PANEL_RESULT:\s*(\{[\s\S]*?\})/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }, [hasExplicitEstimateResult, message.content]);

  const openEstimatePanel = useCallback(() => {
    const data = estimateResultData ?? (window as any).__lastEstimateFinalResult;
    if (!data) return;
    window.dispatchEvent(
      new CustomEvent("estimate-reopen", { detail: data }),
    );
  }, [estimateResultData]);

  const displayContent = message.content
    .replace(/ESTIMATE_PANEL_RESULT:\s*\{[\s\S]*?\}(?=\s|$)/g, "")
    .replace(/\[ESTIMATE\s+(?:MODE|PANEL)\][^\n]*\n?/gi, "")
    .replace(/(?:^|\n)\s*(?:ENTER\s+)?ESTIMATE\s+MODE[^\n]*\n?/gi, "\n")
    .replace(/(?:^|\n)\s*EXIT\s+ESTIMATE\s+MODE[^\n]*\n?/gi, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, idx, arr) => !(l.trim() === "" && (arr[idx - 1]?.trim() === "")))
    .join("\n")
    .trim();

  // Don't hide open_calculator cards — EstimateInlineChooserCard handles its own
  // completed/cancelled/active state per-session. Only hide generate_estimate dupes.
  if (
    toolCall &&
    toolCall.toolName === "generate_estimate" &&
    isCiedenEstimateSessionCompleted()
  ) {
    return null;
  }

  // Chatbot-style bubbles for regular text messages (user/assistant)
  if (!isToolMessage && (message.role === "user" || message.role === "assistant")) {
    return (
      <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        <div className="w-full flex justify-center px-4 lg:px-0">
          <div
            className="relative max-w-2xl w-full"
            style={{ maxWidth: 900 }}
          >
            {/* Label */}
            <div
              className={`flex items-center mb-1 text-xs text-white/60 ${
                isUser ? "justify-end" : "justify-start"
              }`}
              style={{ minHeight: 18 }}
            >
              {isUser ? (
                <>
                  <span>You</span>
                  <svg
                    className="ml-1"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                  </svg>
                </>
              ) : (
                <>
                  <svg
                    className="mr-1"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="10" rx="4" />
                    <circle cx="7.5" cy="16" r="1.5" />
                    <circle cx="16.5" cy="16" r="1.5" />
                    <path d="M12 2v4m-6 4V6m12 4V6" />
                  </svg>
                  <span>Assistant</span>
                </>
              )}
            </div>

            {/* Bubble with full glassmorphism effect — sharp corner: user = bottom-right, assistant = bottom-left */}
            <div
              className={`rounded-3xl px-5 py-4 shadow-lg transition-colors duration-300 backdrop-blur-xl ring-1 ring-white/10 ${
                isUser
                  ? "rounded-br-none bg-[#3C2780]/70 text-white shadow-[0_18px_45px_-20px_rgba(60,39,128,0.9)]"
                  : "rounded-bl-none bg-white/8 text-white shadow-[0_18px_45px_-20px_rgba(0,0,0,0.85)]"
              }`}
            >
              <div className={compact ? "text-sm" : "text-sm md:text-base"}>
                <p className="text-white leading-6 whitespace-pre-wrap break-words">
                  {displayContent}
                </p>
              </div>
              {showEstimateButton && (
                <button
                  onClick={openEstimatePanel}
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500/90 hover:to-indigo-500/90 text-white text-sm font-medium shadow-lg ring-1 ring-white/15 transition-all duration-200 hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" /><path d="M12 17v4" />
                    <path d="M7 8h2m4 0h4M7 12h10" />
                  </svg>
                  {/[іїєґІЇЄҐ]/.test(displayContent) ? "Переглянути деталі оцінки" : "View estimate details"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card layout for tool calls — той самий контейнер, що й бульбашки (картки на рівні з повідомленнями)
  const wrapperJustify =
    message.role === "user"
      ? "justify-end"
      : isToolMessage && compact
      ? "justify-center"
      : "justify-start";

  const isEngagementModelsTool = isToolMessage && toolCall?.toolName === "show_engagement_models";
  const isCasesTool = isToolMessage && toolCall?.toolName === "show_cases";
  const isAboutTool = isToolMessage && toolCall?.toolName === "show_about";
  const isProcessTool = isToolMessage && toolCall?.toolName === "show_process";
  const isGettingStartedTool = isToolMessage && toolCall?.toolName === "show_getting_started";
  const isProjectBriefTool = isToolMessage && toolCall?.toolName === "show_project_brief";
  const isNextStepsTool = isToolMessage && toolCall?.toolName === "show_next_steps";
  const isBookCallTool = isToolMessage && toolCall?.toolName === "book_call";
  const isSupportTool = isToolMessage && toolCall?.toolName === "show_support";
  const isEstimateTool =
    isToolMessage &&
    (toolCall?.toolName === "open_calculator" || toolCall?.toolName === "generate_estimate");
  const cardBackdrop = isEngagementModelsTool ? "" : "backdrop-blur-xl";

  const cardClassName = `w-full ${cardBackdrop} transition-all duration-200 text-white ${
    message.role === "user"
      ? "bg-white/[0.12] border-white/[0.2] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
      : isEngagementModelsTool
      ? "bg-transparent border-transparent shadow-none hover:shadow-none ring-0"
      : "bg-white/[0.06] border-white/[0.12] shadow-xl shadow-purple-500/5 hover:shadow-purple-500/15 ring-1 ring-inset ring-white/[0.05]"
  }`;

  const toolContentPaddingClass = compact
    ? "p-2"
    : isToolMessage
    ? "px-2 py-4 sm:p-4 lg:p-5 xl:p-6"
    : "p-4 lg:p-5 xl:p-6";

  // Some tools (engagement models, about, process, project brief, next steps, support) already render their own rich Card
  // styling. We must not wrap them again with this generic Card container,
  // otherwise we get duplicated "background" / frame.
  if (
    isCasesTool ||
    isEngagementModelsTool ||
    isAboutTool ||
    isProcessTool ||
    isGettingStartedTool ||
    isProjectBriefTool ||
    isNextStepsTool ||
    isBookCallTool ||
    isEstimateTool ||
    isSupportTool
  ) {
    // Inline maxWidth only — do NOT add Tailwind max-w-* here; it caps below these px values
    // (e.g. max-w-4xl = 896px blocked 1200px cards). Wider than default chat bubbles (900px).
    // Brief + Next steps + Support: same width as chat column / bubbles (900px); inner ToolCallMessageRenderer also uses max-w-[900px].
    const toolWrapperMaxWidth = isProjectBriefTool || isNextStepsTool || isSupportTool || isBookCallTool
      || isGettingStartedTool
      || isCasesTool
      || isEstimateTool
      ? 900
      : isProcessTool || isAboutTool
        ? 1280
        : 1024;

    const toolWrapperPaddingClass =
      isGettingStartedTool || isCasesTool || isBookCallTool || isEstimateTool ? "px-0" : "px-2 sm:px-4 lg:px-0";
    // GettingStarted needs to occupy full max width (900px). Padding like `xl:p-6`
    // reduces the visible content width (e.g. 900 - 48 = 852).
    // Rich tool cards already include their own internal padding/frame and are designed
    // to be exactly ~900px wide in the chat lane. Extra wrapper padding would shrink
    // their visible width (e.g. 900 - 48 = 852), so we remove it here.
    const toolContentPaddingClassForGettingStarted =
      isGettingStartedTool ||
      isCasesTool ||
      isProjectBriefTool ||
      isNextStepsTool ||
      isBookCallTool ||
      isEstimateTool ||
      isSupportTool
        ? "p-0"
        : toolContentPaddingClass;

    return (
      <div className={`flex w-full ${wrapperJustify} mb-4`}>
        <div className={`w-full flex justify-center ${toolWrapperPaddingClass}`}>
          <div
            className="relative w-full min-w-0"
            style={{ maxWidth: toolWrapperMaxWidth }}
          >
            <div className={toolContentPaddingClassForGettingStarted}>
              <ToolCallMessageRenderer
                content={message.content}
                onUserAction={onUserAction}
                messageId={message._id}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${wrapperJustify} mb-4`}>
      <div className="w-full flex justify-center px-4 lg:px-0">
        <div
          className="relative max-w-2xl w-full"
          style={{ maxWidth: 900 }}
        >
          <Card className={cardClassName}>
            <CardContent
              className={
                toolContentPaddingClass
              }
            >
              <ToolCallMessageRenderer
                content={message.content}
                onUserAction={onUserAction}
                messageId={message._id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}