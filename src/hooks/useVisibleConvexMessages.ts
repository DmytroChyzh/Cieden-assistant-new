import { useMemo } from "react";
import { parseToolCall } from "@/src/utils/parseToolCall";
import { normalizeAssistantMessage } from "@/src/utils/ciedenChatUi";

type ChatRow = {
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
};

export function useVisibleConvexMessages({
  convexMessages,
  getMessageMode,
  isFirstTurnIntroEcho,
  estimateToolOnlyMarker,
}: {
  convexMessages: ChatRow[];
  getMessageMode: (content: string) => "default" | "update" | "overlay";
  isFirstTurnIntroEcho: (content: string) => boolean;
  estimateToolOnlyMarker: string;
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
      if (message.role === "user" && message.content.startsWith("I selected:")) return false;
      if (/onboarding complete\./i.test((message.content || "").trim())) return false;
      if (message.role === "assistant" && (message.content || "").trim() === estimateToolOnlyMarker) {
        return false;
      }
      const mode = getMessageMode(message.content);
      if (mode === "update") return false;
      const c = message.content || "";
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

    const toolDeduped = filtered.filter((message, index, arr) => {
      const isTool = !!parseToolCall(message.content);
      if (!isTool) {
        if (message.role === "assistant") {
          const currentNorm = normalizeAssistantMessage(message.content || "");
          for (let i = index - 1; i >= 0; i--) {
            const prev = arr[i];
            if (prev.role !== "assistant") continue;
            if (parseToolCall(prev.content)) continue;
            if (normalizeAssistantMessage(prev.content || "") === currentNorm) return false;
            break;
          }
        }
        return true;
      }
      const prev = index > 0 ? arr[index - 1] : null;
      const prevIsTool = !!(prev && parseToolCall(prev.content));
      if (prevIsTool && prev?.content === message.content) return false;
      return true;
    });

    return toolDeduped;
  }, [convexMessages, estimateToolOnlyMarker, getMessageMode, isFirstTurnIntroEcho]);
}
