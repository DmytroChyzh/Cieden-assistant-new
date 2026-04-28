import { describe, expect, it } from "vitest";
import {
  extractPrimaryEstimateQuestion,
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

  it("rejects generic non-question estimate chatter", () => {
    expect(
      isEstimateRelevantAssistantQuestion(
        "Great, thanks for the details. Let's continue step by step.",
      ),
    ).toBe(false);
  });

  it("matches extended default intro greeting variants", () => {
    expect(
      isLikelyDefaultCiedenGreeting(
        "Hi! I'm Cieden AI Assistant - your guide to our UI/UX design, portfolio, process, and pricing.",
      ),
    ).toBe(true);
  });

  it("extracts only the primary relevant estimate question from noisy text", () => {
    expect(
      extractPrimaryEstimateQuestion(
        "Understood. This is a redesign of an existing website. Next question: Who is the primary audience for this website, and what is the main goal you want to achieve with the redesign? Understood. This is a redesign of an existing website.",
      ),
    ).toBe(
      "Next question: Who is the primary audience for this website, and what is the main goal you want to achieve with the redesign?",
    );
  });

  it("extracts clean question when AI glues text after question mark", () => {
    expect(
      extractPrimaryEstimateQuestion(
        "Understood. Next question: Who is the primary audience for this website, and what is the main goal you want to achieve with the redesign?Understood. So, it's a redesign of an existing website.",
      ),
    ).toBe(
      "Next question: Who is the primary audience for this website, and what is the main goal you want to achieve with the redesign?",
    );
  });

  it("returns null when there is no relevant estimate question", () => {
    expect(
      extractPrimaryEstimateQuestion(
        "Great, thanks for the details. Let's continue step by step.",
      ),
    ).toBeNull();
  });
});
