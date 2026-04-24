import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibleConvexMessages } from "@/src/hooks/useVisibleConvexMessages";

describe("useVisibleConvexMessages", () => {
  it("filters service rows and dedupes duplicate assistant rows", () => {
    const { result } = renderHook(() =>
      useVisibleConvexMessages({
        convexMessages: [
          { role: "system", source: "contextual", content: "ctx" },
          { role: "user", content: "I selected: Continue by text" },
          { role: "assistant", content: "Hello there!" },
          { role: "assistant", content: "hello there" },
          { role: "assistant", content: "TOOL_CALL:show_cases:{\"mode\":\"default\"}" },
          { role: "assistant", content: "TOOL_CALL:show_cases:{\"mode\":\"default\"}" },
          { role: "user", content: "Actual user message" },
        ],
        getMessageMode: () => "default",
        isFirstTurnIntroEcho: () => false,
        estimateToolOnlyMarker: "[[TOOL_ONLY_ESTIMATE_ENTRY]]",
      }),
    );

    const visible = result.current.map((m) => `${m.role}:${m.content}`);
    expect(visible).toEqual([
      "assistant:Hello there!",
      "assistant:TOOL_CALL:show_cases:{\"mode\":\"default\"}",
      "user:Actual user message",
    ]);
  });

  it("drops first-turn assistant intro echo after first user message", () => {
    const { result } = renderHook(() =>
      useVisibleConvexMessages({
        convexMessages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "echo intro message" },
          { role: "assistant", content: "real reply" },
        ],
        getMessageMode: () => "default",
        isFirstTurnIntroEcho: (content) => content === "echo intro message",
        estimateToolOnlyMarker: "[[TOOL_ONLY_ESTIMATE_ENTRY]]",
      }),
    );

    expect(result.current.map((m) => m.content)).toEqual(["Hi", "real reply"]);
  });

  it("dedupes repeated assistant text anywhere within same user segment", () => {
    const { result } = renderHook(() =>
      useVisibleConvexMessages({
        convexMessages: [
          { role: "user", content: "I need estimate" },
          { role: "assistant", content: "Thanks, let's do it." },
          { role: "assistant", content: "What is your timeline?" },
          { role: "assistant", content: "Thanks, let's do it!" },
          { role: "assistant", content: "TOOL_CALL:show_cases:{\"mode\":\"default\"}" },
          { role: "assistant", content: "TOOL_CALL:show_cases:{\"mode\":\"default\"}" },
          { role: "user", content: "New turn" },
          { role: "assistant", content: "Thanks, let's do it." },
        ],
        getMessageMode: () => "default",
        isFirstTurnIntroEcho: () => false,
        estimateToolOnlyMarker: "[[TOOL_ONLY_ESTIMATE_ENTRY]]",
      }),
    );

    expect(result.current.map((m) => `${m.role}:${m.content}`)).toEqual([
      "user:I need estimate",
      "assistant:Thanks, let's do it.",
      "assistant:What is your timeline?",
      "assistant:TOOL_CALL:show_cases:{\"mode\":\"default\"}",
      "user:New turn",
      "assistant:Thanks, let's do it.",
    ]);
  });

  it("filters estimate marker and onboarding completion service rows", () => {
    const { result } = renderHook(() =>
      useVisibleConvexMessages({
        convexMessages: [
          { role: "assistant", content: "[[TOOL_ONLY_ESTIMATE_ENTRY]]" },
          { role: "assistant", content: "onboarding complete." },
          { role: "assistant", content: "Valid assistant row" },
        ],
        getMessageMode: () => "default",
        isFirstTurnIntroEcho: () => false,
        estimateToolOnlyMarker: "[[TOOL_ONLY_ESTIMATE_ENTRY]]",
      }),
    );

    expect(result.current.map((m) => `${m.role}:${m.content}`)).toEqual([
      "assistant:Valid assistant row",
    ]);
  });
});
