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
});
