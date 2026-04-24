import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEmailGateFlow } from "@/src/hooks/useEmailGateFlow";

describe("useEmailGateFlow", () => {
  it("enables gate after minimum user messages", () => {
    const appendMock = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useEmailGateFlow({
        conversationId: "conv-1",
        convexMessages: [
          { role: "user", content: "one" },
          { role: "user", content: "two" },
          { role: "user", content: "three" },
          { role: "user", content: "four" },
          { role: "user", content: "five" },
        ],
        selectedConversationGuestEmail: "",
        appendMessageToConvex: appendMock,
        minUserMessagesForGate: 5,
        isEstimateFlowActive: () => false,
        resolveLanguage: () => "en",
      }),
    );

    expect(result.current.emailRequiredGate).toBe(true);
    expect(result.current.hasCapturedEmailForGate).toBe(false);
  });

  it("prompts in chat and sets awaiting-email state", async () => {
    const appendMock = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmailGateFlow({
        conversationId: "conv-1",
        convexMessages: [],
        selectedConversationGuestEmail: "",
        appendMessageToConvex: appendMock,
        minUserMessagesForGate: 5,
        isEstimateFlowActive: () => false,
        resolveLanguage: () => "en",
      }),
    );

    act(() => {
      result.current.promptEmailRequiredInChat("general", "hello");
    });

    await waitFor(() => {
      expect(appendMock).toHaveBeenCalled();
    });

    expect(result.current.emailCaptureAwaitingInput).toBe(true);
    expect(result.current.emailCapturePromptVisible).toBe(false);
  });
});
