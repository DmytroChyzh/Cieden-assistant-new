import { describe, expect, it } from "vitest";
import { normalizeIncomingEvent } from "@/src/providers/normalizeIncomingEvent";

describe("normalizeIncomingEvent", () => {
  it("parses nested user_transcription_event payload", () => {
    const normalized = normalizeIncomingEvent({
      type: "user_transcription_event",
      user_transcription_event: {
        user_transcript: "I need a fintech dashboard estimate",
      },
    });

    expect(normalized).toEqual({
      source: "user",
      message: "I need a fintech dashboard estimate",
    });
  });

  it("parses nested agent_response_event payload", () => {
    const normalized = normalizeIncomingEvent({
      type: "agent_response",
      agent_response_event: {
        agent_response: "Sure. How many platforms do you target?",
      },
    });

    expect(normalized).toEqual({
      source: "ai",
      message: "Sure. How many platforms do you target?",
    });
  });

  it("falls back to text payload when source is missing", () => {
    const normalized = normalizeIncomingEvent({
      type: "agent_response",
      text: "Let's break this down into scope and timeline.",
    });

    expect(normalized).toEqual({
      source: "ai",
      message: "Let's break this down into scope and timeline.",
    });
  });
});
