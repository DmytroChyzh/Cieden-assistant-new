import { useMemo } from "react";
import { parseToolCall } from "@/src/utils/parseToolCall";
import { normalizeAssistantMessage } from "@/src/utils/ciedenChatUi";

type ChatRow = {
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

const isEstimateChooserInstructionMessage = (content: string): boolean => {
  const t = (content || "").trim().toLowerCase();
  if (!t) return false;
  return (
    t.includes("we can provide a preliminary estimate") ||
    t.includes("i've opened a card in the chat") ||
    t.includes("i have opened a card in the chat") ||
    t.includes("choose to either work with me to get an estimate or fill out a short questionnaire") ||
    t.includes("for an exact quote, you can always speak with a manager") ||
    // Common variant that still should be hidden while chooser is waiting for selection.
    t.includes("i've opened the preliminary estimate tool") ||
    t.includes("i have opened the preliminary estimate tool") ||
    t.includes("i've opened a preliminary estimate tool") ||
    t.includes("i have opened a preliminary estimate tool") ||
    (t.includes("choose to work with me here in the chat") && t.includes("step-by-step questionnaire")) ||
    (t.includes("preliminary estimate tool") && t.includes("choose"))
  );
};

const CASE_TOOL_FAMILY = new Set(["show_cases", "find_similar_cases"]);

export function useVisibleConvexMessages({
  convexMessages,
  getMessageMode,
  isFirstTurnIntroEcho,
  estimateToolOnlyMarker,
  isEstimateFlowActive = false,
  enforceSingleAssistantReplyPerUserTurn = false,
  suppressAssistantTextWhileEstimateChooser = false,
}: {
  convexMessages: ChatRow[];
  getMessageMode: (content: string) => "default" | "update" | "overlay";
  isFirstTurnIntroEcho: (content: string) => boolean;
  estimateToolOnlyMarker: string;
  isEstimateFlowActive?: boolean;
  enforceSingleAssistantReplyPerUserTurn?: boolean;
  suppressAssistantTextWhileEstimateChooser?: boolean;
}) {
  return useMemo(() => {
    const raw = convexMessages || [];
    const firstUserIdx = raw.findIndex((m) => m.role === "user");
    const nextUserAfterFirst =
      firstUserIdx === -1 ? -1 : raw.findIndex((m, i) => i > firstUserIdx && m.role === "user");
    const segmentAfterFirstUserEnd = nextUserAfterFirst === -1 ? raw.length : nextUserAfterFirst;
    const firstAssistantAfterFirstUserIdx =
      firstUserIdx === -1
        ? -1
        : raw.findIndex(
            (m, i) =>
              i > firstUserIdx &&
              i < segmentAfterFirstUserEnd &&
              m.role === "assistant",
          );

    const filtered = raw.filter((message, idx) => {
      if (message.role === "system" && message.source === "contextual") return false;
      const metadata = (message.metadata ?? {}) as Record<string, unknown>;
      const isEstimateCompletionFollowUp =
        (metadata as { estimateCompletionFollowUp?: boolean } | undefined)?.estimateCompletionFollowUp === true;
      if (metadata.threadType === "estimate") return false;
      if (message.role === "user" && message.content.startsWith("I selected:")) return false;
      if (/onboarding complete\./i.test((message.content || "").trim())) return false;
      if (message.role === "assistant" && (message.content || "").trim() === estimateToolOnlyMarker) {
        return false;
      }
      // While estimate chooser is visible and user has not selected a path yet,
      // hide plain assistant text from main lane (prevents premature narration).
      if (
        suppressAssistantTextWhileEstimateChooser &&
        message.role === "assistant" &&
        !parseToolCall(message.content || "") &&
        !isEstimateCompletionFollowUp
      ) {
        return false;
      }
      // Hide estimate chooser helper narration from main feed in all modes.
      // It is UI-helper copy, not conversational value, and should never surface as a bubble.
      if (
        message.role === "assistant" &&
        isEstimateChooserInstructionMessage(message.content || "")
      ) {
        return false;
      }
      const mode = getMessageMode(message.content);
      if (mode === "update") return false;
      const c = message.content || "";
      // Never render empty assistant rows (these create blank bubbles).
      if (
        message.role === "assistant" &&
        !parseToolCall(c) &&
        normalizeAssistantMessage(c) === ""
      ) {
        return false;
      }
      if (message.role === "user" && /^\[ESTIMATE\s+(MODE|PANEL)\]/i.test(c.trim())) return false;
      if (
        message.role === "assistant" &&
        firstAssistantAfterFirstUserIdx === idx &&
        isFirstTurnIntroEcho(c)
      ) {
        return false;
      }
      return true;
    });

    const toolDeduped: ChatRow[] = [];
    const seenAssistantInSegment = new Set<string>();
    let hasRenderedCaseFamilyToolInSegment = false;
    let hasRenderedAssistantTextInSegment = false;
    for (const message of filtered) {
      // Reset assistant dedupe scope after each user turn.
      if (message.role === "user") {
        seenAssistantInSegment.clear();
        hasRenderedCaseFamilyToolInSegment = false;
        hasRenderedAssistantTextInSegment = false;
        toolDeduped.push(message);
        continue;
      }

      const parsedTool = parseToolCall(message.content);
      const isTool = !!parsedTool;
      if (isTool) {
        if (parsedTool?.toolName && CASE_TOOL_FAMILY.has(parsedTool.toolName)) {
          if (hasRenderedCaseFamilyToolInSegment) continue;
          hasRenderedCaseFamilyToolInSegment = true;
        }
        const prev = toolDeduped.length > 0 ? toolDeduped[toolDeduped.length - 1] : null;
        const prevIsTool = !!(prev && parseToolCall(prev.content));
        if (prevIsTool && prev?.content === message.content) continue;
        toolDeduped.push(message);
        continue;
      }

      if (message.role === "assistant") {
        const normalized = normalizeAssistantMessage(message.content || "");
        if (normalized && seenAssistantInSegment.has(normalized)) continue;
        if (normalized) seenAssistantInSegment.add(normalized);
        const metadata = (message.metadata ?? {}) as Record<string, unknown>;
        const isEstimateCompletionFollowUp =
          (metadata as { estimateCompletionFollowUp?: boolean } | undefined)?.estimateCompletionFollowUp === true;
        if (
          enforceSingleAssistantReplyPerUserTurn &&
          !isEstimateCompletionFollowUp &&
          !isTool &&
          hasRenderedAssistantTextInSegment
        ) {
          continue;
        }
        hasRenderedAssistantTextInSegment = true;
      }

      toolDeduped.push(message);
    }

    return toolDeduped;
  }, [
    convexMessages,
    enforceSingleAssistantReplyPerUserTurn,
    suppressAssistantTextWhileEstimateChooser,
    estimateToolOnlyMarker,
    getMessageMode,
    isEstimateFlowActive,
    isFirstTurnIntroEcho,
  ]);
}
