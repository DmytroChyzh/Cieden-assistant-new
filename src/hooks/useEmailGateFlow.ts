import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseToolCall } from "@/src/utils/parseToolCall";

const EMAIL_INLINE_RE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;

const normalizeCapturedEmail = (value?: string | null): string => value?.trim().toLowerCase() ?? "";
const isValidEmail = (value?: string | null): boolean => EMAIL_INLINE_RE.test(normalizeCapturedEmail(value));

interface UseEmailGateFlowParams {
  conversationId: unknown;
  convexMessages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  selectedConversationGuestEmail?: string | null;
  appendMessageToConvex: (args: {
    content: string;
    role: "user" | "assistant" | "system";
    source: "voice" | "text" | "contextual";
    metadata?: any;
  }) => Promise<boolean>;
  minUserMessagesForGate: number;
  isEstimateFlowActive: () => boolean;
  resolveLanguage: (contextText?: string) => "en" | "ua";
}

export function useEmailGateFlow({
  conversationId,
  convexMessages,
  selectedConversationGuestEmail,
  appendMessageToConvex,
  minUserMessagesForGate,
  isEstimateFlowActive,
  resolveLanguage,
}: UseEmailGateFlowParams) {
  const visibleUserMessageCountForEmailRef = useRef(0);
  const emailRequiredGateRef = useRef(false);
  const estimateEmailPromptCooldownRef = useRef(0);
  const pendingEstimateIntentRef = useRef<string | null>(null);

  const [emailCapturePromptVisible, setEmailCapturePromptVisible] = useState(false);
  const [emailCaptureDismissed, setEmailCaptureDismissed] = useState(false);
  const [emailCaptureAwaitingInput, setEmailCaptureAwaitingInput] = useState(false);
  const [emailComposerGateNotice, setEmailComposerGateNotice] = useState<string | null>(null);
  const [emailRequiredGate, setEmailRequiredGate] = useState(false);
  const [capturedEmailConversationId, setCapturedEmailConversationId] = useState<string | null>(null);

  const hasCapturedEmailForGate = useMemo(() => {
    if (isValidEmail(selectedConversationGuestEmail)) return true;
    if (
      conversationId &&
      capturedEmailConversationId &&
      String(conversationId) === capturedEmailConversationId
    ) {
      return true;
    }
    return false;
  }, [selectedConversationGuestEmail, conversationId, capturedEmailConversationId]);

  const promptEmailRequiredInChat = useCallback(
    (reason: "general" | "estimate" = "general", contextText?: string) => {
      const now = Date.now();
      if (now - estimateEmailPromptCooldownRef.current < 2500) return;
      estimateEmailPromptCooldownRef.current = now;
      if (reason === "estimate" && contextText?.trim()) {
        pendingEstimateIntentRef.current = contextText.trim();
      }
      const language = resolveLanguage(contextText);
      const promptText =
        language === "ua"
          ? reason === "estimate"
            ? "Щоб продовжити естімейт, вкажіть ваш email у чаті. Одразу після цього я продовжу розрахунок."
            : "Щоб далі продовжувати спілкування з асистентом, введіть свій email письмово в чаті для подальшого покращення комунікації."
          : reason === "estimate"
            ? "To continue with the estimate, please type your email in chat. Right after that I will continue the calculation."
            : "To continue chatting with the assistant, please type your email in chat (written text) for better ongoing communication.";
      setEmailComposerGateNotice(null);
      setEmailCaptureAwaitingInput(true);
      setEmailCapturePromptVisible(false);
      setEmailCaptureDismissed(false);
      void (async () => {
        const attempts = [0, 350, 900];
        for (const delay of attempts) {
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          const ok = await appendMessageToConvex({
            role: "assistant",
            source: "text",
            content: promptText,
          });
          if (ok) return;
        }
        console.error("⚠️ Failed to persist estimate email gate prompt after retries");
      })();
    },
    [appendMessageToConvex, resolveLanguage],
  );

  useEffect(() => {
    const raw = convexMessages || [];
    let n = 0;
    for (const m of raw) {
      if (m.role !== "user") continue;
      const c = (m.content || "").trim();
      if (c.startsWith("I selected:")) continue;
      if (/^\[ESTIMATE\s+(MODE|PANEL)\]/i.test(c)) continue;
      const mode = parseToolCall(m.content || "")?.mode || "default";
      if (mode === "update") continue;
      n++;
    }
    visibleUserMessageCountForEmailRef.current = n;
    const gate = Boolean(
      conversationId &&
        !hasCapturedEmailForGate &&
        n >= minUserMessagesForGate &&
        !isEstimateFlowActive(),
    );
    emailRequiredGateRef.current = gate;
    setEmailRequiredGate(gate);
  }, [convexMessages, conversationId, hasCapturedEmailForGate, isEstimateFlowActive, minUserMessagesForGate]);

  useEffect(() => {
    if (!emailRequiredGate) setEmailComposerGateNotice(null);
  }, [emailRequiredGate]);

  return {
    emailCapturePromptVisible,
    setEmailCapturePromptVisible,
    emailCaptureDismissed,
    setEmailCaptureDismissed,
    emailCaptureAwaitingInput,
    setEmailCaptureAwaitingInput,
    emailComposerGateNotice,
    setEmailComposerGateNotice,
    emailRequiredGate,
    emailRequiredGateRef,
    hasCapturedEmailForGate,
    capturedEmailConversationId,
    setCapturedEmailConversationId,
    pendingEstimateIntentRef,
    promptEmailRequiredInChat,
  };
}
