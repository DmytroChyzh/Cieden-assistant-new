export function normalizeIncomingEvent(
  event: unknown,
): { source: "ai" | "user"; message: string } | null {
  try {
    const recordEvent =
      typeof event === "object" && event !== null
        ? (event as Record<string, unknown>)
        : undefined;

    const type =
      typeof recordEvent?.type === "string" ? (recordEvent?.type as string) : undefined;

    if (type === "agent_response") {
      const agentResponse =
        typeof recordEvent?.agent_response === "string" ? recordEvent.agent_response : null;
      const message = typeof recordEvent?.message === "string" ? recordEvent.message : null;
      const text = typeof recordEvent?.text === "string" ? recordEvent.text : null;
      const nestedResponse =
        typeof recordEvent?.agent_response_event === "object" &&
        recordEvent.agent_response_event !== null
          ? (recordEvent.agent_response_event as Record<string, unknown>).agent_response
          : null;
      const resolved =
        agentResponse ?? message ?? text ?? (typeof nestedResponse === "string" ? nestedResponse : null);
      if (resolved) {
        return { source: "ai", message: resolved };
      }
    }

    if (recordEvent?.agent_response_event && typeof recordEvent.agent_response_event === "object") {
      const nested = (recordEvent.agent_response_event as Record<string, unknown>).agent_response;
      if (typeof nested === "string") {
        return { source: "ai", message: nested };
      }
    }

    if (type === "user_transcript" || type === "user_transcription_event") {
      const userTranscript =
        typeof recordEvent?.user_transcript === "string" ? recordEvent.user_transcript : null;
      const nestedTranscript =
        typeof recordEvent?.user_transcription_event === "object" &&
        recordEvent.user_transcription_event !== null
          ? (recordEvent.user_transcription_event as Record<string, unknown>).user_transcript
          : null;
      const transcriptText = typeof recordEvent?.text === "string" ? recordEvent.text : null;
      const transcriptMessage =
        typeof recordEvent?.message === "string" ? recordEvent.message : null;
      const resolved =
        userTranscript ??
        (typeof nestedTranscript === "string" ? nestedTranscript : null) ??
        transcriptText ??
        transcriptMessage;
      if (resolved) {
        return { source: "user", message: resolved };
      }
    }

    if (recordEvent?.user_transcription_event && typeof recordEvent.user_transcription_event === "object") {
      const nested = (recordEvent.user_transcription_event as Record<string, unknown>).user_transcript;
      if (typeof nested === "string" && nested.trim()) {
        return { source: "user", message: nested };
      }
    }

    const message = typeof recordEvent?.message === "string" ? recordEvent.message : null;
    const text = typeof recordEvent?.text === "string" ? recordEvent.text : null;
    const source = typeof recordEvent?.source === "string" ? (recordEvent.source as string) : null;
    if ((message || text) && (source === "ai" || source === "user")) {
      return { source, message: message ?? text! };
    }

    if (message || text) {
      const content = (message ?? text ?? "").trim();
      if (content) {
        if ((type || "").includes("user")) return { source: "user", message: content };
        return { source: "ai", message: content };
      }
    }

    if (typeof event === "string") {
      return { source: "ai", message: event };
    }
  } catch {
    // swallow and let caller handle null
  }
  return null;
}
