import { describe, expect, it } from "vitest";
import {
  isEstimateFlowUiActive,
  isLikelyDefaultCiedenGreeting,
  normalizeAssistantMessage,
  normalizeIntroText,
  shouldShowIntroQuickPath,
} from "@/src/utils/ciedenChatUi";

describe("ciedenChatUi utils", () => {
  it("normalizes assistant text for stable dedupe", () => {
    expect(normalizeAssistantMessage("  Hello   there!!! ")).toBe("hello there");
    expect(normalizeAssistantMessage("A—B")).toBe("a-b");
  });

  it("normalizes intro text without trimming trailing punctuation", () => {
    expect(normalizeIntroText(" Hi   Cieden—assistant. ")).toBe("hi cieden-assistant.");
  });

  it("detects default cieden greeting-like messages", () => {
    expect(
      isLikelyDefaultCiedenGreeting(
        "Hi! I'm the Cieden AI design assistant. How can I help you today?",
      ),
    ).toBe(true);
    expect(isLikelyDefaultCiedenGreeting("Custom project estimate details")).toBe(false);
  });

  it("computes intro quick-path visibility", () => {
    expect(
      shouldShowIntroQuickPath({
        conversationId: "conv-1",
        convexMessagesLoading: false,
        welcomeHubDismissed: false,
      }),
    ).toBe(true);
    expect(
      shouldShowIntroQuickPath({
        conversationId: null,
        convexMessagesLoading: false,
        welcomeHubDismissed: false,
      }),
    ).toBe(false);
  });

  it("detects estimate flow from window flags", () => {
    const w = window as unknown as {
      __ciedenEstimatePanelOpen?: boolean;
      __ciedenEstimateProgressActive?: boolean;
    };
    w.__ciedenEstimatePanelOpen = false;
    w.__ciedenEstimateProgressActive = false;
    expect(isEstimateFlowUiActive()).toBe(false);

    w.__ciedenEstimateProgressActive = true;
    expect(isEstimateFlowUiActive()).toBe(true);
  });
});
