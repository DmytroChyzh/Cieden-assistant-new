"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UnifiedChatInput } from "@/src/components/unified/UnifiedChatInput";
import { SpeakingHUD } from "@/src/components/voice/SpeakingHUD";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { useChatMessages } from "@/src/hooks/useChatMessages";
import { useConvexMessageSync } from "@/src/hooks/useConvexMessageSync";
import { useCopilotAction, useCopilotReadable, useCopilotContext } from "@copilotkit/react-core";
import { ChartMessage } from "@/src/components/charts/ChartMessage";
import { MessageCard } from "@/src/components/chat/MessageCard";
import { ChatWindow, ChatMessage } from "@/src/chatbot-ui";
import type { ChatbotMessage } from "@/src/chatbot-ui";
import { BalanceCard } from "@/src/components/charts/BalanceCard";
import { CreditScoreCard } from "@/src/components/charts/CreditScoreCard";
import { ActionHandlers } from "@/src/utils/toolBridge";
// import { useTextMessaging } from "@/src/hooks/useTextMessaging"; // Moved inside provider context
import { VoiceChatHeader } from "@/src/components/VoiceChatHeader";
import { SettingsPanel } from '@/src/components/unified/SettingsPanel';
import { useSettings } from '@/src/components/unified/hooks/useSettings';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuizProvider } from "@/src/components/quiz/QuizProvider";
import { ElevenLabsProvider, useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { SessionResetter } from '@/src/components/voice/SessionResetter';
import { parseToolCall } from '@/src/utils/parseToolCall';
import { ensureGuestIdentityInCookie, getGuestIdentityFromCookie, updateGuestIdentityInCookie } from '@/src/utils/guestIdentity';
import LuminaGradientBackground from "@/components/LuminaGradientBackground";
// Legacy onboarding chat kept for reference; inline onboarding is now handled directly in this page.
// import { OnboardingChat } from "@/src/components/onboarding/OnboardingChat";
import {
  CasesGrid,
  BestCaseCard,
  EngagementModelsCard,
  CaseStudyPanel,
  AboutPanel,
  PricingModelDetailsPanel,
  type PricingModelDetailsId,
  EstimateSummaryCard,
} from "@/src/components/cieden/SalesUi";
import { EstimateWizardPanel, type EstimateFinalResult } from "@/src/components/cieden/EstimateWizardPanel";
import { EstimateFinalResultSidePanel } from "@/src/components/cieden/EstimateFinalResultSidePanel";
import {
  markCiedenEstimateSessionCompleted,
  resetCiedenEstimateSessionCompleted,
} from "@/src/utils/ciedenEstimateSession";
import { VOICE_CHAT_COMPOSER_LAYOUT } from "@/src/components/cieden/EstimateAssistantProgressDock";

/**
 * Sync before React commits so child estimate kickoff → sendProgrammaticMessage cannot
 * run maybeInjectToolCard while this flag is still stale (children's useEffects run
 * before the parent's flag sync effect).
 */
function setEstimateFlowWindowFlag(flowActive: boolean) {
  if (typeof window === "undefined") return;
  (window as unknown as { __ciedenEstimatePanelOpen?: boolean }).__ciedenEstimatePanelOpen =
    flowActive;
}

export default function VoiceChatPage() {
  // Session resetter moved to dedicated component
  const isMobile = false;
  const router = useRouter();
  const { signOut, signIn } = useAuthActions();
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [lastMessage, setLastMessage] = useState<{ text: string; source: 'voice' | 'text' } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingQuizContextsRef = useRef<string[]>([]);
  const [sendContextualUpdate, setSendContextualUpdate] = useState<((text: string) => void) | null>(null);
  const sendContextualUpdateRef = useRef<((text: string) => void) | null>(null);
  const autoScrollEnabledRef = useRef(true);
  useEffect(() => {
    sendContextualUpdateRef.current = sendContextualUpdate;
  }, [sendContextualUpdate]);
  const [sendProgrammaticMessage, setSendProgrammaticMessage] = useState<((text: string) => Promise<void>) | null>(null);
  // If user clicks quick prompts before `UnifiedChatInput` finishes initializing
  // (sendProgrammaticMessage is still null), we queue the last prompt and send it
  // as soon as programmatic sending becomes available (prevents "only after refresh").
  const [pendingQuickPrompt, setPendingQuickPrompt] = useState<string | null>(null);
  // Queue "visible" estimate assistant kickoff messages when UnifiedChatInput
  // isn't ready yet (prevents estimate assistant from getting stuck).
  const pendingEstimateAssistantUserMessagesRef = useRef<string[]>([]);
  const creatingConversationRef = useRef(false);
  const [estimateTyping, setEstimateTyping] = useState<{ active: boolean; label: string }>({ active: false, label: "" });
  const typingHoldUntilRef = useRef<number>(0);
  const typingHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingAssistantBubble, setPendingAssistantBubble] = useState(false);
  const [pendingOnboardingKickoff, setPendingOnboardingKickoff] = useState(false);
  const [estimateDockActive, setEstimateDockActive] = useState(false);

  const markOnboardingDoneCookie = useCallback(() => {
    // Used by middleware gating to avoid auth discovery until onboarding is done.
    if (typeof document === "undefined") return;
    document.cookie = "cieden_onboarding_done=1; path=/; max-age=3600";
  }, []);

  const clearOnboardingDoneCookie = useCallback(() => {
    if (typeof document === "undefined") return;
    document.cookie = "cieden_onboarding_done=; path=/; max-age=0";
  }, []);

  // Voice audio states for background animations
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  
  // Derive agent speaking state from voice status
  const isAgentSpeaking = voiceStatus === 'speaking';
  
  const { settings, updateSettings } = useSettings();

  const quickPrompts = [
    { title: "What does Cieden do?", valueEn: "What does Cieden do? Tell me about your company and services." },
    { title: "Show your portfolio", valueEn: "Show me your portfolio or case studies." },
    { title: "How much does a project cost?", valueEn: "How much does a typical project cost? I need a rough estimate." },
    { title: "What's your design process?", valueEn: "What is your design process and timeline?" },
    { title: "Do you do development too?", valueEn: "Do you do development as well, or design only?" },
    { title: "How do I start a project?", valueEn: "How can I start a project with Cieden? What's the first step?" },
  ];
  const ONBOARDING_WELCOME_PROMPTS_TOKEN = "__ONBOARDING_WELCOME_PROMPTS__";
  
  const conversations = useQuery(api.conversations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const hasCurrentUser = currentUser !== null && currentUser !== undefined;
  // Convex Auth discovery can fail (middleware logs), but `currentUser`
  // still tells us whether we can actually use auth-backed mutations.
  const canUseChat = hasCurrentUser;
  const createConversation = useMutation(api.conversations.create);
  const createMessage = useMutation(api.messages.create);
  const clearHistory = useMutation(api.messages.clearForConversation);
  const guestId = getGuestIdentityFromCookie()?.guestId;
  // Custom hook for Convex message integration
  const { convexMessages } = useChatMessages({ conversationId });

  // Ensure `conversationId` exists before sending any programmatic message.
  // Otherwise the model output/tool calls can land in "guest" mode and won't
  // render the tool cards until refresh.
  const ensureConversationId = useCallback(async () => {
    if (conversationId) return;
    if (!canUseChat) return;
    if (creatingConversationRef.current) return;

    // Prefer existing conversations if the query already resolved.
    if (Array.isArray(conversations) && conversations.length > 0) {
      setConversationId(conversations[0]._id);
      return;
    }

    creatingConversationRef.current = true;
    try {
      const id = await createConversation({ title: "Voice Chat" });
      setConversationId(id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      creatingConversationRef.current = false;
    }
  }, [conversationId, canUseChat, conversations, createConversation]);

  // Listen to messages coming from the estimate side panel
  useEffect(() => {
    const handler = async (event: Event) => {
      if (!('detail' in event)) return;
      const anyEvent = event as CustomEvent<{ text: string; inputKind?: string; visibility?: "contextual" | "user" }>;
      const payload = anyEvent.detail;
      if (!payload?.text) return;

      const prefix =
        payload.inputKind === "file"
          ? "[ESTIMATE MODE] The user may attach a brief/spec. Focus ONLY on gathering missing inputs for estimation and producing a preliminary design estimate."
          : "[ESTIMATE MODE] Focus ONLY on gathering missing inputs for estimation and producing a preliminary design estimate.";

      const composed = `${prefix}\n\n${payload.text}`;

      try {
        if (payload.visibility === "contextual") {
          // Hidden guidance to the agent (no UI bubble)
          sendContextualUpdate?.(composed);
          // Avoid spamming Convex with high-frequency "hidden" estimate state updates.
          // These updates are needed to guide the assistant, but they don't need to be persisted
          // as system/contextual messages in the chat history.
          const isHighFrequencyHiddenEstimate =
            composed.includes("UI_DRAFT_ESTIMATE (hidden):") ||
            composed.includes("ESTIMATE STATE UPDATE (hidden):");

          if (conversationId && !isHighFrequencyHiddenEstimate) {
            await createMessage({
              conversationId,
              content: composed,
              role: "system",
              source: "contextual",
                guestId: guestId ?? undefined,
            });
          }
          return;
        }

        // Visible user message: drives the dialogue
        if (!sendProgrammaticMessage) {
          pendingEstimateAssistantUserMessagesRef.current.push(composed);
          return;
        }
        await sendProgrammaticMessage(composed);
      } catch (error) {
        console.error("Failed to send estimate panel message to assistant:", error);
      }
    };

    window.addEventListener("estimate-assistant-message", handler as EventListener);
    return () => window.removeEventListener("estimate-assistant-message", handler as EventListener);
  }, [sendProgrammaticMessage, sendContextualUpdate, conversationId, createMessage]);

  // Flush queued estimate assistant "user" messages once programmatic sending is ready.
  useEffect(() => {
    if (!sendProgrammaticMessage) return;
    if (pendingEstimateAssistantUserMessagesRef.current.length === 0) return;

    const run = async () => {
      while (pendingEstimateAssistantUserMessagesRef.current.length > 0) {
        const text = pendingEstimateAssistantUserMessagesRef.current.shift();
        if (!text) break;
        try {
          await sendProgrammaticMessage(text);
        } catch (err) {
          console.error("Failed to flush queued estimate assistant message:", err);
        }
      }
    };

    void run();
  }, [sendProgrammaticMessage]);

  // Flush queued quick prompt once programmatic sending becomes ready.
  useEffect(() => {
    if (!sendProgrammaticMessage || !pendingQuickPrompt) return;
    // If authenticated but conversation isn't ready yet, do not send;
    // otherwise we land in "guest" mode and tool cards won't render.
    if (canUseChat && !conversationId) return;
    const value = pendingQuickPrompt;
    console.log("🎯 Flushing queued quick prompt:", {
      value,
      canUseChat,
      conversationId,
    });
    setPendingQuickPrompt(null);
    void sendProgrammaticMessage(value).catch((err) => {
      console.error("Failed to flush queued quick prompt:", err);
    });
  }, [sendProgrammaticMessage, pendingQuickPrompt, canUseChat, conversationId]);

  const sendQuickPrompt = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      // If user is authenticated but conversationId isn't ready yet,
      // initialize it so the send happens in the correct (Convex-backed) mode.
      // In that situation we MUST queue; otherwise we'd send in guest mode and
      // tool cards won't render until refresh.
      if (canUseChat && !conversationId) {
        console.log("⏳ Queue quick prompt until conversation ready:", {
          value: trimmed,
          canUseChat,
          conversationId,
        });
        void ensureConversationId();
        setPendingQuickPrompt(trimmed);
        return;
      }

      if (sendProgrammaticMessage) {
        void sendProgrammaticMessage(trimmed);
        return;
      }

      // conversationId might be null (guest/onboarding). Queue until unified input
      // exposes the programmatic send function.
      setPendingQuickPrompt(trimmed);
    },
    [sendProgrammaticMessage, canUseChat, conversationId, ensureConversationId],
  );

  // Lightweight onboarding state: chat is always available immediately.
  // We only use helper assistant prompts in-stream (non-blocking).
  type OnboardingStep = "ask_name" | "ask_email" | "creating" | "done";
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("done");
  const [onboardingMessages, setOnboardingMessages] = useState<ChatbotMessage[]>([]);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingEmail, setOnboardingEmail] = useState("");
  const hasInjectedWelcomeRef = useRef(false);
  const hasAskedEmailRef = useRef(false);
  const rememberedNameRef = useRef(false);
  const rememberedEmailRef = useRef(false);

  // `isAuthenticated()` discovery can fail, but for message sending we must
  // have a real authenticated Convex identity (`currentUser`).
  // Otherwise conversation creation / message persistence won't work.
  const chatReady = canUseChat;

  // Unified display name for bubbles ("You" replacement)
  const userDisplayName =
    onboardingName ||
    currentUser?.name ||
    currentUser?.email ||
    "You";

  const userEmailDisplay =
    onboardingEmail ||
    currentUser?.email ||
    "";

  // Restore preferred display name for guest/soft-onboarding flows.
  useEffect(() => {
    if (rememberedNameRef.current) return;
    if (typeof window === "undefined") return;
    const savedName = window.localStorage.getItem("cieden_preferred_name");
    if (!savedName) return;
    const normalized = savedName.trim();
    if (!normalized) return;
    rememberedNameRef.current = true;
    setOnboardingName(normalized);
  }, []);

  useEffect(() => {
    if (rememberedEmailRef.current) return;
    if (typeof window === "undefined") return;
    const savedEmail = window.localStorage.getItem("cieden_preferred_email");
    if (!savedEmail) return;
    const normalized = savedEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    rememberedEmailRef.current = true;
    setOnboardingEmail(normalized);
  }, []);

  // Non-blocking welcome message in the normal chat stream.
  useEffect(() => {
    if (hasInjectedWelcomeRef.current) return;
    if (onboardingMessages.length > 0) return;
    hasInjectedWelcomeRef.current = true;
    setOnboardingMessages([
      {
        id: `onb-${Date.now()}`,
        role: "assistant",
        content:
          "Hi! Welcome to Cieden. I am your AI design assistant. How would you like me to address you?",
        timestamp: Date.now(),
      },
    ]);
  }, [onboardingMessages.length]);

  // If auth discovery fails but Convex still recognizes an existing session,
  // `isAuthenticated` can temporarily stay false. In that case, prefer
  // `currentUser` to decide whether to show onboarding.
  // We show the onboarding UI only until we finish name+email input.
  // After that, we render the main chat UI even if Convex Auth is temporarily
  // broken (guest persistence will take over).
  const shouldShowOnboarding = false;
  const disableQuickPrompts = false;

  const pushWelcomePromptsIfMissing = useCallback(() => {
    setOnboardingMessages((prev) => {
      if (prev.some((m) => m.content === ONBOARDING_WELCOME_PROMPTS_TOKEN)) return prev;
      return [
        ...prev,
        {
          id: `onb-welcome-${Date.now()}`,
          role: "assistant",
          content: ONBOARDING_WELCOME_PROMPTS_TOKEN,
          timestamp: Date.now(),
        },
      ];
    });
  }, []);

  // If the user is already authenticated (or onboarding is marked done via cookie),
  // ensure we exit onboarding UI state so quick prompts/buttons appear.
  useEffect(() => {
    if (!canUseChat) return;

    const cookieDone =
      typeof document !== "undefined" &&
      document.cookie.includes("cieden_onboarding_done=1");
    const hasProfileIdentity = Boolean(currentUser?.name || currentUser?.email);

    if ((cookieDone || hasProfileIdentity) && onboardingStep !== "done") {
      setOnboardingStep("done");
      pushWelcomePromptsIfMissing();
    }
  }, [canUseChat, currentUser?.name, currentUser?.email, onboardingStep, pushWelcomePromptsIfMissing]);

  // Ensure conversation exists immediately after onboarding becomes "done".
  // Without this, first-load races can leave `conversationId === null` while
  // onboarding UI is already in the "done" state, which then breaks sending.
  useEffect(() => {
    if (!canUseChat) return;
    if (onboardingStep !== "done") return;
    if (conversationId) return;
    void ensureConversationId();
  }, [canUseChat, onboardingStep, conversationId, ensureConversationId]);

  // Soft contact capture: ask for email later in the conversation, without blocking chat.
  useEffect(() => {
    if (hasAskedEmailRef.current) return;
    if (userEmailDisplay) return;
    const meaningfulUserMessages = (convexMessages || []).filter(
      (m) =>
        m.role === "user" &&
        !(m.role === "system" && m.source === "contextual") &&
        !/onboarding complete\./i.test((m.content || "").trim()),
    );
    if (meaningfulUserMessages.length < 5) return;

    const detectCyrillic = (value: string) => /[А-Яа-яІіЇїЄєҐґ]/.test(value);
    const recentText = meaningfulUserMessages.slice(-3).map((m) => m.content || "").join(" ");
    const promptIsUkrainian = detectCyrillic(recentText);
    hasAskedEmailRef.current = true;
    setOnboardingMessages((prev) => [
      ...prev,
      {
        id: `contact-email-${Date.now()}`,
        role: "assistant",
        content:
          promptIsUkrainian
            ? "Якщо зручно, можете залишити email. Так нам буде легше надіслати підсумок і повернутись до деталей проєкту пізніше. Це опційно."
            : "If it is convenient, you can share your email so we can follow up with a concise project summary later. Totally optional.",
        timestamp: Date.now(),
      },
    ]);
  }, [convexMessages, userEmailDisplay]);

  // Handle pre-auth messages (name + email) coming from the main chat input
  const handlePreAuthMessage = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;

      // If auth is already ready but onboarding UI state is still not "done",
      // avoid repeating sign-in. Just finish onboarding UX and show
      // welcome quick prompts again.
      if (canUseChat) {
        // Auth can become ready slightly before conversation initialization finishes.
        // Do not drop the first user message in this window: queue it and flush
        // when conversationId + programmatic sender are both ready.
        if (!conversationId) {
          setPendingQuickPrompt((prev) => prev ?? value);
          setOnboardingMessages((prev) => {
            const alreadyHasSetupNotice = prev.some((m) =>
              /setting everything up/i.test(m.content),
            );
            if (alreadyHasSetupNotice) return prev;
            return [
              ...prev,
              {
                id: `onb-assistant-${Date.now()}`,
                role: "assistant",
                content: "Great, finalizing your chat setup...",
                timestamp: Date.now(),
              },
            ];
          });
          void ensureConversationId();
          return;
        }

        setOnboardingStep("done");
        pushWelcomePromptsIfMissing();
        return;
      }

      console.log("🔐 [preAuth] input:", { step: onboardingStep, valuePreview: value.slice(0, 60) });

      const userMessage: ChatbotMessage = {
        id: `onb-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content: value,
        timestamp: Date.now(),
      };
      setOnboardingMessages((prev) => [...prev, userMessage]);

      if (onboardingStep === "ask_name") {
        setOnboardingName(value);
        setOnboardingStep("ask_email");
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `onb-assistant-${Date.now()}`,
            role: "assistant",
            content: `Nice to meet you, ${value}! Now, could you share your email? Our team might reach out to discuss your project.`,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      if (onboardingStep === "ask_email") {
        const email = value.trim();

        // Basic email validation to prevent invalid formats
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          console.warn("🔐 [preAuth] invalid email format:", email);
          setOnboardingMessages((prev) => [
            ...prev,
            {
              id: `onb-assistant-${Date.now()}`,
              role: "assistant",
              content:
                "It looks like this is not a valid email address. Please enter it in the format name@example.com so our team can reach you.",
              timestamp: Date.now(),
            },
          ]);
          return;
        }

        setOnboardingEmail(email);
        setOnboardingStep("creating");
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `onb-assistant-${Date.now()}`,
            role: "assistant",
            content: `Thank you, ${onboardingName || "there"}! Setting everything up for you...`,
            timestamp: Date.now(),
          },
        ]);

        try {
          // Always create a guest identity upfront so we can persist the chat
          // even if Convex Auth discovery fails.
          const guestIdentity = ensureGuestIdentityInCookie({
            email,
            name: onboardingName || "Guest",
          });

          const authBroken =
            typeof window !== "undefined" &&
            window.sessionStorage.getItem("cieden_convex_auth_broken") === "1";

          if (authBroken) {
            const displayName = onboardingName || "Guest";
            const id = await createConversation({
              title: "Voice Chat",
              guestId: guestIdentity.guestId,
              guestEmail: email,
              guestName: displayName,
            });

            setConversationId(id);
            setOnboardingStep("done");
            setPendingOnboardingKickoff(true);
            pushWelcomePromptsIfMissing();
            return;
          }

          // Use password signUp for onboarding so authAccounts contains the expected secret.
          // This avoids missing fields after Convex migrations.
          const generatedPassword = `cieden_guest_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

          const displayName = onboardingName || "Guest";
          console.log("🔐 [preAuth] signIn attempt (password signUp):", {
            email,
            name: displayName,
          });

          await signIn("password", {
            email,
            password: generatedPassword,
            name: displayName,
            flow: "signUp",
          } as any);

          setOnboardingStep("done");
          setPendingOnboardingKickoff(true);
          pushWelcomePromptsIfMissing();
        } catch (err: unknown) {
          const errorPayload: any = err as any;
          console.error("❌ [preAuth] anonymous signIn failed:", {
            email,
            name: onboardingName || "Guest",
            error: errorPayload,
          });

          const errorMsg = errorPayload?.message || String(errorPayload);

          const guestIdentity = ensureGuestIdentityInCookie({
            email,
            name: onboardingName || "Guest",
          });

          if (typeof window !== "undefined") {
            const isDiscoveryFailed =
              errorPayload?.code === "AuthProviderDiscoveryFailed" ||
              /AuthProviderDiscoveryFailed/i.test(errorMsg);
            if (isDiscoveryFailed) {
              window.sessionStorage.setItem("cieden_convex_auth_broken", "1");
            }
          }

          // If this email already exists or create fails, retry with a unique fallback email.
          // This mirrors the robustness used in `OnboardingChat.tsx`.
          if (
            /already exists|Could not create/i.test(errorMsg)
          ) {
            try {
              const parts = email.split("@");
              const local = parts[0] || "guest";
              const domain = parts[1] || "cieden.guest";
              const fallbackEmail = `${local}+${Date.now()}@${domain}`;
              const fallbackPassword = `cieden_${Date.now()}`;
              const displayName = onboardingName || "Guest";

              console.log("🔁 [preAuth] password signUp fallback:", {
                fallbackEmail,
                name: displayName,
              });

              await signIn("password", {
                email: fallbackEmail,
                password: fallbackPassword,
                name: displayName,
                flow: "signUp",
              } as any);

              setOnboardingStep("done");
              setPendingOnboardingKickoff(true);
              pushWelcomePromptsIfMissing();
              return;
            } catch (fallbackErr) {
              console.error("❌ [preAuth] password signUp fallback failed:", fallbackErr);
            }
          }

          // Robust solution:
          // If Convex Auth still isn't usable, we switch to guest persistence.
          // This guarantees messages + email visibility in Convex even when
          // auth provider discovery fails.
          try {
            const displayName = onboardingName || "Guest";
            const id = await createConversation({
              title: "Voice Chat",
              guestId: guestIdentity.guestId,
              guestEmail: email,
              guestName: displayName,
            });

            setConversationId(id);
            setOnboardingStep("done");
            setPendingOnboardingKickoff(true);
            pushWelcomePromptsIfMissing();
          } catch (guestErr) {
            console.error("❌ [preAuth] guest persistence failed:", guestErr);
            setOnboardingStep("ask_email");
            setOnboardingMessages((prev) => [
              ...prev,
              {
                id: `onb-auth-failed-${Date.now()}`,
                role: "assistant",
                content:
                  "Auth setup failed and guest persistence failed. Please try again with a different email (or refresh the page).",
                timestamp: Date.now(),
              },
            ]);
            setPendingOnboardingKickoff(false);
          }
        }
      }
    },
    [
      canUseChat,
      conversationId,
      ensureConversationId,
      onboardingStep,
      onboardingName,
      signIn,
      createConversation,
      pushWelcomePromptsIfMissing,
    ],
  );

  // After successful client-side auth (name+email), start the actual chat immediately.
  useEffect(() => {
    if (!pendingOnboardingKickoff) return;
    if (!sendProgrammaticMessage) return;

    setPendingOnboardingKickoff(false);

    void (async () => {
      const safeName = (onboardingName || "Guest").trim();
      markOnboardingDoneCookie();
      // Kickoff message should include identity so agent "sees" who signed in.
      try {
        console.log("🚀 [onboarding] kickoff sendProgrammaticMessage...");
        await sendProgrammaticMessage(
          `Onboarding complete. The client signed in as "${safeName}". Email: "${onboardingEmail || "unknown"}". Start the conversation now and ask what they need for their project.`
        );
        console.log("✅ [onboarding] kickoff sent");
      } catch (e) {
        console.error("❌ [onboarding] kickoff send failed:", e);
      }
    })();
  }, [pendingOnboardingKickoff, sendProgrammaticMessage, onboardingName, onboardingEmail, onboardingStep, markOnboardingDoneCookie]);

  // Once Convex conversation is available, tool calls that were temporarily
  // queued into onboardingMessages must be removed to prevent duplicates.
  useEffect(() => {
    if (!conversationId) return;
    setOnboardingMessages((prev) => prev.filter((m) => !parseToolCall(m.content)));
  }, [conversationId]);

  // (scroll is handled via scrollContainerRef in scrollToBottom / forceScrollToBottom)

  // Sync Convex messages to CopilotKit for chart actions only
  useConvexMessageSync({ conversationId });

  // Make conversation context available to CopilotKit
  useCopilotReadable({
    description: "Current conversation ID for saving financial charts",
    value: conversationId || "No conversation selected"
  });

  // === CIEDEN SALES ASSISTANT ACTIONS ===
  // 1) Portfolio / cases list
  useCopilotAction({
    name: "showCases",
    description:
      "Show Cieden case studies / portfolio in a compact card layout. Use when user asks about examples of work, portfolio, or case studies.",
    parameters: [],
    handler: async () => {
      return "Showing selected case studies from Cieden portfolio.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <CasesGrid />
      </div>
    ),
  });

  // 2) Specific case details
  // (Deprecated in favour of side panel navigation; keep CaseStudyPanel for detailed view)

  // 3) Best / highlight case
  useCopilotAction({
    name: "showBestCase",
    description:
      "Show the most impressive or most relevant Cieden case study for this user. Use when the user asks for the best / strongest example.",
    parameters: [],
    handler: async () => {
      return "Showing one flagship case study that best illustrates our impact.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <BestCaseCard />
      </div>
    ),
  });

  // 4) Engagement / pricing models
  useCopilotAction({
    name: "showEngagementModels",
    description:
      "Show the main collaboration and pricing models Cieden works with (Time & Material, Partnership, Dedicated team). Use when user asks how we work or pricing models.",
    parameters: [],
    handler: async () => {
      // Render handled by `render` below; return empty to avoid extra text bubble.
      return "";
    },
    // Avoid CopilotKit inline rendering; rely on TOOL_CALL -> ToolCallMessageRenderer.
    render: () => <></>,
  });

  // 5) Generate preliminary estimate card
  useCopilotAction({
    name: "generateEstimate",
    description:
      "Generate a preliminary cost estimate card for a design or design+development project, based on product type, complexity and scope. Always treat this as a rough range, not a final quote.",
    parameters: [
      {
        name: "productType",
        type: "string",
        description: "Product type: web app, mobile app, B2B SaaS, marketplace, internal tool, etc.",
        required: false,
      },
      {
        name: "complexity",
        type: "string",
        description: "Rough complexity: low / medium / high.",
        required: false,
      },
      {
        name: "scope",
        type: "string",
        description: "Design only or design + development, and high-level feature list.",
        required: false,
      },
      {
        name: "timeline",
        type: "string",
        description: "Desired timeline (e.g. 2-3 months, 3-6 months).",
        required: false,
      },
      {
        name: "budgetHint",
        type: "number",
        description: "Optional budget hint from the user (in USD).",
        required: false,
      },
    ],
    // Simple heuristic for rough ranges; this is not a contract quote.
    handler: async ({
      productType,
      complexity,
      scope,
      timeline,
      budgetHint,
    }: {
      productType?: string;
      complexity?: string;
      scope?: string;
      timeline?: string;
      budgetHint?: number;
    }) => {
      // Base in thousands USD
      let base = 25;
      if (complexity === "low") base = 15;
      if (complexity === "high") base = 40;
      if (productType && /mobile|two platforms|web \+ mobile/i.test(productType)) {
        base += 10;
      }
      if (scope && /development|full/i.test(scope)) {
        base += 20;
      }
      if (budgetHint && budgetHint > 0) {
        // Softly pull towards provided budget
        base = (base * 0.6 + budgetHint / 1000 * 0.4);
      }
      const from = Math.round(base * 0.8) * 1000;
      const to = Math.round(base * 1.3) * 1000;
      return `Preliminary estimate between ${from} and ${to} USD. This is a rough range, not a final quote.`;
    },
    render: ({ args, result }) => {
      // Parse back our approximate numbers if available, otherwise just default band.
      const match = typeof result === "string" ? result.match(/between (\d+) and (\d+)/) : null;
      const from = match ? Number(match[1]) : 20000;
      const to = match ? Number(match[2]) : 40000;
      return (
        <div className="w-full max-w-4xl mx-auto">
          <EstimateSummaryCard
            productType={args.productType}
            complexity={args.complexity}
            scope={args.scope}
            timeline={args.timeline}
            rangeFrom={from}
            rangeTo={to}
          />
        </div>
      );
    },
  });

  // 6) Lightweight “calculator” – more like an entry point card
  useCopilotAction({
    name: "openCalculator",
    description:
      "Open an interactive-style cost/effort calculator card. Use when the user explicitly asks for a calculator or wants to play with options.",
    parameters: [],
    handler: async () => {
      return "Opened a simple estimator card; you can now ask the assistant to adjust assumptions.";
    },
    // IMPORTANT: do not render EngagementModelsCard inline here.
    // Bridge handler queues `TOOL_CALL:open_calculator` which is rendered by
    // `ToolCallMessageRenderer`. Rendering here too causes duplicates.
    render: () => <></>,
  });

  // CopilotKit action for creating pie charts
  useCopilotAction({
    name: "createFinancialPieChart",
    description: "Create a pie chart for financial data visualization - perfect for expense breakdowns and portfolio allocation. Use this when users ask for pie charts, expense breakdowns, or budget visualization.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Chart title (e.g. 'Monthly Expenses Breakdown')",
        required: true
      },
      {
        name: "data",
        type: "object[]",
        description: "Array of data points for the pie chart",
        required: true,
        items: {
          type: "object",
          attributes: [
            {
              name: "name",
              type: "string", 
              description: "Category name (e.g. 'Food', 'Rent')",
              required: true
            },
            {
              name: "value",
              type: "number",
              description: "Amount/value for the category",
              required: true
            },
            {
              name: "category",
              type: "string",
              description: "Optional subcategory",
              required: false
            }
          ]
        }
      }
    ],
    handler: async ({ title, data }) => {
      if (!conversationId) {
        throw new Error("No conversation selected");
      }

      // Create chart in Convex database
      await createChart({
        type: "pie",
        title,
        data,
        conversationId
      });

      return `Created pie chart: ${title}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Creating pie chart...</div>;
      }
      
      // For demo purposes, show chart inline
      return (
        <ChartMessage
          chart={{
            _id: `temp-${Date.now()}` as Id<"charts">,
            type: "pie",
            title: args.title,
            data: args.data,
            conversationId: conversationId!,
            _creationTime: Date.now()
          }}
          compact={true}
        />
      );
    }
  });

  // CopilotKit action for creating bar charts  
  useCopilotAction({
    name: "createFinancialBarChart",
    description: "Create a bar chart for comparing financial data over time - ideal for income vs expenses and trend analysis. Use this when users ask for bar charts, income comparisons, or time-based analysis.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Chart title (e.g. 'Income vs Expenses - Last 6 Months')",
        required: true
      },
      {
        name: "data", 
        type: "object[]",
        description: "Array of time-series or categorical data",
        required: true,
        items: {
          type: "object",
          attributes: [
            {
              name: "period",
              type: "string",
              description: "Time period or category (e.g. 'Jan 2024')",
              required: true
            },
            {
              name: "income",
              type: "number", 
              description: "Income amount (optional)",
              required: false
            },
            {
              name: "expenses",
              type: "number",
              description: "Expenses amount (optional)", 
              required: false
            },
            {
              name: "value",
              type: "number",
              description: "Single value (optional)",
              required: false
            }
          ]
        }
      }
    ],
    handler: async ({ title, data }) => {
      if (!conversationId) {
        throw new Error("No conversation selected");
      }

      // Create chart in Convex database
      await createChart({
        type: "bar",
        title,
        data,
        conversationId
      });

      return `Created bar chart: ${title}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Creating bar chart...</div>;
      }
      
      // For demo purposes, show chart inline
      return (
        <ChartMessage
          chart={{
            _id: `temp-${Date.now()}` as Id<"charts">,
            type: "bar",
            title: args.title,
            data: args.data,
            conversationId: conversationId!,
            _creationTime: Date.now()
          }}
          compact={true}
        />
      );
    }
  });

  const createChart = useMutation(api.charts.create);

  // Set mounted state to true on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track onboarding completion to trigger re-render
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Cases side panel (domain filter → case detail; or open specific case from card)
  const [activePanelDomain, setActivePanelDomain] = useState<string | null>(null);
  const [initialPanelCaseId, setInitialPanelCaseId] = useState<string | null>(null);
  // Remember scroll position when opening cases panel so we can restore it on close.
  const casesScrollTopRef = useRef<number>(0);

  // About Cieden side panel
  const [showAboutPanel, setShowAboutPanel] = useState(false);
  const [activePricingModelId, setActivePricingModelId] = useState<PricingModelDetailsId | null>(null);

  // Estimate wizard side panel (unified for generate_estimate / open_calculator)
  const [showEstimatePanel, setShowEstimatePanel] = useState(false);
  const [estimatePanelKey, setEstimatePanelKey] = useState(0);
  const [showEstimateInline, setShowEstimateInline] = useState(false);
  const [estimateFinalResult, setEstimateFinalResult] = useState<EstimateFinalResult | null>(null);
  const [showEstimateAssistantRunner, setShowEstimateAssistantRunner] = useState(false);
  const [estimateFlowToken, setEstimateFlowToken] = useState(0);
  const estimateFlowTokenRef = useRef(estimateFlowToken);

  useEffect(() => {
    estimateFlowTokenRef.current = estimateFlowToken;
  }, [estimateFlowToken]);

  // Bridge + useTextInput: true while side panel is visible OR assistant-driven estimate flow is active.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flowActive =
      showEstimatePanel || showEstimateAssistantRunner || showEstimateInline;
    (window as unknown as { __ciedenEstimatePanelOpen?: boolean }).__ciedenEstimatePanelOpen =
      flowActive;
  }, [showEstimatePanel, showEstimateAssistantRunner, showEstimateInline]);

  // Tell the ElevenLabs agent when the estimate side panel opens/closes (UI truth vs. last reply).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const PANEL_OPENED_MSG =
      "[UI ESTIMATE] The estimate side panel is now visible on the right. You may refer to the questionnaire or results there.";

    const PANEL_CLOSED_MSG =
      "[UI ESTIMATE] The estimate side panel is now CLOSED (not visible). Do not say the questionnaire or results are open on the right. If the user wants a new estimate, call open_calculator or generate_estimate again.";

    const ASSISTANT_RUNNER_CLOSED_MSG =
      "[UI ESTIMATE] The user closed the estimate flow (assistant Q&A in chat). Do not assume you are still collecting estimate inputs. If they want a new estimate, call open_calculator or generate_estimate again.";

    const onOpened = () => {
      sendContextualUpdateRef.current?.(PANEL_OPENED_MSG);
    };

    const onClosed = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      (window as unknown as { __ciedenEstimatePanelClosedAt?: number }).__ciedenEstimatePanelClosedAt =
        Date.now();
      const msg = reason === "assistant-runner" ? ASSISTANT_RUNNER_CLOSED_MSG : PANEL_CLOSED_MSG;
      sendContextualUpdateRef.current?.(msg);
    };

    window.addEventListener("estimate-panel-opened", onOpened);
    window.addEventListener("estimate-panel-closed", onClosed);
    return () => {
      window.removeEventListener("estimate-panel-opened", onOpened);
      window.removeEventListener("estimate-panel-closed", onClosed);
    };
  }, []);

  // Inline estimate UI events (chat feed) -> side panel opening only at the final step.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleInlineActive = (e: Event) => {
      const detail = (e as CustomEvent<{ active?: boolean }>).detail;
      setShowEstimateInline(!!detail?.active);
    };

    const bumpToken = () => {
      const next = estimateFlowTokenRef.current + 1;
      estimateFlowTokenRef.current = next;
      setEstimateFlowToken(next);
    };

    const handleChooseQuick = (e: Event) => {
      // Open the right-side questionnaire panel immediately.
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(true);
      setShowEstimateAssistantRunner(false);
      setEstimateFinalResult(null);
      setShowEstimatePanel(true);
      setShowEstimateInline(false);
      setEstimatePanelKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("estimate-panel-opened"));
    };

    const handleChooseAssistant = (e: Event) => {
      // No side panel while assistant is collecting info.
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(true);
      setShowEstimatePanel(false);
      setEstimateFinalResult(null);
      setShowEstimateInline(false);
      setEstimatePanelKey((prev) => prev + 1);
      setShowEstimateAssistantRunner(true);
    };

    const handleEstimateFinal = (e: Event) => {
      const detail = (e as CustomEvent<{ token?: number } & EstimateFinalResult>).detail;
      if (!detail) return;

      const token = typeof detail.token === "number" ? detail.token : null;
      if (token !== estimateFlowTokenRef.current) return;

      markCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(true);
      setEstimateFinalResult(detail);
      setShowEstimatePanel(true);
      setShowEstimateInline(false);
      setShowEstimateAssistantRunner(false);
      setEstimatePanelKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("estimate-panel-opened"));
    };

    const handleCancel = () => {
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(false);
      setShowEstimatePanel(false);
      setEstimateFinalResult(null);
      setShowEstimateInline(false);
      setShowEstimateAssistantRunner(false);
      window.dispatchEvent(new CustomEvent("estimate-panel-closed", { detail: { reason: "cancel" } }));
    };

    window.addEventListener("estimate-inline-active-change", handleInlineActive);
    window.addEventListener("estimate-choose-quick", handleChooseQuick);
    window.addEventListener("estimate-choose-assistant", handleChooseAssistant);
    window.addEventListener("estimate-cancel", handleCancel);
    window.addEventListener("estimate-final-ready", handleEstimateFinal);
    return () => {
      window.removeEventListener("estimate-inline-active-change", handleInlineActive);
      window.removeEventListener("estimate-choose-quick", handleChooseQuick);
      window.removeEventListener("estimate-choose-assistant", handleChooseAssistant);
      window.removeEventListener("estimate-cancel", handleCancel);
      window.removeEventListener("estimate-final-ready", handleEstimateFinal);
    };
  }, []);

  /** Closing the final-result side panel must NOT run full estimate-cancel (chat card stays). */
  const dismissFinalEstimatePanel = useCallback(() => {
    setEstimateFlowWindowFlag(false);
    setShowEstimatePanel(false);
    setEstimateFinalResult(null);
    setShowEstimateInline(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("estimate-panel-closed", { detail: { reason: "final-panel" } }));
    }
  }, []);

  // Let message renderers know whether cases panel is open.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__ciedenCasesPanelOpen = !!activePanelDomain;
    (window as any).__ciedenCasesPanelOpenDomain = activePanelDomain;
  }, [activePanelDomain]);

  // Universal typing bubble (like ChatGPT):
  // If the latest non-contextual message is from the user → show bubble.
  // Once an assistant reply arrives → hide bubble.
  const lastUserTypingMessageIdRef = useRef<string | null>(null);

  // During onboarding (ask_name / ask_email / creating) we render pre-auth prompts
  // from `onboardingMessages`. So we must force-hide the universal typing bubble,
  // otherwise it can get "stuck" because convexMessages isn't updated yet.
  useEffect(() => {
    if (onboardingStep === "done") return;
    lastUserTypingMessageIdRef.current = null;
    setEstimateTyping({ active: false, label: "" });
    setPendingAssistantBubble(false);
  }, [onboardingStep]);

  useEffect(() => {
    // While name/email onboarding is active, history comes from `onboardingMessages`
    // only. Convex can still load an existing thread (e.g. conversations[0]) whose
    // last message is from the user — that would turn on the universal typing bubble
    // with no follow-up assistant row → stuck dots under the welcome prompt.
    if (onboardingStep !== "done") {
      lastUserTypingMessageIdRef.current = null;
      setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
      setPendingAssistantBubble(false);
      return;
    }

    const visible = (convexMessages || []).filter(
      (m) => !(m.role === "system" && m.source === "contextual"),
    );
    const last = visible.at(-1);
    const lastContent = (last as any)?.content;
    const isLastToolCall = !!(typeof lastContent === "string" && parseToolCall(lastContent));

    // If the latest visible message is a TOOL_CALL card, we should not show
    // a typing indicator after it (tool cards can appear before the assistant
    // "final" reply text is persisted).
    if (isLastToolCall) {
      lastUserTypingMessageIdRef.current = null;
      if (typingHoldTimeoutRef.current) clearTimeout(typingHoldTimeoutRef.current);
      typingHoldTimeoutRef.current = null;
      setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
      setPendingAssistantBubble(false);
      return;
    }

    if (last?.role === "user") {
      const lastId = (last as any)?._id as string | undefined;
      // Only show the typing bubble when we actually transitioned into a *new* user message.
      // This prevents flicker when Convex re-renders without adding a new user message.
      if (lastId && lastId === lastUserTypingMessageIdRef.current) return;
      lastUserTypingMessageIdRef.current = lastId ?? null;
      setEstimateTyping({ active: true, label: "Assistant is typing…" });
      setPendingAssistantBubble(true);
    } else if (last?.role === "assistant") {
      lastUserTypingMessageIdRef.current = null;
      // Small anti-flicker hold: keep bubble briefly if reply is extremely fast.
      const remaining = typingHoldUntilRef.current - Date.now();
      if (remaining > 0) {
        if (typingHoldTimeoutRef.current) clearTimeout(typingHoldTimeoutRef.current);
        typingHoldTimeoutRef.current = setTimeout(() => {
          setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
          setPendingAssistantBubble(false);
        }, remaining);
        return;
      }
      if (typingHoldTimeoutRef.current) clearTimeout(typingHoldTimeoutRef.current);
      typingHoldTimeoutRef.current = null;
      setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
      setPendingAssistantBubble(false);
    }
  }, [convexMessages, onboardingStep]);

  // Fallback typing indicator: if panel is open and last visible message is from user,
  // show "thinking" bubble above input even if events are missed.
  useEffect(() => {
    if (onboardingStep !== "done") {
      return;
    }
    if (!showEstimatePanel) {
      setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
      return;
    }
    const visible = (convexMessages || []).filter(
      (m) => !(m.role === "system" && m.source === "contextual"),
    );
    const last = visible.at(-1);
    if (last?.role === "user") {
      setEstimateTyping({ active: true, label: "Generating estimate…" });
    } else if (last?.role === "assistant") {
      setEstimateTyping((prev) => (prev.active ? { active: false, label: "" } : prev));
    }
  }, [convexMessages, showEstimatePanel, onboardingStep]);
  // Side panel opens only when EstimateWizardPanel reports final results (inline flow completion).

  useEffect(() => {
    const handleCasesPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const domain = detail?.domain;
      if (domain) {
        if (typeof window !== "undefined") {
          // When opening from tool call, allow auto-open again unless the user manually closes.
          (window as any).__ciedenCasesPanelUserClosed = false;
          (window as any).__ciedenCasesPanelOpen = true;
          (window as any).__ciedenCasesPanelOpenDomain = domain;
        }
        const el = scrollContainerRef.current;
        if (el) casesScrollTopRef.current = el.scrollTop;
        setActivePanelDomain(domain);
        setInitialPanelCaseId(detail?.caseId ?? null);
      }
    };
    const handleOpenCaseInPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const domain = detail?.domain;
      const caseId = detail?.caseId;
      if (domain && caseId) {
        if (typeof window !== "undefined") {
          (window as any).__ciedenCasesPanelUserClosed = false;
          (window as any).__ciedenCasesPanelOpen = true;
          (window as any).__ciedenCasesPanelOpenDomain = domain;
        }
        const el = scrollContainerRef.current;
        if (el) casesScrollTopRef.current = el.scrollTop;
        setActivePanelDomain(domain);
        setInitialPanelCaseId(caseId);
      }
    };
    window.addEventListener("open-cases-panel", handleCasesPanel);
    window.addEventListener("open-case-in-panel", handleOpenCaseInPanel);
    return () => {
      window.removeEventListener("open-cases-panel", handleCasesPanel);
      window.removeEventListener("open-case-in-panel", handleOpenCaseInPanel);
    };
  }, []);

  // Open About Cieden panel from about card
  useEffect(() => {
    const handleOpenAbout = () => setShowAboutPanel(true);
    window.addEventListener("open-about-panel", handleOpenAbout);
    return () => window.removeEventListener("open-about-panel", handleOpenAbout);
  }, []);

  useEffect(() => {
    const handleOpenPricingModelDetails = (e: Event) => {
      const detail = (e as CustomEvent<{ modelId?: PricingModelDetailsId }>).detail;
      if (!detail?.modelId) return;
      setActivePricingModelId(detail.modelId);
      if (sendContextualUpdateRef.current) {
        sendContextualUpdateRef.current(
          `User clicked 'Learn more' for ${detail.modelId.replace(/-/g, " ")} pricing model.`,
        );
      }
    };

    const handleCompareRequested = (e: Event) => {
      const detail = (e as CustomEvent<{ modelTitle?: string }>).detail;
      if (sendContextualUpdateRef.current) {
        const targetModel = detail?.modelTitle ?? "selected model";
        sendContextualUpdateRef.current(
          `User wants to compare collaboration models after viewing ${targetModel}. Ask 2-3 short qualification questions and recommend best fit.`,
        );
      }
      setActivePricingModelId(null);
    };

    window.addEventListener("open-pricing-model-details-panel", handleOpenPricingModelDetails);
    window.addEventListener("pricing-model-compare-requested", handleCompareRequested);
    return () => {
      window.removeEventListener("open-pricing-model-details-panel", handleOpenPricingModelDetails);
      window.removeEventListener("pricing-model-compare-requested", handleCompareRequested);
    };
  }, []);

  const closeCasesPanel = useCallback(() => {
    if (typeof window !== "undefined") {
      (window as any).__ciedenCasesPanelUserClosed = true;
      (window as any).__ciedenCasesPanelOpen = false;
      (window as any).__ciedenCasesPanelLastDismissedDomain = activePanelDomain;
      (window as any).__ciedenCasesPanelClosedAt = Date.now();
    }
    setActivePanelDomain(null);
    setInitialPanelCaseId(null);
    // Restore chat scroll position so user can continue from where they left.
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      el.scrollTop = casesScrollTopRef.current;
    });
  }, [activePanelDomain]);

  // Get queueToolMessage from provider context - must be called inside provider tree
  // We'll use a ref to make it accessible to actionHandlers defined outside the provider
  const queueToolMessageRef = useRef<((content: string, metadata?: Record<string, any>) => void) | null>(null);

  // Some tool parameters can contain unserializable values (e.g. BigInt, circular refs).
  // We still want to render the tool cards, so we always produce valid JSON payloads.
  const safeJSONStringify = useCallback((value: unknown) => {
    try {
      return JSON.stringify(value ?? {});
    } catch (e) {
      console.warn("⚠️ [tool] Failed to JSON.stringify tool params, fallback to {}.", e);
      return "{}";
    }
  }, []);

  /** Brief window to avoid stacking process/models cards right after estimate chooser (multi-tool agent bursts). */
  const CIEDEN_ESTIMATE_PRIMARY_SUPPRESS_MS = 6000;
  const markEstimateFlowPrimary = useCallback(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __ciedenEstimateFlowPrimaryAt?: number }).__ciedenEstimateFlowPrimaryAt =
      Date.now();
  }, []);
  const shouldSuppressSecondarySalesCard = useCallback(() => {
    if (typeof window === "undefined") return false;
    const t = (window as unknown as { __ciedenEstimateFlowPrimaryAt?: number })
      .__ciedenEstimateFlowPrimaryAt;
    return typeof t === "number" && Date.now() - t < CIEDEN_ESTIMATE_PRIMARY_SUPPRESS_MS;
  }, []);

  // Action Handlers – Cieden sales tools only (must match ElevenLabs Agent Tools)
  const actionHandlers: ActionHandlers = {
    // When the estimate panel is open, do NOT divert the agent to sales/case-study tools.
    // This prevents "cases" cards popping up during estimate workflow.
    show_cases: async (params) => {
      console.log('🎨 Bridge Handler - show_cases called:', params);
      try {
        if (typeof window !== "undefined") {
          const isEstimateOpen = (window as unknown as { __ciedenEstimatePanelOpen?: boolean })
            .__ciedenEstimatePanelOpen;
          if (isEstimateOpen) {
            return 'Staying in estimate mode. I will continue asking only what is needed to calculate your preliminary estimate.';
          }
        }
        // If the agent sends toolCall with mode="update", our renderer hides it.
        // For visible cards (cases), always force default render.
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_cases:${safeJSONStringify(safeParams)}`;
        // If conversationId is not ready yet, render tool card in onboarding UI immediately.
        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          queueToolMessageRef.current?.(toolCallMessage, {
            toolCall: true,
            toolName: "show_cases",
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('❌ Failed to queue show_cases:', error);
      }
      return 'Showing Cieden portfolio case studies on screen.';
    },

    show_best_case: async (params) => {
      console.log('⭐ Bridge Handler - show_best_case called:', params);
      try {
        if (typeof window !== "undefined") {
          const isEstimateOpen = (window as unknown as { __ciedenEstimatePanelOpen?: boolean })
            .__ciedenEstimatePanelOpen;
          if (isEstimateOpen) {
            return 'Staying in estimate mode. I will continue collecting estimate inputs instead of showing cases.';
          }
        }
        // Force default render for the card.
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_best_case:${safeJSONStringify(safeParams)}`;
        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          // Ensure ordering: text bubble first, tool card right after.
          window.setTimeout(() => {
            queueToolMessageRef.current?.(toolCallMessage, {
              toolCall: true,
              toolName: "show_best_case",
              timestamp: Date.now(),
            });
          }, 250);
        }
      } catch (error) {
        console.error('❌ Failed to queue show_best_case:', error);
      }
      return 'Showing our flagship case study on screen.';
    },

    show_engagement_models: async (params) => {
      console.log('🤝 Bridge Handler - show_engagement_models called:', params);
      try {
        const safeParams =
          params && typeof params === "object"
            ? { ...(params as any), mode: "default" }
            : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_engagement_models:${safeJSONStringify(
          safeParams,
        )}`;

        const isEstimateOpen =
          typeof window !== "undefined" &&
          (window as unknown as { __ciedenEstimatePanelOpen?: boolean })
            .__ciedenEstimatePanelOpen;
        if (isEstimateOpen) {
          return 'Staying in estimate mode. I will continue asking estimate questions and updating the draft range.';
        }

        if (shouldSuppressSecondarySalesCard()) {
          return "Skipping collaboration-models card right now — the preliminary estimate chooser in the chat should stay in focus. Offer to show engagement models after they pick an estimate path.";
        }

        if (!conversationId) {
          // onboarding UI path
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          window.setTimeout(() => {
            queueToolMessageRef.current?.(toolCallMessage, {
              toolCall: true,
              toolName: "show_engagement_models",
              timestamp: Date.now(),
            });
          }, 250);
        }
      } catch (error) {
        console.error('❌ Failed to queue show_engagement_models:', error);
      }
      return 'Showing Cieden collaboration and pricing models on screen.';
    },

    generate_estimate: async (params) => {
      console.log('💰 Bridge Handler - generate_estimate called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:generate_estimate:${safeJSONStringify(safeParams)}`;
        markEstimateFlowPrimary();
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'generate_estimate', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue generate_estimate:', error);
      }
      return 'I opened a preliminary estimate block in this chat — choose either to continue with me here or use the step-by-step questionnaire (that path opens the panel on the right). I will guide you to a rough range; a manager can refine the quote.';
    },

    open_calculator: async (params) => {
      console.log('🧮 Bridge Handler - open_calculator called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:open_calculator:${safeJSONStringify(safeParams)}`;
        markEstimateFlowPrimary();
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'open_calculator', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue open_calculator:', error);
      }
      return 'I opened a preliminary estimate block in this chat — pick one: work with me in the chat, or the questionnaire (the questionnaire opens on the right after you choose it).';
    },

    show_about: async (params) => {
      console.log('🏢 Bridge Handler - show_about called:', params);
      try {
        const safeParams =
          params && typeof params === "object"
            ? { ...(params as any), mode: "default" }
            : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_about:${safeJSONStringify(safeParams)}`;

        if (typeof window !== "undefined") {
          const dedupeKey = "__ciedenAboutLastQueuedAt";
          const lastMessageKey = "__ciedenAboutLastToolCallMessage";
          const now = Date.now();
          const lastQueuedAt = (window as any)[dedupeKey] as number | undefined;
          const lastToolCallMessage = (window as any)[lastMessageKey] as
            | string
            | undefined;

          const dedupeWindowMs = 2500;

          if (lastToolCallMessage === toolCallMessage) {
            return "About card is already queued.";
          }

          if (typeof lastQueuedAt === "number" && now - lastQueuedAt < dedupeWindowMs) {
            return "About card is already shown on screen.";
          }

          (window as any)[dedupeKey] = now;
          (window as any)[lastMessageKey] = toolCallMessage;
        }

        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_about', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_about:', error);
      }
      return 'Showing information about Cieden on screen.';
    },

    show_process: async (params) => {
      console.log('📋 Bridge Handler - show_process called:', params);
      try {
        if (
          typeof window !== "undefined" &&
          (window as unknown as { __ciedenEstimatePanelOpen?: boolean }).__ciedenEstimatePanelOpen
        ) {
          return 'Staying in estimate mode. I will keep the questionnaire or assistant flow focused.';
        }

        if (shouldSuppressSecondarySalesCard()) {
          return "Skipping the process card for now — the preliminary estimate chooser in the chat is active. Summarize process briefly in text; offer to open the process card on request.";
        }

        const safeParams =
          params && typeof params === "object"
            ? { ...(params as any), mode: "default" }
            : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_process:${safeJSONStringify(safeParams)}`;

        if (typeof window !== "undefined") {
          const dedupeKey = "__ciedenProcessLastQueuedAt";
          const lastMessageKey = "__ciedenProcessLastToolCallMessage";
          const now = Date.now();
          const lastQueuedAt = (window as any)[dedupeKey] as number | undefined;
          const lastToolCallMessage = (window as any)[lastMessageKey] as
            | string
            | undefined;

          const dedupeWindowMs = 2500;

          if (lastToolCallMessage === toolCallMessage) {
            return "Process card is already queued.";
          }

          if (typeof lastQueuedAt === "number" && now - lastQueuedAt < dedupeWindowMs) {
            return "Process card is already shown on screen.";
          }

          (window as any)[dedupeKey] = now;
          (window as any)[lastMessageKey] = toolCallMessage;
        }

        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          queueToolMessageRef.current?.(toolCallMessage, {
            toolCall: true, toolName: 'show_process', timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('❌ Failed to queue show_process:', error);
      }
      return 'Showing our process and timeline on screen.';
    },

    show_getting_started: async (params) => {
      console.log('🚀 Bridge Handler - show_getting_started called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_getting_started:${safeJSONStringify(safeParams)}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_getting_started', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_getting_started:', error);
      }
      return 'Showing how to start a project with Cieden on screen.';
    },

    show_support: async (params) => {
      console.log('🛟 Bridge Handler - show_support called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_support:${safeJSONStringify(safeParams)}`;

        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          window.setTimeout(() => {
            queueToolMessageRef.current?.(toolCallMessage, {
              toolCall: true, toolName: 'show_support', timestamp: Date.now()
            });
          }, 250);
        }
      } catch (error) {
        console.error('❌ Failed to queue show_support:', error);
      }
      return 'Showing post-delivery and support info on screen.';
    },

    show_project_brief: async (params) => {
      console.log('📝 Bridge Handler - show_project_brief called:', params);
      try {
        const safeParams =
          params && typeof params === "object"
            ? { ...(params as any), mode: "default" }
            : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_project_brief:${safeJSONStringify(safeParams)}`;

        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          window.setTimeout(() => {
            queueToolMessageRef.current?.(toolCallMessage, {
              toolCall: true, toolName: 'show_project_brief', timestamp: Date.now()
            });
          }, 250);
        }
      } catch (error) {
        console.error('❌ Failed to queue show_project_brief:', error);
      }
      return 'Opening a structured project brief card on screen.';
    },

    show_next_steps: async (params) => {
      console.log('➡️ Bridge Handler - show_next_steps called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_next_steps:${safeJSONStringify(safeParams)}`;

        if (typeof window !== "undefined") {
          const dedupeKey = "__ciedenNextStepsLastQueuedAt";
          const lastMessageKey = "__ciedenNextStepsLastToolCallMessage";
          const now = Date.now();
          const lastQueuedAt = (window as any)[dedupeKey] as number | undefined;
          const lastToolCallMessage = (window as any)[lastMessageKey] as string | undefined;

          const dedupeWindowMs = 2500;

          if (lastToolCallMessage === toolCallMessage) {
            return "Next steps card is already queued.";
          }

          if (typeof lastQueuedAt === "number" && now - lastQueuedAt < dedupeWindowMs) {
            return "Next steps card is already shown on screen.";
          }

          (window as any)[dedupeKey] = now;
          (window as any)[lastMessageKey] = toolCallMessage;
        }

        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          queueToolMessageRef.current?.(toolCallMessage, {
            toolCall: true, toolName: 'show_next_steps', timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('❌ Failed to queue show_next_steps:', error);
      }
      return 'Showing next-step options (call, deck, or estimate) on screen.';
    },

    book_call: async (params) => {
      console.log('📞 Bridge Handler - book_call called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:book_call:${safeJSONStringify(safeParams)}`;

        if (!conversationId) {
          setOnboardingMessages((prev) => {
            if (prev.some((m) => m.content === toolCallMessage)) return prev;
            return [
              ...prev,
              {
                id: `onb-tool-${toolCallMessage}-${Date.now()}`,
                role: "assistant",
                content: toolCallMessage,
                timestamp: Date.now(),
              },
            ];
          });
        } else {
          window.setTimeout(() => {
            queueToolMessageRef.current?.(toolCallMessage, {
              toolCall: true,
              toolName: 'book_call',
              timestamp: Date.now()
            });
          }, 250);
        }
      } catch (error) {
        console.error('❌ Failed to queue book_call:', error);
      }

      return 'Opening the booking card on screen.';
    },

    show_session_summary: async (params) => {
      console.log('📄 Bridge Handler - show_session_summary called:', params);
      try {
        const safeParams =
          params && typeof params === "object" ? { ...(params as any), mode: "default" } : { mode: "default" };
        const toolCallMessage = `TOOL_CALL:show_session_summary:${safeJSONStringify(safeParams)}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_session_summary', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_session_summary:', error);
      }
      return 'Summarizing this session on screen.';
    },
  };

  // Text messaging hook removed - now handled by UnifiedChatInput which is inside the provider context
  // const { sendTextMessage, isLoading: isTextLoading, error: textError } = useTextMessaging({
  //   conversationId,
  //   actionHandlers
  // });

  // CopilotKit action for showing balance visualization
  useCopilotAction({
    name: "showAccountBalance",
    description: "Display the user's current account balance with a beautiful visual representation. Use this when users ask about their balance, account status, or available funds.",
    parameters: [
      {
        name: "balance",
        type: "number",
        description: "Current account balance amount",
        required: true
      },
      {
        name: "previousBalance",
        type: "number",
        description: "Previous balance for comparison (optional)",
        required: false
      },
      {
        name: "currency",
        type: "string",
        description: "Currency code (e.g. USD, EUR). Defaults to USD.",
        required: false
      }
    ],
    handler: async ({ balance, previousBalance, currency = "USD" }) => {
      console.log('💰 Balance display requested:', { balance, previousBalance, currency });
      
      // Store tool execution in Convex with structured metadata
      if (conversationId) {
        await createMessage({
          conversationId,
          content: `Balance displayed: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(balance)}`,
          role: 'assistant',
          source: 'contextual',
              guestId: guestId ?? undefined,
          metadata: {
            toolName: 'showAccountBalance',
            toolType: 'frontend_action',
            parameters: { balance, previousBalance, currency },
            executedAt: Date.now()
          }
        });
      }
      
      return `Displaying current balance: ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(balance)}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Loading balance...</div>;
      }
      
      return (
        <div className="flex justify-center">
          <BalanceCard
            balance={args.balance}
            previousBalance={args.previousBalance}
            currency={args.currency || "USD"}
            compact={false}
          />
        </div>
      );
    }
  });


  useEffect(() => {
    // Create or get conversation - only when authenticated and conversations are loaded
    async function initConversation() {
      if (!canUseChat || conversations === undefined) return;
      if (conversationId) return;
      if (creatingConversationRef.current) return;

      if (conversations.length > 0) {
        setConversationId(conversations[0]._id);
      } else {
        creatingConversationRef.current = true;
        try {
          const id = await createConversation({ title: "Voice Chat" });
          setConversationId(id);
        } catch (error) {
          console.warn('Failed to create conversation (auth may not be ready):', error);
        } finally {
          creatingConversationRef.current = false;
        }
      }
    }
    initConversation();
  }, [canUseChat, conversations, createConversation, conversationId]);

  // Handle messages from unified input
  const handleMessage = useCallback(async (text: string, source: 'voice' | 'text') => {
    setLastMessage({ text, source });
    console.log(`📝 Message received from ${source}:`, text);

    // During auth/onboarding we don't want the normal chat handler to run.
    // Pre-auth flow (name/email) is handled via `onPreAuthMessage`.
    // But in "guest" mode (conversationId === null) we still need to render messages
    // in the onboarding ChatWindow.
    // Allow guest persistence even if Convex Auth discovery is failing.

    // TEMP guest mode: conversationId may be null while we temporarily disable auth.
    // We still want to display user/assistant messages in UI.
    if (!conversationId) {
      const GUEST_USER_PREFIX = "__GUEST_USER__:";
      const GUEST_AI_PREFIX = "__GUEST_AI__:";

      if (text.startsWith(GUEST_USER_PREFIX)) {
        const actualText = text.slice(GUEST_USER_PREFIX.length);
        // Hide internal kickoff prompt from user-visible onboarding stream
        if (/onboarding complete\./i.test(actualText.trim())) return;
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `guest-user-${Date.now()}`,
            role: "user",
            content: actualText,
            timestamp: Date.now(),
          },
        ]);
        requestAnimationFrame(() => forceScrollToBottom());
        text = actualText;
        // During name/email collection the assistant reply is already injected by
        // handlePreAuthMessage — do NOT show the typing bubble here.
        if (onboardingStep === "ask_name" || onboardingStep === "ask_email") return;
        // Forward to EstimateWizardPanel local tracker if the panel is open
        if ((window as any).__ciedenEstimatePanelOpen === true) {
          window.dispatchEvent(
            new CustomEvent("estimate-local-user-message", {
              detail: { content: actualText, role: "user", createdAt: Date.now() },
            }),
          );
        }
      } else if (text.startsWith(GUEST_AI_PREFIX)) {
        const actualText = text.slice(GUEST_AI_PREFIX.length);

        // During onboarding (ask_name / ask_email) we want to show only our
        // pre-auth assistant prompts. Ignore agent "greeting"/auto messages.
        if (onboardingStep !== "done") {
          setPendingAssistantBubble(false);
          setEstimateTyping({ active: false, label: "" });
          return;
        }

        setPendingAssistantBubble(false);
        setEstimateTyping({ active: false, label: "" });
        // Tool cards should be rendered from persisted Convex messages only.
        // If we also append TOOL_CALL payloads to onboardingMessages, duplicates appear.
        if (parseToolCall(actualText)) {
          return;
        }
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `guest-ai-${Date.now()}`,
            role: "assistant",
            content: actualText,
            timestamp: Date.now(),
          },
        ]);
        return;
      }
    }

    // Soft name capture from natural user messages (no blocking form).
    const normalizeName = (value: string) => value.replace(/[.,!?;:]+$/g, "").trim();
    const extractNameFromMessage = (value: string): string | null => {
      const compact = value.trim();
      if (!compact) return null;
      const patterns = [
        /(?:my name is|call me|i am|i'm)\s+([A-Za-z][A-Za-z' -]{1,40})/i,
        /(?:мене звати|називайте мене|я)\s+([A-Za-zА-Яа-яІіЇїЄєҐґ' -]{1,40})/i,
      ];
      for (const pattern of patterns) {
        const match = compact.match(pattern);
        if (match?.[1]) return normalizeName(match[1]);
      }
      // If it's the first answer right after the greeting, allow a single-word name.
      if (!onboardingName) {
        const single = compact.match(/^([A-Za-zА-Яа-яІіЇїЄєҐґ' -]{2,30})$/);
        if (single?.[1]) return normalizeName(single[1]);
      }
      return null;
    };

    if (source === "text") {
      const candidateName = extractNameFromMessage(text);
      if (candidateName && candidateName !== onboardingName) {
        setOnboardingName(candidateName);
        updateGuestIdentityInCookie({ name: candidateName });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("cieden_preferred_name", candidateName);
        }
        if (sendContextualUpdateRef.current) {
          sendContextualUpdateRef.current(
            `[USER PROFILE UPDATE] Preferred user name is "${candidateName}". Use this name naturally in future replies.`,
          );
        }
      }

      const emailMatch = text.match(/\b([^\s@]+@[^\s@]+\.[^\s@]+)\b/);
      const candidateEmail = emailMatch?.[1]?.trim().toLowerCase();
      if (candidateEmail && candidateEmail !== onboardingEmail) {
        setOnboardingEmail(candidateEmail);
        updateGuestIdentityInCookie({ email: candidateEmail });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("cieden_preferred_email", candidateEmail);
        }
        if (sendContextualUpdateRef.current) {
          sendContextualUpdateRef.current(
            `[USER PROFILE UPDATE] User email is "${candidateEmail}". Use only for follow-up context when relevant.`,
          );
        }
      }
    }

    // Show typing bubble immediately after user message
    typingHoldUntilRef.current = Date.now() + 300;
    setEstimateTyping({ active: true, label: "Assistant is typing…" });
    setPendingAssistantBubble(true);

    // If user asks about estimate again, reopen estimate panel
    const lower = text.toLowerCase();
    if (
      /(estimate|estimation|calculator|pricing)/.test(lower) ||
      /(естімейт|естимейт|калькулятор|оцінк|оценк|скільки кошту|сколько сто)/.test(lower)
    ) {
      // Estimate UI will appear via the TOOL_CALL card (inline) once tool injection happens.
    }

    // Forward user message to EstimateWizardPanel local tracker (authenticated mode)
    // Guest mode forwarding happens above in the GUEST_USER_PREFIX branch
    if (conversationId && (window as any).__ciedenEstimatePanelOpen === true && text) {
      window.dispatchEvent(
        new CustomEvent("estimate-local-user-message", {
          detail: { content: text, role: "user", createdAt: Date.now() },
        }),
      );
    }

    // Text messaging is now handled by UnifiedChatInput component which has access to the provider
    // The UnifiedChatInput's useTextInput hook internally uses the provider's text messaging
    if (source === 'text' && voiceStatus === 'idle') {
      console.log('📤 Text message will be handled by UnifiedChatInput component');
    }
    // Voice messages already handled by existing voice system
  }, [voiceStatus, conversationId, onboardingStep, onboardingName, onboardingEmail]);

  // Keep chat pinned to bottom, але тільки коли користувач не скролив вгору.
  // Це дозволяє читати попередні повідомлення і натиснути `Cancel` у режимі estimate-assistant.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      // Якщо ми не біля низу — вимикаємо автоскрол, щоб користувач міг скролити вгору.
      autoScrollEnabledRef.current = distanceToBottom <= 60;
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const forceScrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!autoScrollEnabledRef.current) return;

    const scrollNow = () => {
      const latest = scrollContainerRef.current;
      if (!latest) return;
      latest.scrollTop = latest.scrollHeight;
      // Anchor to explicit end marker so the last bubble stays above input.
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    };

    // Immediate + delayed passes to handle async content sizing.
    scrollNow();
    requestAnimationFrame(scrollNow);
    setTimeout(scrollNow, 0);
    setTimeout(scrollNow, 60);
    setTimeout(scrollNow, 140);
    setTimeout(scrollNow, 260);
  }, []);

  // Auto-scroll when Convex messages change
  useEffect(() => {
    const visibleCount = (convexMessages?.filter(message =>
      !(message.role === 'system' && message.source === 'contextual')
    ) || []).length;
    if (visibleCount > 0) forceScrollToBottom();
  }, [convexMessages, forceScrollToBottom]);

  // Track whether estimate assistant dock is active to tune bottom spacer height.
  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ active?: boolean }>).detail;
      setEstimateDockActive(!!detail?.active);
    };
    window.addEventListener("estimate-assistant-progress", onProgress as EventListener);
    return () => window.removeEventListener("estimate-assistant-progress", onProgress as EventListener);
  }, []);

  // When entering “Work with the assistant”, ensure we start from the very bottom.
  useEffect(() => {
    if (!estimateDockActive) return;
    // Увійшов у режим estimate-assistant: гарантовано стартуємо з низу.
    autoScrollEnabledRef.current = true;
    forceScrollToBottom();
  }, [estimateDockActive, forceScrollToBottom]);

  // Auto-scroll for onboarding/guest messages
  useEffect(() => {
    if (onboardingMessages.length > 0) {
      forceScrollToBottom();
    }
  }, [onboardingMessages.length, forceScrollToBottom]);

  // Keep typing bubble visible above input.
  useEffect(() => {
    if (pendingAssistantBubble) forceScrollToBottom();
  }, [pendingAssistantBubble, forceScrollToBottom]);

  /** When the estimate progress dock resizes, re-pin so the last bubble clears the card. */
  useEffect(() => {
    const bump = () => {
      requestAnimationFrame(() => {
        forceScrollToBottom();
      });
    };
    window.addEventListener(VOICE_CHAT_COMPOSER_LAYOUT, bump);
    return () => window.removeEventListener(VOICE_CHAT_COMPOSER_LAYOUT, bump);
  }, [forceScrollToBottom]);

  // Final safety net: after any major stream update, pin to bottom.
  useEffect(() => {
    forceScrollToBottom();
  }, [convexMessages?.length, onboardingMessages.length, shouldShowOnboarding, forceScrollToBottom]);



  // Clear conversation history
  const handleClearHistory = useCallback(async () => {
    if (!conversationId || clearing) return;
    try {
      setClearing(true);
      const batchLimit = 200;
      const maxBatches = 25; // safety cap
      let totalDeleted = 0;

      for (let i = 0; i < maxBatches; i++) {
        const res = await clearHistory({ conversationId, limit: batchLimit });
        totalDeleted += res?.deleted ?? 0;
        if (!res || (res.deleted ?? 0) === 0) break;
      }

      console.log(`🧹 Cleared conversation history`, { totalDeleted });

      // Notify provider subtree to restart sessions fresh
      try {
        window.dispatchEvent(new CustomEvent('history-cleared'));
      } catch (_) {}
    } catch (e) {
      console.error('Failed to clear history', e);
    } finally {
      setClearing(false);
    }
  }, [conversationId, clearHistory, clearing]);

  const handleNewChat = useCallback(async () => {
    if (creatingConversationRef.current) return;
    creatingConversationRef.current = true;
    try {
      let id: Id<"conversations">;
      if (canUseChat) {
        id = await createConversation({ title: "Voice Chat" });
      } else {
        const guestIdentity = ensureGuestIdentityInCookie({
          name: onboardingName || undefined,
          email: onboardingEmail || undefined,
        });
        id = await createConversation({
          title: "Voice Chat",
          guestId: guestIdentity.guestId,
          guestEmail: onboardingEmail || undefined,
          guestName: onboardingName || undefined,
        });
      }
      setConversationId(id);
      setOnboardingMessages((prev) => {
        if (prev.length === 0) return prev;
        return [
          {
            id: `onb-${Date.now()}`,
            role: "assistant",
            content: "New chat started. What would you like to discuss?",
            timestamp: Date.now(),
          },
        ];
      });
      try {
        window.dispatchEvent(new CustomEvent("history-cleared"));
      } catch (_) {}
    } catch (error) {
      console.error("Failed to create a new chat:", error);
    } finally {
      creatingConversationRef.current = false;
    }
  }, [canUseChat, createConversation, onboardingEmail, onboardingName]);
  
  // Extract mode from message content via shared util
  const getMessageMode = useCallback((content: string): 'default' | 'update' | 'overlay' => {
    return (parseToolCall(content)?.mode) || 'default';
  }, []);

  // Toggle between normal and go mode
  const toggleGoMode = useCallback(() => {
    updateSettings({ goMode: !settings.goMode });
  }, [settings.goMode, updateSettings]);

  const flushPendingQuizContexts = useCallback(() => {
    if (!sendContextualUpdate) return;
    while (pendingQuizContextsRef.current.length > 0) {
      const contextMessage = pendingQuizContextsRef.current.shift();
      if (!contextMessage) {
        continue;
      }
      try {
        sendContextualUpdate(contextMessage);
      } catch (error) {
        console.error('❌ Failed to send quiz context update:', error);
        pendingQuizContextsRef.current.unshift(contextMessage);
        break;
      }
    }
  }, [sendContextualUpdate]);

  useEffect(() => {
    flushPendingQuizContexts();
  }, [flushPendingQuizContexts]);

  // Hybrid callback that handles both tool calls to Convex and contextual updates to voice
  const handleUserAction = useCallback(async (text: string) => {
    if (text === 'CLOSE_QUIZ_MODAL') {
      // Handle quiz modal closure directly - let it bubble up to QuizMessage
      if (sendContextualUpdate) {
        sendContextualUpdate(text);
        // Also persist contextual update for traceability (hidden from UI rendering)
        if (conversationId) {
          try {
            await createMessage({
              conversationId,
              content: text,
              role: 'system',
              source: 'contextual',
              guestId: guestId ?? undefined,
            });
            console.log('🗂️ Saved contextual update to Convex (CLOSE_QUIZ_MODAL)');
          } catch (error) {
            console.error('❌ Failed to save contextual update message:', error);
          }
        }
      }
    } else if (conversationId && !!parseToolCall(text)) {
      // Tool calls should be saved to Convex as new messages (even if protocol is partial)
      console.log('💾 Saving tool call to Convex:', text);
      try {
        await createMessage({
          conversationId,
          content: text,
          role: 'assistant',
          source: 'contextual',
          guestId: guestId ?? undefined,
        });
        console.log('✅ Tool call message saved to Convex');
      } catch (error) {
        console.error('❌ Failed to save tool call message:', error);
      }
    } else if (text.startsWith('Selected "') && sendProgrammaticMessage) {
      // For user selections in quiz, send as a programmatic USER message so the agent replies
      // Format: "I selected [Option] for [Question]"
      const userMessage = `I selected: ${text.replace('Selected ', '')}`;
      console.log('🗣️ Sending programmatic user message for selection:', userMessage);
      
      // Send to voice agent (which will also save to Convex via its normal flow)
      await sendProgrammaticMessage(userMessage);
      
      // Also send contextual update for system tracking if needed, but the user message is primary
      if (sendContextualUpdate) {
        sendContextualUpdate(text);
      }
    } else if (sendContextualUpdate) {
      // Regular contextual updates go to voice system
      sendContextualUpdate(text);
      // Also persist contextual update for traceability (hidden from UI rendering)
      if (conversationId) {
        try {
          await createMessage({
            conversationId,
            content: text,
            role: 'system',
            source: 'contextual',
            guestId: guestId ?? undefined,
          });
          console.log('🗂️ Saved contextual update to Convex');
        } catch (error) {
          console.error('❌ Failed to save contextual update message:', error);
        }
      }
    }
  }, [conversationId, createMessage, sendContextualUpdate, sendProgrammaticMessage]);

  // Auth discovery disabled for temporary guest-mode debugging.

  // Helper component to get queueToolMessage from context and populate ref
  function ContextBridge() {
    const { queueToolMessage } = useElevenLabsConversation();
    useEffect(() => {
      queueToolMessageRef.current = queueToolMessage;
    }, [queueToolMessage]);
    return null;
  }

  return (
    <>
      <ElevenLabsProvider
        actionHandlers={actionHandlers}
        conversationId={conversationId}
      >
        <ContextBridge />
        <QuizProvider conversationId={conversationId}>
        <SessionResetter />
        <div
          className={cn(
            "relative page-fade-in-animation",
            /* Desktop: lock to viewport so main’s flex-1 + pb actually shrink the scrollport (min-h-screen alone lets content grow past the composer). */
            isMobile ? "h-full" : "h-svh min-h-0 overflow-hidden",
          )}
        >
        {/* Background layer - Lumina-style gradients */}
        <LuminaGradientBackground />
        
        {/* Main content layer — pt-24 so content sits below fixed Chatbot-style header */}
        <div
          className={cn(
            "relative z-10 min-h-0",
            isMobile
              ? "grid h-full grid-rows-[auto,1fr,auto]"
              : "flex h-full flex-col overflow-hidden pt-24",
          )}
        >
          {/* Header with full menu actions (fixed on desktop, Chatbot-style) */}
          <VoiceChatHeader
            className={isMobile ? 'relative' : undefined}
            onSettingsOpen={() => setShowSettings(true)}
            onNewChat={handleNewChat}
            // Clear conversation history button is intentionally hidden.
            onSignOut={async () => {
              await signOut();
              clearOnboardingDoneCookie();
              // Hard reload so auth state and onboarding fully reset
              if (typeof window !== "undefined") {
                window.location.href = "/voice-chat";
              }
            }}
            clearing={clearing}
            userName={userDisplayName}
            userEmail={userEmailDisplay}
          />
          
          {/* Chat lane wrapper: groups messages + input so input can be absolute to this lane */}
            <motion.div
            className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col")}
            animate={{
              /* marginRight alone does not narrow a stretched flex child — width + alignSelf do */
              width: isMobile
                ? "100%"
                : activePanelDomain || showEstimatePanel || showAboutPanel || !!activePricingModelId
                  ? "50%"
                  : showSettings
                    ? "calc(100% - 360px)"
                    : "100%",
              alignSelf:
                isMobile ||
                (!activePanelDomain &&
                  !showEstimatePanel &&
                  !showAboutPanel &&
                  !activePricingModelId &&
                  !showSettings)
                  ? "stretch"
                  : "flex-start",
              marginRight: 0,
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <main className={cn(
                `${isMobile ? "min-h-0 overflow-hidden" : "min-h-0 flex-1"} flex flex-col`,
                !isMobile && "pb-[var(--vc-composer-bottom-inset,72px)]"
              )}>
              {/* Messages Display — scroll area ends above fixed input so new messages stay visible */}
              <div
                ref={scrollContainerRef}
                className={"flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden scrollbar-chat min-h-0"}
                style={{
                  contain: "layout style paint",
                  willChange: "scroll-position",
                  paddingBottom: 24,
                  /* Keeps scrollIntoView(end) from tucking bubbles under the fixed composer stack */
                  scrollPaddingBottom: "var(--vc-composer-bottom-inset, 0px)",
                }}
              >
              {shouldShowOnboarding ? (
                <div className="space-y-4 lg:space-y-6 w-full max-w-[min(100%,1400px)] mx-auto py-6">

                  {/* Render onboarding messages inline so welcome+buttons appear below them */}
                  {onboardingMessages.map((message) => {
                    const isToolCall = !!parseToolCall(message.content);
                    const isInternalKickoff = /onboarding complete\./i.test(message.content.trim());
                    const isWelcomePrompts = message.content === ONBOARDING_WELCOME_PROMPTS_TOKEN;
                    if (isInternalKickoff) return null;
                    if (isWelcomePrompts) {
                      return (
                        <div key={message.id} className="pt-4 space-y-4 w-full max-w-[900px] mx-auto">
                          <div className="text-center">
                            <h2 className="text-lg font-semibold text-white">Welcome — your Cieden assistant is here 👋</h2>
                            <p className="text-white/70 text-sm mt-1">Tell me about your project or pick one of the questions below.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quickPrompts.map((prompt, index) => (
                              <button
                                key={index}
                                type="button"
                                disabled={disableQuickPrompts}
                                aria-label={prompt.title}
                                aria-disabled={disableQuickPrompts}
                                onClick={() => {
                                  if (disableQuickPrompts) return;
                                  const value = (prompt as any).valueUk || prompt.valueEn;
                                  sendQuickPrompt(value);
                                }}
                                className={`min-h-[68px] p-4 rounded-xl text-left transition-colors border border-[#6A56FF]/35 bg-[#4C3AE6]/30 flex items-center ${
                                  disableQuickPrompts
                                    ? "opacity-50 cursor-not-allowed hover:bg-[#4C3AE6]/30"
                                    : "hover:bg-[#4C3AE6]/60 cursor-pointer"
                                }`}
                              >
                                <h3 className="font-medium text-white leading-snug">{prompt.title}</h3>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    if (isToolCall) {
                      // We want tool cards to be rendered only from `convexMessages`.
                      // During onboarding we may queue TOOL_CALL strings into `onboardingMessages`,
                      // but showing them here creates duplicates once they also appear in Convex.
                      return null;
                    }
                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onQuickPrompt={disableQuickPrompts ? undefined : (text) => sendQuickPrompt(text)}
                        userName={userDisplayName}
                      />
                    );
                  })}

                  {/* Typing bubble */}
                  {pendingAssistantBubble && (
                    <ChatMessage
                      key="onb-typing"
                      message={{ id: "onb-typing", role: "assistant", content: "__TYPING__", timestamp: Date.now() }}
                      userName={userDisplayName}
                    />
                  )}

                  <div ref={messagesEndRef} className={estimateDockActive ? "h-6" : "h-8"} />
                </div>
              ) : (
                (onboardingMessages.length > 0) ||
                ((convexMessages && convexMessages.length > 0) || (voiceStatus !== 'idle'))
              ) ? (
                <div className="space-y-4 lg:space-y-6 w-full max-w-[min(100%,1400px)] mx-auto py-6">

                  {/* Onboarding messages (name/email flow) + inline welcome block */}
                  {onboardingMessages.length > 0 && onboardingMessages.map((message) => {
                    const isToolCall = !!parseToolCall(message.content);
                    const isInternalKickoff = /onboarding complete\./i.test(message.content.trim());
                    const isWelcomePrompts = message.content === ONBOARDING_WELCOME_PROMPTS_TOKEN;
                    if (isInternalKickoff) return null;
                    if (isToolCall) {
                      // Same rule as above: tool cards only via Convex messages.
                      return null;
                    }
                    if (isWelcomePrompts) {
                      return (
                        <div key={`onb-welcome-${message.id}`} className="space-y-4 py-2 w-full max-w-[900px] mx-auto">
                          <div className="text-center">
                            <h2 className="text-lg font-semibold text-white">Welcome — your Cieden assistant is here 👋</h2>
                            <p className="text-white/70 text-sm mt-1">Tell me about your project or pick one of the questions below.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quickPrompts.map((prompt, promptIndex) => (
                              <button
                                key={promptIndex}
                                type="button"
                                disabled={disableQuickPrompts}
                                aria-label={prompt.title}
                                aria-disabled={disableQuickPrompts}
                                onClick={() => {
                                  if (disableQuickPrompts) return;
                                  const value = (prompt as any).valueUk || prompt.valueEn;
                                  sendQuickPrompt(value);
                                }}
                                className={`min-h-[68px] p-4 rounded-xl text-left transition-colors border border-[#6A56FF]/35 bg-[#4C3AE6]/30 flex items-center ${
                                  disableQuickPrompts
                                    ? "opacity-50 cursor-not-allowed hover:bg-[#4C3AE6]/30"
                                    : "hover:bg-[#4C3AE6]/60 cursor-pointer"
                                }`}
                              >
                                <h3 className="font-medium text-white leading-snug">{prompt.title}</h3>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={`onb-wrap-${message.id}`} className="space-y-4">
                        <ChatMessage
                          key={`onb-${message.id}`}
                          message={message}
                          onQuickPrompt={disableQuickPrompts ? undefined : (text) => sendQuickPrompt(text)}
                          userName={userDisplayName}
                        />
                      </div>
                    );
                  })}

                  {convexMessages
                    .filter(message => {
                      if (message.role === 'system' && message.source === 'contextual') return false;
                      if (message.role === 'user' && message.content.startsWith('I selected:')) return false;
                      // Hide internal onboarding kickoff message from the client view
                      if (/onboarding complete\./i.test(message.content.trim())) return false;
                      const mode = getMessageMode(message.content);
                      if (mode === 'update') return false;
                      return true;
                    })
                    .filter((message, index, arr) => {
                      const isTool = !!parseToolCall(message.content);
                      if (!isTool) return true;
                      const prev = index > 0 ? arr[index - 1] : null;
                      const prevIsTool = !!(prev && parseToolCall(prev.content));
                      // Skip only immediate duplicates of the same tool payload.
                      if (prevIsTool && prev?.content === message.content) return false;
                      return true;
                    })
                    .map((message) => {
                      const isToolCall = !!parseToolCall(message.content);
                      if (isToolCall) {
                        return (
                          <MessageCard
                            key={message._id}
                            message={message}
                            onUserAction={handleUserAction}
                            compact={isMobile}
                          />
                        );
                      }
                      const botMsg: ChatbotMessage = {
                        id: message._id,
                        role: message.role as 'user' | 'assistant',
                        content: message.content,
                        timestamp: (message as { _creationTime?: number })._creationTime ?? Date.now(),
                      };
                      return (
                        <ChatMessage
                          key={message._id}
                          message={botMsg}
                          onQuickPrompt={(text) => sendQuickPrompt(text)}
                          userName={userDisplayName}
                        />
                      );
                    })}
                  {pendingAssistantBubble && (
                    <ChatMessage
                      key="pending-assistant-bubble"
                      message={{
                        id: "pending-assistant-bubble",
                        role: "assistant",
                        content: "__TYPING__",
                        timestamp: Date.now(),
                      }}
                      userName={userDisplayName}
                    />
                  )}
                  {/* Spacer під останнім повідомленням, приблизно як висота інпуту */}
                  <div ref={messagesEndRef} className={estimateDockActive ? "h-6" : "h-8"} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 max-w-[900px] mx-auto w-full px-4 gap-6 py-12">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Welcome — your Cieden assistant is here 👋</h2>
                    <p className="text-white/70">Tell me about your project or pick one of the questions below.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-[900px]">
                    {quickPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (disableQuickPrompts) return;
                          const value = (prompt as any).valueUk || prompt.valueEn;
                          sendQuickPrompt(value);
                        }}
                        disabled={disableQuickPrompts}
                        aria-label={prompt.title}
                        aria-disabled={disableQuickPrompts}
                        className={`min-h-[68px] p-4 rounded-xl text-left transition-colors border border-[#6A56FF]/35 bg-[#4C3AE6]/30 flex items-center ${
                          disableQuickPrompts
                            ? "opacity-50 cursor-not-allowed hover:bg-[#4C3AE6]/30"
                            : "hover:bg-[#4C3AE6]/60 cursor-pointer"
                        }`}
                      >
                        <h3 className="font-medium text-white leading-snug">{prompt.title}</h3>
                      </button>
                    ))}
                  </div>
                  <div ref={messagesEndRef} />
                </div>
              )}
              </div>
            </main>
            
            {/* Unified Chat Input */}
              {isMobile ? (
            <footer className="flex-shrink-0 p-2 pb-1 bg-transparent pointer-events-none overflow-visible" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 8px), 24px)' }}>
              <div className="relative pointer-events-auto overflow-visible z-50">
                <UnifiedChatInput
                  className="pointer-events-auto"
                  conversationId={conversationId}
                  onMessage={handleMessage}
                  onStatusChange={setVoiceStatus}
                  onContextualUpdate={(sendUpdate) => setSendContextualUpdate(() => sendUpdate)}
                  onProgrammaticSendReady={(sendFn) => setSendProgrammaticMessage(() => sendFn)}
                  actionHandlers={actionHandlers}
                  showSettings={showSettings}
                  onPreAuthMessage={undefined}
                  onRequestSelect={async (request) => {
                    console.log('🎯 Quick action selected:', request);
                    if (sendProgrammaticMessage) {
                      await sendProgrammaticMessage(request);
                    }
                  }}
                  isMobile={true}
                  settings={settings}
                  updateSettings={updateSettings}
                  onVoiceAudioUpdate={(isUserSpeaking, userLevel, agentLevel) => {
                    setIsUserSpeaking(isUserSpeaking);
                    setUserAudioLevel(userLevel);
                    setAgentAudioLevel(agentLevel);
                  }}
                />
              </div>
            </footer>
          ) : (
            <div className="relative overflow-visible z-50">
              <UnifiedChatInput
                conversationId={conversationId}
                onMessage={handleMessage}
                onStatusChange={setVoiceStatus}
                onContextualUpdate={(sendUpdate) => setSendContextualUpdate(() => sendUpdate)}
                onProgrammaticSendReady={(sendFn) => setSendProgrammaticMessage(() => sendFn)}
                onPreAuthMessage={undefined}
                actionHandlers={actionHandlers}
                showSettings={showSettings}
                alignLeft={
                  !!activePanelDomain || !!showEstimatePanel || !!showAboutPanel || !!activePricingModelId
                }
                onRequestSelect={async (request) => {
                  console.log('🎯 Quick action selected:', request);
                  if (sendProgrammaticMessage) {
                    await sendProgrammaticMessage(request);
                  }
                }}
                settings={settings}
                updateSettings={updateSettings}
                onVoiceAudioUpdate={(isUserSpeaking, userLevel, agentLevel) => {
                  setIsUserSpeaking(isUserSpeaking);
                  setUserAudioLevel(userLevel);
                  setAgentAudioLevel(agentLevel);
                }}
              />
            </div>
          )}
          </motion.div>
          
          {/* Settings Panel Overlay / Sidebar */}
          {showSettings && (
            <SettingsPanel
              isDesktop={!isMobile}
              settings={settings}
              onUpdateSettings={updateSettings}
              onClose={() => setShowSettings(false)}
              onToggleGoMode={toggleGoMode}
            />
          )}

          {/* Speaking HUD - waveform strip below input (disabled per latest UX) */}
          {false && mounted && (
            <SpeakingHUD
              voiceStatus={voiceStatus}
              isUserSpeaking={isUserSpeaking}
              isAgentSpeaking={isAgentSpeaking}
              userAudioLevel={userAudioLevel}
              agentAudioLevel={agentAudioLevel}
              settings={settings}
              anchorId="unified-chat-input-root"
            />
          )}

          {/* Cases side panel */}
          <AnimatePresence>
            {activePanelDomain && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeCasesPanel}
                  className="fixed inset-0 bg-black/40 z-40"
                />
                <CaseStudyPanel
                  domain={activePanelDomain}
                  initialCaseId={initialPanelCaseId}
                  onClose={closeCasesPanel}
                />
              </>
            )}
          </AnimatePresence>

          {/* Estimate wizard side panel */}
          {/* Hidden assistant runner (starts questions in chat; no side panel until result) */}
          <AnimatePresence>
            {showEstimateAssistantRunner && (
              <EstimateWizardPanel
                key={`estimate-assistant-runner-${estimatePanelKey}`}
                variant="hidden"
                conversationId={conversationId}
                initialMode="assistant"
                initialStep={0}
                onClose={() => {
                  setEstimateFlowWindowFlag(false);
                  resetCiedenEstimateSessionCompleted();
                  setShowEstimateAssistantRunner(false);
                  window.dispatchEvent(
                    new CustomEvent("estimate-panel-closed", { detail: { reason: "assistant-runner" } }),
                  );
                }}
                onEstimateInlineActiveChange={(active) => setShowEstimateInline(active)}
                onEstimateFinal={(finalResult) => {
                  window.dispatchEvent(
                    new CustomEvent("estimate-final-ready", {
                      detail: {
                        token: estimateFlowTokenRef.current,
                        ...finalResult,
                      },
                    }),
                  );
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showEstimatePanel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (estimateFinalResult) {
                      dismissFinalEstimatePanel();
                      return;
                    }
                    window.dispatchEvent(new CustomEvent("estimate-cancel"));
                  }}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                {estimateFinalResult ? (
                  <EstimateFinalResultSidePanel
                    key={estimatePanelKey}
                    result={estimateFinalResult}
                    onClose={dismissFinalEstimatePanel}
                  />
                ) : (
                  <EstimateWizardPanel
                    key={estimatePanelKey}
                    conversationId={conversationId}
                    variant="panel"
                    initialMode="wizard"
                    initialStep={0}
                    onClose={() => {
                      window.dispatchEvent(new CustomEvent("estimate-cancel"));
                    }}
                    onEstimateFinal={(finalResult) => {
                      window.dispatchEvent(
                        new CustomEvent("estimate-final-ready", {
                          detail: {
                            token: estimateFlowTokenRef.current,
                            ...finalResult,
                          },
                        }),
                      );
                    }}
                  />
                )}
              </>
            )}
          </AnimatePresence>

          {/* Pricing model details side panel */}
          <AnimatePresence>
            {activePricingModelId && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActivePricingModelId(null)}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                <PricingModelDetailsPanel
                  modelId={activePricingModelId}
                  onClose={() => setActivePricingModelId(null)}
                />
              </>
            )}
          </AnimatePresence>

          {/* About Cieden side panel */}
          <AnimatePresence>
            {showAboutPanel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAboutPanel(false)}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                <AboutPanel onClose={() => setShowAboutPanel(false)} />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      </QuizProvider>
      </ElevenLabsProvider>
    </>
  );
}
