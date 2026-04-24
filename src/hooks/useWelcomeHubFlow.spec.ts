import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWelcomeHubFlow } from "@/src/hooks/useWelcomeHubFlow";

const QUICK_PROMPT_TITLES = [
  "What does Cieden do?",
  "Show your portfolio",
  "How much does a project cost?",
  "What's your design process?",
  "Do you do development too?",
  "How do I start a project?",
];

describe("useWelcomeHubFlow", () => {
  it("reveals intro text in one deterministic shot", () => {
    vi.useFakeTimers();
    const introText = "Intro text for welcome";

    const { result } = renderHook(() =>
      useWelcomeHubFlow({
        conversationId: "conv-1",
        convexMessagesLoading: false,
        introSessionKey: 1,
        introText,
        quickPromptTitles: QUICK_PROMPT_TITLES,
      }),
    );

    expect(result.current.showIntroQuickPath).toBe(true);
    expect(result.current.introTypewriterDone).toBe(false);

    act(() => {
      vi.advanceTimersByTime(240);
    });

    expect(result.current.introTypewriterDone).toBe(true);
    expect(result.current.introVisibleChars).toBe(introText.length);
  });

  it("expands voice prompt set after delayed reveal", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useWelcomeHubFlow({
        conversationId: "conv-1",
        convexMessagesLoading: false,
        introSessionKey: 2,
        introText: "Intro",
        quickPromptTitles: QUICK_PROMPT_TITLES,
      }),
    );

    act(() => {
      result.current.setWelcomeHubMode("voice");
      result.current.onWelcomeVoiceAgentText("What does Cieden do? Show your portfolio");
      vi.advanceTimersByTime(240);
    });
    expect(result.current.welcomeVisiblePromptCount).toBe(2);

    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(result.current.welcomeVisiblePromptCount).toBe(6);
  });
});
