import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shouldShowIntroQuickPath } from "@/src/utils/ciedenChatUi";

interface UseWelcomeHubFlowParams {
  conversationId: unknown;
  convexMessagesLoading: boolean;
  introSessionKey: number;
  introText: string;
  quickPromptTitles: string[];
}

export function useWelcomeHubFlow({
  conversationId,
  convexMessagesLoading,
  introSessionKey,
  introText,
  quickPromptTitles,
}: UseWelcomeHubFlowParams) {
  const [welcomeHubMode, setWelcomeHubMode] = useState<null | "text" | "voice">(null);
  const [introVisibleChars, setIntroVisibleChars] = useState(0);
  const [introTypewriterDone, setIntroTypewriterDone] = useState(false);
  const [welcomeVoiceCueBuffer, setWelcomeVoiceCueBuffer] = useState("");
  const [voiceWelcomeRevealAll, setVoiceWelcomeRevealAll] = useState(false);
  const [welcomeHubDismissed, setWelcomeHubDismissed] = useState(false);

  const introTypewriterRunKeyRef = useRef<string | null>(null);
  const welcomeInitialGateDoneRef = useRef(false);

  const onWelcomeVoiceAgentText = useCallback((text: string) => {
    setWelcomeVoiceCueBuffer(text);
  }, []);

  const resetWelcomeHubFlow = useCallback(() => {
    setWelcomeHubMode(null);
    setWelcomeHubDismissed(false);
    setWelcomeVoiceCueBuffer("");
    setVoiceWelcomeRevealAll(false);
    setIntroTypewriterDone(false);
    setIntroVisibleChars(0);
    introTypewriterRunKeyRef.current = null;
    welcomeInitialGateDoneRef.current = false;
  }, []);

  useEffect(() => {
    welcomeInitialGateDoneRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || convexMessagesLoading) return;
    if (welcomeInitialGateDoneRef.current) return;
    welcomeInitialGateDoneRef.current = true;
    setWelcomeHubDismissed(false);
  }, [conversationId, convexMessagesLoading]);

  const showIntroQuickPath = shouldShowIntroQuickPath({
    conversationId,
    convexMessagesLoading,
    welcomeHubDismissed,
  });

  const voiceWelcomeVisiblePromptCount = useMemo(() => {
    if (welcomeHubMode !== "voice") return 0;
    const lower = welcomeVoiceCueBuffer.toLowerCase();
    let count = 0;
    for (const title of quickPromptTitles) {
      if (!lower.includes(title.toLowerCase())) break;
      count++;
    }
    return count;
  }, [quickPromptTitles, welcomeHubMode, welcomeVoiceCueBuffer]);

  const welcomeVisiblePromptCount =
    welcomeHubMode === "text"
      ? 6
      : welcomeHubMode === "voice"
        ? Math.min(6, Math.max(voiceWelcomeVisiblePromptCount, voiceWelcomeRevealAll ? 6 : 0))
        : 0;

  useEffect(() => {
    if (!showIntroQuickPath) {
      introTypewriterRunKeyRef.current = null;
      return;
    }
    const runKey = String(introSessionKey);
    if (introTypewriterRunKeyRef.current === runKey) return;
    introTypewriterRunKeyRef.current = runKey;
    setWelcomeHubMode(null);
    setWelcomeVoiceCueBuffer("");
    setVoiceWelcomeRevealAll(false);
    setIntroTypewriterDone(false);
    setIntroVisibleChars(0);
    const timeout = window.setTimeout(() => {
      setIntroVisibleChars(introText.length);
      setIntroTypewriterDone(true);
    }, 240);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [introSessionKey, introText, showIntroQuickPath]);

  useEffect(() => {
    if (welcomeHubMode !== "voice" || !showIntroQuickPath) {
      setVoiceWelcomeRevealAll(false);
      return;
    }
    setVoiceWelcomeRevealAll(false);
    const timeout = window.setTimeout(() => setVoiceWelcomeRevealAll(true), 14000);
    return () => window.clearTimeout(timeout);
  }, [welcomeHubMode, showIntroQuickPath, introSessionKey]);

  return {
    welcomeHubMode,
    setWelcomeHubMode,
    introVisibleChars,
    introTypewriterDone,
    welcomeVoiceCueBuffer,
    setWelcomeVoiceCueBuffer,
    voiceWelcomeRevealAll,
    welcomeHubDismissed,
    setWelcomeHubDismissed,
    showIntroQuickPath,
    welcomeVisiblePromptCount,
    onWelcomeVoiceAgentText,
    resetWelcomeHubFlow,
  };
}
