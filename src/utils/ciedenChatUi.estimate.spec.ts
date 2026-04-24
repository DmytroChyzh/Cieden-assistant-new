import { describe, expect, it } from "vitest";
import {
  isEstimateRelevantAssistantQuestion,
  isLikelyDefaultCiedenGreeting,
} from "@/src/utils/ciedenChatUi";

describe("estimate message guards", () => {
  it("blocks onboarding-style questions from estimate flow", () => {
    expect(
      isEstimateRelevantAssistantQuestion(
        "Before we begin, how should I address you? And what would you like to explore?",
      ),
    ).toBe(false);
  });

  it("keeps project-scoping estimate questions", () => {
    expect(
      isEstimateRelevantAssistantQuestion(
        "How many unique screens or key features do you anticipate for this platform?",
      ),
    ).toBe(true);
  });

  it("matches extended default intro greeting variants", () => {
    expect(
      isLikelyDefaultCiedenGreeting(
        "Hi! I'm Cieden AI Assistant - your guide to our UI/UX design, portfolio, process, and pricing.",
      ),
    ).toBe(true);
  });
});
