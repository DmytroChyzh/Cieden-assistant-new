import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseToolCall } from "@/src/utils/parseToolCall";
import {
  hasInvalidEmailLikeInput,
  isValidEmailStrict,
  normalizeEmail,
} from "@/src/utils/emailValidation";

const normalizeCapturedEmail = (value?: string | null): string => normalizeEmail(value);
const isValidEmail = (value?: string | null): boolean => isValidEmailStrict(value);

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
  const gateAutoPromptedConversationRef = useRef<string | null>(null);

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
    async (reason: "general" | "estimate" = "general", contextText?: string) => {
      const now = Date.now();
      if (now - estimateEmailPromptCooldownRef.current < 2500) return false;
      estimateEmailPromptCooldownRef.current = now;
      if (reason === "estimate" && contextText?.trim()) {
        pendingEstimateIntentRef.current = contextText.trim();
      }
      const language = resolveLanguage(contextText);
      const invalidEmailAttempt = hasInvalidEmailLikeInput(contextText);
      const promptText =
        language === "ua"
          ? reason === "estimate"
            ? invalidEmailAttempt
              ? "Email виглядає некоректним. Надішліть, будь ласка, одним повідомленням лише ваш робочий email у форматі name@company.com — і я одразу продовжу естімейт. Це потрібно для кращої подальшої комунікації."
              : "Щоб продовжити естімейт, надішліть одним повідомленням лише ваш робочий email у форматі name@company.com. Після цього я одразу продовжу розрахунок. Це потрібно для кращої подальшої комунікації."
            : invalidEmailAttempt
              ? "Email виглядає некоректним. Щоб продовжити, надішліть одним повідомленням лише робочий email у форматі name@company.com. Це потрібно для кращої подальшої комунікації."
              : "Щоб продовжити спілкування, надішліть одним повідомленням лише ваш робочий email у форматі name@company.com. Це потрібно для кращої подальшої комунікації."
          : reason === "estimate"
            ? invalidEmailAttempt
              ? "That email looks invalid. Please send one message with only your work email in this format: name@company.com. I will continue the estimate right away. This helps with better follow-up communication."
              : "To continue with the estimate, please send one message with only your work email in this format: name@company.com. I will continue right away. This helps with better follow-up communication."
            : invalidEmailAttempt
              ? "That email looks invalid. To continue, please send one message with only your work email in this format: name@company.com. This helps with better follow-up communication."
              : "To continue chatting, please send one message with only your work email in this format: name@company.com. This helps with better follow-up communication.";
      setEmailComposerGateNotice(null);
      setEmailCaptureAwaitingInput(true);
      setEmailCapturePromptVisible(false);
      setEmailCaptureDismissed(false);
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
        if (ok) return true;
      }
      console.error("⚠️ Failed to persist estimate email gate prompt after retries");
      return false;
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

  // When gate becomes active (e.g. after Nth user query), send one explicit chat reminder
  // so users do not rely only on input placeholder text.
  useEffect(() => {
    if (!emailRequiredGate) return;
    if (!conversationId) return;
    if (hasCapturedEmailForGate) return;
    if (emailCaptureAwaitingInput) return;
    const latestRenderableRole = [...(convexMessages || [])]
      .reverse()
      .find((message) => {
        if (message.role !== "assistant" && message.role !== "user") return false;
        if (!(message.content || "").trim()) return false;
        return true;
      })?.role;
    // Wait until assistant replied to the turn that activated the gate,
    // then show the email requirement reminder to avoid interleaving mid-response.
    if (latestRenderableRole !== "assistant") return;
    const convKey = String(conversationId);
    if (gateAutoPromptedConversationRef.current === convKey) return;
    let cancelled = false;
    void (async () => {
      const persisted = await promptEmailRequiredInChat("general");
      if (!cancelled && persisted) {
        gateAutoPromptedConversationRef.current = convKey;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    emailRequiredGate,
    conversationId,
    hasCapturedEmailForGate,
    emailCaptureAwaitingInput,
    convexMessages,
    promptEmailRequiredInChat,
  ]);

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
