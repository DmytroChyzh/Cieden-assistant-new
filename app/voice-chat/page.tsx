"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { WelcomeRobot } from "@/src/components/voice/WelcomeRobot";
import { SettingsPanel } from '@/src/components/unified/SettingsPanel';
import { useSettings } from '@/src/components/unified/hooks/useSettings';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuizProvider } from "@/src/components/quiz/QuizProvider";
import { ElevenLabsProvider, useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { SessionResetter } from '@/src/components/voice/SessionResetter';
import { parseToolCall } from '@/src/utils/parseToolCall';
import {
  clearGuestIdentityInCookie,
  ensureGuestIdentityInCookie,
  getGuestIdentityFromCookie,
  updateGuestIdentityInCookie,
} from '@/src/utils/guestIdentity';
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
  isCiedenEstimateSessionCompleted,
  cancelEstimateSession,
  completeEstimateSession,
  getActiveEstimateSessionId,
} from "@/src/utils/ciedenEstimateSession";
import type { FindSimilarCasesToolPayload } from "@/src/lib/case-studies/types";
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

/** Assistant bubble that carries the final estimate summary (not mid-flow questions). */
function looksLikeAssistantFinalEstimateContent(content: string | undefined): boolean {
  if (!content) return false;
  if (/ESTIMATE_PANEL_RESULT:\s*\{/i.test(content)) return true;
  const trimmed = content.trim();
  if (trimmed.length < 60) return false;
  if (trimmed.endsWith("?")) return false;
  const lower = content.toLowerCase();
  // Strong closing lines (UA/EN) — models often send these without $ or 3+ digit totals.
  const strongClosing =
    /ось\s+попередн|попередн\w*\s+оцінк|підготувал[аи]\s+попередн|підготував\s+попередн|для\s+вашого\s+проект/i.test(
      lower,
    ) ||
    /here\s+is\s+(a\s+)?preliminary|preliminary\s+estimate\s+for|i\s+('?ve|have)\s+prepared\s+(a\s+)?preliminary/i.test(
      lower,
    );
  if (strongClosing) return true;
  const hasEstimateWords =
    /(попередн|preliminary|оцінк|estimate|вартіст|cost|бюджет|budget|підсум|summar|годин|hours|тижн|weeks|phase|range)/i.test(
      lower,
    );
  const hasNumbers =
    /\$\s?\d|\d[\d,.\s]*(usd|грн|eur)|\d+\s*[-–]\s*\d+/i.test(lower) ||
    /\d{2,}/.test(content);
  return hasEstimateWords && hasNumbers;
}

/** Legacy injected bubble text (welcome hub replaces it in UI). */
const VOICE_CHAT_LEGACY_SOFT_WELCOME =
  "Hi! Welcome to Cieden. I am your AI design assistant. How would you like me to address you?";

const ADDRESS_NAME_PROMPT =
  "How should I address you going forward?\n\nAnd what would you like to learn first?";
const ADDRESS_NAME_PROMPT_CHOICES = [
  "Continue by voice",
  "Continue by text",
];

/** Shorter English intro (legacy) — still treated as duplicate of static bubble if the agent sends it. */
const VOICE_CHAT_HARDCODED_INTRO_LEGACY =
  "Hi! I'm Cieden AI Assistant – your helper for everything related to Cieden: our company, portfolio, news, pricing, and services. We can talk by voice (it's faster) or by text – whichever is more convenient for you.";

/** First on-screen bubble — must match ElevenLabs agent `first_message` and `CIEDEN_FIRST_MESSAGE` exactly. */
const VOICE_CHAT_HARDCODED_INTRO =
  "Hi! I'm Cieden AI Assistant — your guide to our UI/UX design, portfolio, process, and pricing.\n\nWe can chat by voice or text — whatever works best for you.\n\nBefore we begin, how should I address you? And what would you like to explore?";

/** Shown directly above the 6 quick-prompt buttons (with subtitle under it). */
const VOICE_CHAT_WELCOME_TITLE = "Welcome — your Cieden assistant is here 👋";

const VOICE_CHAT_WELCOME_SUBTITLE =
  "Tell me about your project, pick a question below, or start voice/text using the controls.";

const VOICE_CHAT_RETURNING_WELCOME_SUBTITLE =
  "Tell me about your project or pick one of the questions below. How would you like me to address you?";

/** Shown above the 6 quick-pick buttons after the user has sent at least one message (onboarding header is hidden). */
const VOICE_CHAT_QUICK_PROMPTS_FOLLOWUP_HINT =
  "Pick another topic below, or keep typing or using voice.";

/** User-visible user messages (same filters as estimate-mode lines) before we require email. */
const EMAIL_CAPTURE_MIN_USER_MESSAGES = 5;

const EMAIL_CAPTURE_PROMPT =
  "You've already sent several messages. To continue, please type your work email in chat (written text) so we can improve follow-up communication.";
const EMAIL_CAPTURE_PROMPT_UA =
  "Ви вже надіслали кілька повідомлень. Щоб продовжити, введіть ваш робочий email письмово в чаті для кращої подальшої комунікації.";
const EMAIL_CAPTURE_CHOICE_EN = "Share email";
const EMAIL_CAPTURE_CHOICE_UA = "Поділитися email";

const EMAIL_INLINE_RE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
const ESTIMATE_INTENT_RE =
  /(estimate|estimation|calculator|pricing|price|cost|budget|ballpark|естімейт|естимейт|оцінк|оценк|калькулятор|скільки кошту|сколько сто|вартіст|бюджет)/i;
const CYRILLIC_RE = /[А-Яа-яІіЇїЄєҐґ]/;

const normalizeCapturedEmail = (value?: string | null): string => value?.trim().toLowerCase() ?? "";
const isValidEmail = (value?: string | null): boolean => EMAIL_INLINE_RE.test(normalizeCapturedEmail(value));
const hasEstimateIntent = (value?: string | null): boolean => ESTIMATE_INTENT_RE.test((value || "").trim().toLowerCase());
const detectLanguageFromText = (value?: string | null): "en" | "ua" =>
  CYRILLIC_RE.test(value || "") ? "ua" : "en";

function isLikelyDefaultCiedenGreeting(content: string): boolean {
  const t = content.trim().toLowerCase();
  if (t.length > 700) return false;
  if (!t.includes("cieden")) return false;
  const hints = [
    "design assistant",
    "ai design assistant",
    "how can i help",
    "how can i help you today",
    "welcome to cieden",
    "i'm the cieden",
    "i am the cieden",
    "i can explain who cieden",
    "how would you like me to address you",
  ];
  return hints.some((h) => t.includes(h));
}

/** Same copy as static intro(s) (dash/space tolerant) — hide duplicate agent bubble. */
function matchesHardcodedStaticIntro(content: string): boolean {
  const n = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      // Unicode hyphen / dashes / minus (agent copy often uses a different dash than our strings)
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
      .replace(/['']/g, "'");
  const nc = n(content);
  if (nc === n(VOICE_CHAT_HARDCODED_INTRO) || nc === n(VOICE_CHAT_HARDCODED_INTRO_LEGACY)) {
    return true;
  }
  const ref = n(VOICE_CHAT_HARDCODED_INTRO);
  if (
    nc.length >= 120 &&
    nc.includes("cieden ai assistant") &&
    nc.includes("guide to our ui/ux") &&
    nc.includes("voice or text") &&
    nc.includes("before we begin") &&
    nc.includes("address you") &&
    Math.abs(nc.length - ref.length) <= 48
  ) {
    return true;
  }
  return false;
}

const VOICE_CHAT_QUICK_PROMPTS = [
  { title: "What does Cieden do?", valueEn: "What does Cieden do? Tell me about your company and services." },
  { title: "Show your portfolio", valueEn: "Show me your portfolio or case studies." },
  { title: "How much does a project cost?", valueEn: "How much does a typical project cost? I need a rough estimate." },
  { title: "What's your design process?", valueEn: "What is your design process and timeline?" },
  { title: "Do you do development too?", valueEn: "Do you do development as well, or design only?" },
  { title: "How do I start a project?", valueEn: "How can I start a project with Cieden? What's the first step?" },
] as const;

/**
 * Legacy standalone onboarding lines — hide duplicate assistant rows only when they are NOT
 * part of the canonical first message (which now includes the “Before we begin…” paragraph).
 */
function matchesHiddenOnboardingAssistantBubble(content: string): boolean {
  const raw = (content || "").trim();
  if (!raw) return false;
  const n = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
      .replace(/['']/g, "'");
  const nc = n(raw);
  if (nc.includes(n(ADDRESS_NAME_PROMPT))) return true;
  const hasFullIntroOpening =
    nc.includes("cieden ai assistant") && nc.includes("guide to our");
  if (!hasFullIntroOpening && nc.includes("before we begin") && nc.includes("address you")) {
    return true;
  }
  if (
    !hasFullIntroOpening &&
    nc.includes("how should i address you") &&
    (nc.includes("explore") || nc.includes("like to learn"))
  ) {
    return true;
  }
  return false;
}

function WelcomeVoiceCueBridge({
  enabled,
  onAgentText,
}: {
  enabled: boolean;
  onAgentText: (text: string) => void;
}) {
  const { registerVoiceHandler } = useElevenLabsConversation();
  useEffect(() => {
    if (!enabled) return;
    const accRef = { current: "" };
    return registerVoiceHandler((ev) => {
      if (ev.source !== "ai" || typeof ev.message !== "string") return;
      const m = ev.message;
      const prev = accRef.current;
      if (!prev) accRef.current = m;
      else if (m.startsWith(prev)) accRef.current = m;
      else if (prev.startsWith(m)) return;
      else accRef.current = prev + m;
      onAgentText(accRef.current);
    });
  }, [enabled, onAgentText, registerVoiceHandler]);
  return null;
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
  const sendProgrammaticMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  useEffect(() => { sendProgrammaticMessageRef.current = sendProgrammaticMessage; }, [sendProgrammaticMessage]);
  // If user clicks quick prompts before `UnifiedChatInput` finishes initializing
  // (sendProgrammaticMessage is still null), we queue the last prompt and send it
  // as soon as programmatic sending becomes available (prevents "only after refresh").
  const [pendingQuickPrompt, setPendingQuickPrompt] = useState<string | null>(null);
  // Queue "visible" estimate assistant kickoff messages when UnifiedChatInput
  // isn't ready yet (prevents estimate assistant from getting stuck).
  const pendingEstimateAssistantUserMessagesRef = useRef<string[]>([]);
  const pendingEstimateContextualMessagesRef = useRef<string[]>([]);
  const creatingConversationRef = useRef(false);
  const [estimateTyping, setEstimateTyping] = useState<{ active: boolean; label: string }>({ active: false, label: "" });
  const typingHoldUntilRef = useRef<number>(0);
  const typingHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingAssistantBubble, setPendingAssistantBubble] = useState(false);
  const [pendingOnboardingKickoff, setPendingOnboardingKickoff] = useState(false);
  const [estimateDockActive, setEstimateDockActive] = useState(false);
  const LAST_CONVERSATION_STORAGE_KEY = "cieden_last_conversation_id";
  /** Empty thread: 0 = first message only, 1 = + welcome grid, 2 = + name prompt (then introRevealComplete). */
  const [introAnimStep, setIntroAnimStep] = useState(0);
  const [introRevealComplete, setIntroRevealComplete] = useState(false);
  const [introSessionKey, setIntroSessionKey] = useState(0);
  const [staticIntroTimestamp, setStaticIntroTimestamp] = useState(() => Date.now());
  /** null until user picks onboarding mode; drives quick-prompt grid timing. */
  const [welcomeHubMode, setWelcomeHubMode] = useState<null | "text" | "voice">(null);
  const [introVisibleChars, setIntroVisibleChars] = useState(0);
  const [introTypewriterDone, setIntroTypewriterDone] = useState(false);
  const [welcomeVoiceCueBuffer, setWelcomeVoiceCueBuffer] = useState("");
  const [voiceWelcomeRevealAll, setVoiceWelcomeRevealAll] = useState(false);
  /** When false, keep welcome intro + topic grid even if voice saved user rows to Convex. */
  const [welcomeHubDismissed, setWelcomeHubDismissed] = useState(false);
  const welcomeInitialGateDoneRef = useRef(false);
  useEffect(() => {
    setStaticIntroTimestamp(Date.now());
  }, [introSessionKey]);
  const onWelcomeVoiceAgentText = useCallback((text: string) => {
    setWelcomeVoiceCueBuffer(text);
  }, []);

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
  const [showVoicePickerCard, setShowVoicePickerCard] = useState(false);
  const [pickerSelectedVoice, setPickerSelectedVoice] = useState<string>("");
  const [pickerConfirmedVoice, setPickerConfirmedVoice] = useState<string | null>(null);
  const [previewLoadingVoice, setPreviewLoadingVoice] = useState<string | null>(null);
  const [previewPlayingVoice, setPreviewPlayingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});

  const VOICE_OPTIONS = [
    { id: '', name: 'Jessica', label: 'Default' },
    { id: 'zubqz6JC54rePKNCKZLG', name: 'Jess', label: 'Custom' },
    { id: 'ys3XeJJA4ArWMhRpcX1D', name: 'Sue', label: 'Custom' },
    { id: 'bu5eKETbFKC8G702EAU4', name: 'Liam', label: 'Custom' },
    { id: 'wSO34DbFKBGmeCNpJL5K', name: 'JW', label: 'Custom' },
  ];

  const stopPreviewAudio = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setPreviewPlayingVoice(null);
  }, []);

  const playVoicePreview = useCallback(async (voiceId: string) => {
    stopPreviewAudio();
    if (!voiceId) return;

    setPreviewLoadingVoice(voiceId);
    try {
      let blobUrl = previewCacheRef.current[voiceId];
      if (!blobUrl) {
        const res = await fetch("/api/elevenlabs/voice-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceId }),
        });
        if (!res.ok) throw new Error("Preview fetch failed");
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        previewCacheRef.current[voiceId] = blobUrl;
      }

      const audio = new Audio(blobUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewPlayingVoice(null);
      audio.onerror = () => setPreviewPlayingVoice(null);
      setPreviewPlayingVoice(voiceId);
      await audio.play();
    } catch (err) {
      console.error("Voice preview error:", err);
    } finally {
      setPreviewLoadingVoice(null);
    }
  }, [stopPreviewAudio]);

  const handleVoicePickerSelect = useCallback(() => {
    stopPreviewAudio();
    console.log('[VoicePicker] Selected voice:', pickerSelectedVoice || '(default)');
    setWelcomeHubMode("voice");
    updateSettings({ voice: pickerSelectedVoice });
    setPickerConfirmedVoice(pickerSelectedVoice);
    setTimeout(() => {
      console.log('[VoicePicker] Dispatching voice-chat-mode-choice after settings sync');
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("voice-chat-mode-choice", {
            detail: { mode: "voice" },
          }),
        );
      }
    }, 800);
  }, [pickerSelectedVoice, stopPreviewAudio, updateSettings]);

  const ONBOARDING_WELCOME_PROMPTS_TOKEN = "__ONBOARDING_WELCOME_PROMPTS__";
  
  const conversations = useQuery(api.conversations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const hasCurrentUser = currentUser !== null && currentUser !== undefined;
  // Convex Auth discovery can fail (middleware logs), but `currentUser`
  // still tells us whether we can actually use auth-backed mutations.
  const canUseChat = hasCurrentUser;
  const createConversation = useMutation(api.conversations.create);
  const createMessage = useMutation(api.messages.create);
  const updateGuestContact = useMutation(api.conversations.updateGuestContact);
  const clearHistory = useMutation(api.messages.clearForConversation);
  const guestId = getGuestIdentityFromCookie()?.guestId;
  const selectedConversation = useMemo(
    () => (conversationId && conversations ? conversations.find((c) => String(c._id) === String(conversationId)) ?? null : null),
    [conversationId, conversations],
  );
  const conversationIdRef = useRef<Id<"conversations"> | null>(null);
  // Custom hook for Convex message integration
  const { convexMessages, isLoading: convexMessagesLoading } = useChatMessages({ conversationId });
  const convexMessagesRef = useRef(convexMessages);
  useEffect(() => {
    convexMessagesRef.current = convexMessages;
  }, [convexMessages]);

  /** Count user rows like visibleConvexChatMessages (for email gate + quick prompts). */
  const visibleUserMessageCountForEmailRef = useRef(0);
  const emailRequiredGateRef = useRef(false);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  /** Same rules as initConversation: prefer last-open thread from localStorage. */
  const resolveExistingConversationId = useCallback(
    (list: NonNullable<typeof conversations>): Id<"conversations"> | null => {
      if (!list.length) return null;
      let selected: Id<"conversations"> | null = list[0]?._id ?? null;
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(LAST_CONVERSATION_STORAGE_KEY);
        if (saved) {
          const matched = list.find((c) => String(c._id) === saved);
          if (matched?._id) {
            selected = matched._id;
          }
        }
      }
      return selected;
    },
    [LAST_CONVERSATION_STORAGE_KEY],
  );

  const introPersistedRef = useRef(false);
  const addressPromptPersistedRef = useRef(false);

  useEffect(() => {
    if (!conversationId || convexMessagesLoading) return;
    if (convexMessages.length > 0) return;
    if (introRevealComplete) return;

    setIntroAnimStep(0);
    const t1 = setTimeout(() => setIntroAnimStep(1), 550);
    const t2 = setTimeout(() => {
      setIntroAnimStep(2);
      setIntroRevealComplete(true);
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [
    conversationId,
    convexMessagesLoading,
    convexMessages.length,
    introSessionKey,
    introRevealComplete,
  ]);

  // Ensure `conversationId` exists before sending any programmatic message.
  // Otherwise the model output/tool calls can land in "guest" mode and won't
  // render the tool cards until refresh.
  const ensureConversationId = useCallback(async () => {
    if (conversationId) return;
    if (creatingConversationRef.current) return;

    if (canUseChat) {
      // Prefer existing conversations if the query already resolved.
      if (Array.isArray(conversations) && conversations.length > 0) {
        const pick = resolveExistingConversationId(conversations);
        if (pick) {
          conversationIdRef.current = pick;
          setConversationId(pick);
        }
        return;
      }

      creatingConversationRef.current = true;
      try {
        const id = await createConversation({ title: "Voice Chat" });
        conversationIdRef.current = id;
        setConversationId(id);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      } finally {
        creatingConversationRef.current = false;
      }
      return;
    }

    // Guest fallback: ensure a persisted conversation exists.
    creatingConversationRef.current = true;
    try {
      const guestIdentity = ensureGuestIdentityInCookie({
        name: undefined,
        email: undefined,
      });
      const id = await createConversation({
        title: "Voice Chat",
        guestId: guestIdentity.guestId,
      });
      conversationIdRef.current = id;
      setConversationId(id);
    } catch (err) {
      console.error("Failed to create guest conversation:", err);
    } finally {
      creatingConversationRef.current = false;
    }
  }, [
    conversationId,
    canUseChat,
    conversations,
    createConversation,
    resolveExistingConversationId,
  ]);

  const appendMessageToConvex = useCallback(
    async ({
      content,
      role,
      source,
      metadata,
    }: {
      content: string;
      role: "user" | "assistant" | "system";
      source: "voice" | "text" | "contextual";
      metadata?: any;
    }) => {
      let activeConversationId = conversationIdRef.current;

      if (!activeConversationId) {
        await ensureConversationId();
        activeConversationId = conversationIdRef.current;
      }

      if (!activeConversationId) return false;

      try {
        await createMessage({
          conversationId: activeConversationId,
          content,
          role,
          source,
          guestId: guestId ?? undefined,
          metadata,
        });
        return true;
      } catch (error) {
        console.error("❌ Failed to persist message to Convex:", error);
        return false;
      }
    },
    [ensureConversationId, createMessage, guestId],
  );

  useEffect(() => {
    if (!conversationId || convexMessagesLoading) return;
    if (introPersistedRef.current) return;
    if (convexMessages.length > 0) return;
    introPersistedRef.current = true;
    void appendMessageToConvex({
      content: VOICE_CHAT_HARDCODED_INTRO,
      role: "assistant",
      source: "text",
    });
  }, [conversationId, convexMessagesLoading, convexMessages.length, appendMessageToConvex]);

  // Listen to messages coming from the estimate side panel.
  // Uses refs instead of state to always have the latest function references.
  useEffect(() => {
    const handler = async (event: Event) => {
      if (!('detail' in event)) return;
      const anyEvent = event as CustomEvent<{ text: string; inputKind?: string; visibility?: "contextual" | "user" }>;
      const payload = anyEvent.detail;
      if (!payload?.text) return;

      const composed = `[ESTIMATE MODE]\n${payload.text}`;

      try {
        if (payload.visibility === "contextual") {
          const ctxFn = sendContextualUpdateRef.current;
          if (ctxFn) {
            ctxFn(composed);
          } else {
            pendingEstimateContextualMessagesRef.current.push(composed);
          }

          await appendMessageToConvex({
            content: composed,
            role: "system",
            source: "contextual",
          });
          return;
        }

        // Visible user message: drives the dialogue.
        // Try sending immediately, retry with delays if not ready yet.
        const trySend = async (): Promise<boolean> => {
          const fn = sendProgrammaticMessageRef.current;
          if (!fn) return false;
          await fn(composed);
          return true;
        };

        if (await trySend()) return;

        // Not ready — wait and retry
        for (const delay of [500, 1500, 3000]) {
          await new Promise(r => setTimeout(r, delay));
          if (await trySend()) return;
        }

        console.error("❌ Failed to send estimate kickoff after retries — sendProgrammaticMessage still null");
      } catch (error) {
        console.error("Failed to send estimate panel message to assistant:", error);
      }
    };

    window.addEventListener("estimate-assistant-message", handler as EventListener);
    return () => window.removeEventListener("estimate-assistant-message", handler as EventListener);
  }, []);

  // Flush queued contextual messages once sendContextualUpdate becomes available
  useEffect(() => {
    if (!sendContextualUpdate) return;
    while (pendingEstimateContextualMessagesRef.current.length > 0) {
      const text = pendingEstimateContextualMessagesRef.current.shift();
      if (text) sendContextualUpdate(text);
    }
  }, [sendContextualUpdate]);

  const jumpToLatestMessages = useCallback(() => {
    autoScrollEnabledRef.current = true;
    const scrollNow = () => {
      const latest = scrollContainerRef.current;
      if (!latest) return;
      latest.scrollTop = latest.scrollHeight;
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    };
    scrollNow();
    requestAnimationFrame(scrollNow);
    setTimeout(scrollNow, 0);
    setTimeout(scrollNow, 60);
    setTimeout(scrollNow, 140);
  }, []);

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
    jumpToLatestMessages();
    setPendingQuickPrompt(null);
    void sendProgrammaticMessage(value).catch((err) => {
      console.error("Failed to flush queued quick prompt:", err);
    });
  }, [sendProgrammaticMessage, pendingQuickPrompt, canUseChat, conversationId, jumpToLatestMessages]);

  // Lightweight onboarding state: chat is always available immediately.
  // We only use helper assistant prompts in-stream (non-blocking).
  type OnboardingStep = "ask_name" | "ask_email" | "creating" | "done";
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("done");
  // Legacy local onboarding lane is disabled: Convex is the only message source.
  const setOnboardingMessages = useCallback((_updater: unknown) => {}, []);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingEmail, setOnboardingEmail] = useState("");
  const [emailCapturePromptVisible, setEmailCapturePromptVisible] = useState(false);
  const [emailCaptureDismissed, setEmailCaptureDismissed] = useState(false);
  const [emailCaptureAwaitingInput, setEmailCaptureAwaitingInput] = useState(false);
  const [emailComposerGateNotice, setEmailComposerGateNotice] = useState<string | null>(null);
  const lastSavedConversationEmailRef = useRef("");
  const hasAskedEmailRef = useRef(false);
  const lastUserLanguageRef = useRef<"en" | "ua">("en");
  const [emailRequiredGate, setEmailRequiredGate] = useState(false);
  const estimateEmailPromptCooldownRef = useRef(0);
  const hasCapturedEmail = useMemo(() => {
    if (isValidEmail(onboardingEmail)) return true;
    if (isValidEmail(selectedConversation?.guestEmail)) return true;
    return false;
  }, [onboardingEmail, selectedConversation?.guestEmail]);
  const promptEmailRequiredInChat = useCallback((reason: "general" | "estimate" = "general", contextText?: string) => {
    const now = Date.now();
    // Avoid repeating the same assistant prompt when multiple gate paths trigger at once.
    if (now - estimateEmailPromptCooldownRef.current < 2500) return;
    estimateEmailPromptCooldownRef.current = now;
    const language = contextText ? detectLanguageFromText(contextText) : lastUserLanguageRef.current;
    setEmailCaptureAwaitingInput(true);
    setEmailCapturePromptVisible(false);
    setEmailCaptureDismissed(false);
    setEmailComposerGateNotice(null);
    void appendMessageToConvex({
      role: "assistant",
      source: "text",
      content:
        language === "ua"
          ? (reason === "estimate"
              ? "Щоб продовжити естімейт, вкажіть ваш email у чаті. Одразу після цього я продовжу розрахунок."
              : "Щоб далі продовжувати спілкування з асистентом, введіть свій email письмово в чаті для подальшого покращення комунікації.")
          : (reason === "estimate"
              ? "To continue with the estimate, please type your email in chat. Right after that I will continue the calculation."
              : "To continue chatting with the assistant, please type your email in chat (written text) for better ongoing communication."),
    });
  }, [appendMessageToConvex]);

  const sendQuickPrompt = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      jumpToLatestMessages();

      const needsEmailForEstimate = !hasCapturedEmail && hasEstimateIntent(trimmed);
      if (
        (emailRequiredGateRef.current || needsEmailForEstimate) &&
        trimmed !== EMAIL_CAPTURE_CHOICE_EN &&
        trimmed !== EMAIL_CAPTURE_CHOICE_UA &&
        !EMAIL_INLINE_RE.test(trimmed)
      ) {
        promptEmailRequiredInChat(needsEmailForEstimate ? "estimate" : "general", trimmed);
        return;
      }

      if (trimmed === "Continue by voice") {
        setPickerSelectedVoice(settings.voice ?? "");
        setPickerConfirmedVoice(null);
        setShowVoicePickerCard(true);
        return;
      }
      if (trimmed === "Continue by text") {
        setWelcomeHubMode("text");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("voice-chat-mode-choice", {
              detail: { mode: "text" },
            }),
          );
        }
        return;
      }
      if (trimmed === EMAIL_CAPTURE_CHOICE_EN || trimmed === EMAIL_CAPTURE_CHOICE_UA) {
        setEmailCaptureAwaitingInput(true);
        setEmailCapturePromptVisible(false);
        const language = detectLanguageFromText(trimmed);
        void appendMessageToConvex({
          role: "assistant",
          source: "text",
          content:
            language === "ua"
              ? "Чудово — тепер, будь ласка, напишіть ваш email у чаті."
              : "Great - please type your email in this chat.",
        });
        return;
      }
      const isWelcomeHubTopicPrompt = VOICE_CHAT_QUICK_PROMPTS.some(
        (p) => trimmed === p.valueEn || trimmed === p.title,
      );
      if (!isWelcomeHubTopicPrompt) {
        setWelcomeHubDismissed(true);
      }
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
    [
      sendProgrammaticMessage,
      canUseChat,
      conversationId,
      ensureConversationId,
      appendMessageToConvex,
      jumpToLatestMessages,
      hasCapturedEmail,
      promptEmailRequiredInChat,
    ],
  );

  useEffect(() => {
    const raw = convexMessages || [];
    let n = 0;
    for (const m of raw) {
      if (m.role !== "user") continue;
      const c = (m.content || "").trim();
      if (c.startsWith("I selected:")) continue;
      if (/^\[ESTIMATE\s+(MODE|PANEL)\]/i.test(c)) continue;
      const mode = (parseToolCall(m.content || "")?.mode) || "default";
      if (mode === "update") continue;
      n++;
    }
    visibleUserMessageCountForEmailRef.current = n;
    const gate = Boolean(
      conversationId &&
        !hasCapturedEmail &&
        n >= EMAIL_CAPTURE_MIN_USER_MESSAGES,
    );
    emailRequiredGateRef.current = gate;
    setEmailRequiredGate(gate);
  }, [convexMessages, conversationId, hasCapturedEmail]);

  useEffect(() => {
    if (!emailRequiredGate) setEmailComposerGateNotice(null);
  }, [emailRequiredGate]);

  const handleComposerQuickSelect = useCallback(
    async (request: string) => {
      const trimmedRequest = request.trim();
      const needsEmailForEstimate = !hasCapturedEmail && hasEstimateIntent(trimmedRequest);
      if ((emailRequiredGate || needsEmailForEstimate) && !EMAIL_INLINE_RE.test(trimmedRequest)) {
        promptEmailRequiredInChat(needsEmailForEstimate ? "estimate" : "general", trimmedRequest);
        return;
      }
      console.log("🎯 Quick action selected:", request);
      if (!sendProgrammaticMessage) return;
      jumpToLatestMessages();
      await sendProgrammaticMessage(request);
    },
    [emailRequiredGate, hasCapturedEmail, sendProgrammaticMessage, jumpToLatestMessages, promptEmailRequiredInChat],
  );

  const resolveQuickPromptTool = useCallback((promptText: string) => {
    const lower = promptText.trim().toLowerCase();
    if (
      lower.includes("portfolio") ||
      lower.includes("case studies") ||
      lower.includes("show your case studies") ||
      lower.includes("кейси") ||
      lower.includes("портфоліо")
    ) {
      return "show_cases";
    }
    if (lower.includes("what does cieden do") || lower.includes("company and services")) {
      return "show_about";
    }
    if (lower.includes("design process") || lower.includes("timeline")) {
      return "show_process";
    }
    if (lower.includes("development as well") || lower.includes("design only")) {
      return "show_engagement_models";
    }
    if (lower.includes("start a project") || lower.includes("first step")) {
      return "show_getting_started";
    }
    if (lower.includes("project cost") || lower.includes("rough estimate")) {
      return "open_calculator";
    }
    return null;
  }, []);

  const rememberedNameRef = useRef(false);
  const rememberedEmailRef = useRef(false);

  // `isAuthenticated()` discovery can fail, but for message sending we must
  // have a real authenticated Convex identity (`currentUser`).
  // Otherwise conversation creation / message persistence won't work.
  const chatReady = canUseChat;

  // Keep a fixed user label in chat bubbles (no auto name switching).
  const userDisplayName = "You";

  const userEmailDisplay =
    onboardingEmail ||
    normalizeCapturedEmail(selectedConversation?.guestEmail) ||
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
    const normalized = normalizeCapturedEmail(savedEmail);
    if (!isValidEmail(normalized)) return;
    rememberedEmailRef.current = true;
    setOnboardingEmail(normalized);
  }, []);

  useEffect(() => {
    if (onboardingEmail) return;
    const persisted = normalizeCapturedEmail(selectedConversation?.guestEmail);
    if (!isValidEmail(persisted)) return;
    setOnboardingEmail(persisted);
  }, [onboardingEmail, selectedConversation?.guestEmail]);

  // If auth discovery fails but Convex still recognizes an existing session,
  // `isAuthenticated` can temporarily stay false. In that case, prefer
  // `currentUser` to decide whether to show onboarding.
  // We show the onboarding UI only until we finish name+email input.
  // After that, we render the main chat UI even if Convex Auth is temporarily
  // broken (guest persistence will take over).
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
  useCopilotAction(
    {
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
    },
    [],
  );

  // 2) Specific case details
  // (Deprecated in favour of side panel navigation; keep CaseStudyPanel for detailed view)

  // 3) Best / highlight case
  useCopilotAction(
    {
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
    },
    [],
  );

  // 4) Engagement / pricing models
  useCopilotAction(
    {
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
    },
    [],
  );

  // 5) Generate preliminary estimate card
  useCopilotAction(
    {
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
  },
  [],
  );

  // 6) Lightweight “calculator” – more like an entry point card
  useCopilotAction(
    {
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
    },
    [],
  );

  // CopilotKit action for creating pie charts
  useCopilotAction(
    {
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
    },
  },
  [conversationId],
  );

  // CopilotKit action for creating bar charts  
  useCopilotAction(
    {
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
    },
  },
  [conversationId],
  );

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
  const [estimateFirstMessageId, setEstimateFirstMessageId] = useState<string | null>(null);
  const [estimateEndMsgId, setEstimateEndMsgId] = useState<string | null>(null);
  const [showEstimateAssistantRunner, setShowEstimateAssistantRunner] = useState(false);
  const [estimateFlowToken, setEstimateFlowToken] = useState(0);
  const estimateFlowTokenRef = useRef(estimateFlowToken);

  useEffect(() => {
    estimateFlowTokenRef.current = estimateFlowToken;
    if (typeof window !== "undefined") {
      (window as any).__estimateFlowTokenRef = estimateFlowToken;
    }
  }, [estimateFlowToken]);

  // Bridge + useTextInput: true while side panel is visible OR assistant-driven estimate flow is active.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flowActive =
      showEstimatePanel || showEstimateAssistantRunner || showEstimateInline;
    (window as unknown as { __ciedenEstimatePanelOpen?: boolean }).__ciedenEstimatePanelOpen =
      flowActive;
    // Don't reset __ciedenOriginalChooserId here — the original chooser
    // card must stay visible even after estimate completes (shows "Completed" state).
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
      const detail = (e as CustomEvent).detail;
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      pendingEstimateContextualMessagesRef.current = [];
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(true);
      setShowEstimateAssistantRunner(false);
      setEstimateFinalResult(null);
      setEstimateEndMsgId(null);
      if (detail?.messageId) setEstimateFirstMessageId(String(detail.messageId));
      setShowEstimatePanel(true);
      setShowEstimateInline(false);
      setEstimatePanelKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("estimate-panel-opened"));
    };

    const handleChooseAssistant = (e: Event) => {
      // No side panel while assistant is collecting info.
      const detail = (e as CustomEvent).detail;
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      pendingEstimateContextualMessagesRef.current = [];
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(true);
      setShowEstimatePanel(false);
      setEstimateFinalResult(null);
      setEstimateEndMsgId(null);
      if (detail?.messageId) setEstimateFirstMessageId(String(detail.messageId));
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
      completeEstimateSession(detail as unknown as Record<string, unknown>);
      setEstimateFlowWindowFlag(true);
      setEstimateFinalResult(detail);
      (window as any).__lastEstimateFinalResult = detail;
      setShowEstimatePanel(true);
      setShowEstimateInline(false);
      setShowEstimateAssistantRunner(false);
      setEstimatePanelKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("estimate-panel-opened"));
      window.dispatchEvent(new CustomEvent("estimate-assistant-progress", { detail: { active: false } }));
    };

    const handleCancel = () => {
      bumpToken();
      pendingEstimateAssistantUserMessagesRef.current = [];
      pendingEstimateContextualMessagesRef.current = [];
      cancelEstimateSession();
      resetCiedenEstimateSessionCompleted();
      setEstimateFlowWindowFlag(false);
      setShowEstimatePanel(false);
      setEstimateFinalResult(null);
      setShowEstimateInline(false);
      setShowEstimateAssistantRunner(false);
      window.dispatchEvent(new CustomEvent("estimate-panel-closed", { detail: { reason: "cancel" } }));
    };

    const handleReopen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setEstimateFinalResult(detail);
      setShowEstimatePanel(true);
      setEstimatePanelKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("estimate-panel-opened"));
    };

    window.addEventListener("estimate-inline-active-change", handleInlineActive);
    window.addEventListener("estimate-choose-quick", handleChooseQuick);
    window.addEventListener("estimate-choose-assistant", handleChooseAssistant);
    window.addEventListener("estimate-cancel", handleCancel);
    window.addEventListener("estimate-final-ready", handleEstimateFinal);
    window.addEventListener("estimate-reopen", handleReopen);
    return () => {
      window.removeEventListener("estimate-inline-active-change", handleInlineActive);
      window.removeEventListener("estimate-choose-quick", handleChooseQuick);
      window.removeEventListener("estimate-choose-assistant", handleChooseAssistant);
      window.removeEventListener("estimate-cancel", handleCancel);
      window.removeEventListener("estimate-final-ready", handleEstimateFinal);
      window.removeEventListener("estimate-reopen", handleReopen);
    };
  }, []);

  /** Closing the final-result side panel. End-of-session anchor is derived from chat (see effect below). */
  const dismissFinalEstimatePanel = useCallback(() => {
    setEstimateFlowWindowFlag(false);
    setShowEstimatePanel(false);
    setEstimateFinalResult(null);
    setShowEstimateInline(false);
    setShowEstimateAssistantRunner(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("estimate-panel-closed", { detail: { reason: "final-panel" } }));
      window.dispatchEvent(new CustomEvent("estimate-assistant-progress", { detail: { active: false } }));
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

    find_similar_cases: async (params) => {
      console.log("🔎 Bridge Handler - find_similar_cases called:", params);
      const p = params as {
        product_description?: string;
        user_product_summary?: string;
        mode?: string;
      };
      const desc =
        [p.product_description, p.user_product_summary].find(
          (s) => typeof s === "string" && s.trim().length > 0,
        )?.trim() ?? "";
      if (!desc) {
        return "Call find_similar_cases again with product_description: a short summary of the user's product in their own words (or yours).";
      }
      try {
        if (typeof window !== "undefined") {
          const isEstimateOpen = (window as unknown as { __ciedenEstimatePanelOpen?: boolean })
            .__ciedenEstimatePanelOpen;
          if (isEstimateOpen) {
            return "We're in estimate mode — finish the estimate first, then we can match similar portfolio cases.";
          }
        }
        const res = await fetch("/api/case-studies/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: desc }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "match_failed");
        }
        const ranked = data.results as Array<{
          case: {
            id: string;
            title: string;
            domain: string[];
            description: string;
            url: string;
            highlight?: string;
            image?: string;
          };
          matchReasons: string[];
          relevanceScore: number;
          narrativeExcerpt?: string;
        }>;
        const payload: FindSimilarCasesToolPayload = {
          productDescription: desc,
          results: ranked.map((r) => ({
            ...r.case,
            matchReasons: r.matchReasons,
            relevanceScore: r.relevanceScore,
            narrativeExcerpt: r.narrativeExcerpt,
          })),
          overallConfidence: data.overallConfidence,
          lowConfidence: data.lowConfidence,
          semanticAvailable: data.semanticAvailable,
          mode: "default",
        };
        const toolCallMessage = `TOOL_CALL:find_similar_cases:${safeJSONStringify(payload)}`;
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
              toolName: "find_similar_cases",
              timestamp: Date.now(),
            });
          }, 200);
        }
        const titles = payload.results.map((r) => r.title).join("; ");
        const hasStories = payload.results.some((r) => r.narrativeExcerpt?.trim());
        const storyHint = hasStories
          ? " Each case on screen includes a long excerpt from the official cieden.com case page — use that text (and the link) to explain what we did; don’t invent details not in the excerpt."
          : "";
        return payload.lowConfidence
          ? `Closest portfolio matches (moderate confidence): ${titles}. They’re on screen with “why matched” notes.${storyHint} If none fit, ask industry and platform.`
          : `Closest Cieden cases to what you described: ${titles}.${storyHint} Don’t invent other project names.`;
      } catch (error) {
        console.error("❌ Failed find_similar_cases:", error);
        return "I couldn’t load case matches from the server. Offer show_cases or ask one clarifying question (industry + platform).";
      }
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
      if (!hasCapturedEmail) {
        return "Before I prepare an estimate, please type your work email in chat.";
      }
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
      if (!hasCapturedEmail) {
        return "Before I open the estimate flow, please type your work email in chat.";
      }
      // Skip if the client-side injection already created one recently (prevents duplicate chooser cards)
      const primaryAt = (window as any).__ciedenEstimateFlowPrimaryAt as number | undefined;
      if (primaryAt && Date.now() - primaryAt < 5000) {
        console.log('🧮 Bridge: skipping duplicate open_calculator (client injection already handled)');
        return 'The estimate chooser is already visible in the chat.';
      }
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
        const base: Record<string, unknown> =
          params && typeof params === "object" ? { ...(params as any) } : {};
        base.mode = "default";

        const pickAgentOverrides = (b: Record<string, unknown>) => {
          const o: Record<string, unknown> = {};
          for (const k of ["productType", "budgetRange", "timeline", "primaryGoal", "notes"]) {
            const v = b[k];
            if (typeof v === "string" && v.trim()) o[k] = v.trim();
          }
          if (Array.isArray(b.platforms) && b.platforms.length) {
            o.platforms = b.platforms.filter((x) => typeof x === "string" && String(x).trim());
          }
          if (Array.isArray(b.secondaryGoals) && b.secondaryGoals.length) {
            o.secondaryGoals = b.secondaryGoals.filter((x) => typeof x === "string" && String(x).trim());
          }
          return o;
        };

        let merged: Record<string, unknown> = { ...base };

        if (conversationId) {
          const lines: { role: string; content: string }[] = [];
          for (const m of (convexMessagesRef.current || []).slice(-42)) {
            if (m.role !== "user" && m.role !== "assistant") continue;
            const c = (m as { content?: string }).content;
            if (!c || !String(c).trim()) continue;
            const tc = parseToolCall(c);
            if (tc) {
              lines.push({ role: m.role, content: `[UI: ${tc.toolName}]` });
              continue;
            }
            lines.push({ role: m.role, content: String(c).trim().slice(0, 4000) });
          }

          if (lines.length > 0) {
            try {
              const { mode: _drop, ...agentDraft } = base;
              const res = await fetch("/api/project-brief/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  messages: lines.slice(-36),
                  agentBrief: agentDraft,
                }),
              });
              if (res.ok) {
                const j = (await res.json()) as { brief?: Record<string, unknown> | null };
                if (j.brief && typeof j.brief === "object") {
                  merged = { mode: "default", ...j.brief, ...pickAgentOverrides(base) };
                }
              }
            } catch (err) {
              console.warn("⚠️ project-brief synthesize failed, using tool params only:", err);
            }
          }
        }

        const toolCallMessage = `TOOL_CALL:show_project_brief:${safeJSONStringify(merged)}`;

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
  useCopilotAction(
    {
      name: "showAccountBalance",
      description:
        "Display the user's current account balance with a beautiful visual representation. Use this when users ask about their balance, account status, or available funds.",
      parameters: [
        {
          name: "balance",
          type: "number",
          description: "Current account balance amount",
          required: true,
        },
        {
          name: "previousBalance",
          type: "number",
          description: "Previous balance for comparison (optional)",
          required: false,
        },
        {
          name: "currency",
          type: "string",
          description: "Currency code (e.g. USD, EUR). Defaults to USD.",
          required: false,
        },
      ],
      handler: async ({ balance, previousBalance, currency = "USD" }) => {
        console.log("💰 Balance display requested:", { balance, previousBalance, currency });

        await appendMessageToConvex({
          content: `Balance displayed: ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(balance)}`,
          role: "assistant",
          source: "contextual",
          metadata: {
            toolName: "showAccountBalance",
            toolType: "frontend_action",
            parameters: { balance, previousBalance, currency },
            executedAt: Date.now(),
          },
        });

        return `Displaying current balance: ${new Intl.NumberFormat("en-US", {
          style: "currency",
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
      },
    },
    [conversationId, appendMessageToConvex],
  );


  useEffect(() => {
    // Create or get conversation on mount (auth and guest modes).
    async function initConversation() {
      if (conversationId) return;
      if (creatingConversationRef.current) return;

      if (canUseChat) {
        if (conversations === undefined) return;
        if (conversations.length > 0) {
          let selected: Id<"conversations"> | null = conversations[0]?._id ?? null;
          if (typeof window !== "undefined") {
            const saved = window.localStorage.getItem(LAST_CONVERSATION_STORAGE_KEY);
            if (saved) {
              const matched = conversations.find((c) => String(c._id) === saved);
              if (matched?._id) {
                selected = matched._id;
              }
            }
          }
          if (selected) {
            conversationIdRef.current = selected;
            setConversationId(selected);
          }
          return;
        }

        creatingConversationRef.current = true;
        try {
          const id = await createConversation({ title: "Voice Chat" });
          conversationIdRef.current = id;
          setConversationId(id);
        } catch (error) {
          console.warn('Failed to create conversation (auth may not be ready):', error);
        } finally {
          creatingConversationRef.current = false;
        }
        return;
      }

      // Guest mode: create a persisted conversation in Convex immediately.
      creatingConversationRef.current = true;
      try {
        const guestIdentity = ensureGuestIdentityInCookie({
          name: onboardingName || undefined,
          email: onboardingEmail || undefined,
        });
        const id = await createConversation({
          title: "Voice Chat",
          guestId: guestIdentity.guestId,
          guestEmail: onboardingEmail || undefined,
          guestName: onboardingName || undefined,
        });
        conversationIdRef.current = id;
        setConversationId(id);
      } catch (error) {
        console.warn("Failed to create guest conversation:", error);
      } finally {
        creatingConversationRef.current = false;
      }
    }
    initConversation();
  }, [
    canUseChat,
    conversations,
    createConversation,
    conversationId,
    onboardingEmail,
    onboardingName,
  ]);

  useEffect(() => {
    if (!conversationId) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_CONVERSATION_STORAGE_KEY, String(conversationId));
  }, [conversationId, LAST_CONVERSATION_STORAGE_KEY]);

  // Handle messages from unified input
  const handleMessage = useCallback(async (text: string, source: 'voice' | 'text') => {
    setLastMessage({ text, source });
    console.log(`📝 Message received from ${source}:`, text);

    // During auth/onboarding we don't want the normal chat handler to run.
    // Pre-auth flow (name/email) is handled via `onPreAuthMessage`.
    // But in "guest" mode (conversationId === null) we still need to render messages
    // in the onboarding ChatWindow.
    // Allow guest persistence even if Convex Auth discovery is failing.

    // Single-channel mode: avoid local onboarding message lane.
    // If conversation is not ready yet, try to initialize it and skip this transient message.
    if (!conversationId) {
      await ensureConversationId();
      return;
    }

    const trimmedUserText = text.trim();
    if (trimmedUserText) {
      lastUserLanguageRef.current = detectLanguageFromText(trimmedUserText);
    }
    const needsEmailForEstimate = !hasCapturedEmail && hasEstimateIntent(trimmedUserText);
    const needsEmailForMessage = emailRequiredGateRef.current || needsEmailForEstimate;
    const isWelcomeHubTopicText = VOICE_CHAT_QUICK_PROMPTS.some(
      (p) => trimmedUserText === p.valueEn || trimmedUserText === p.title,
    );
    if (
      source === "text" &&
      trimmedUserText.length > 0 &&
      !ADDRESS_NAME_PROMPT_CHOICES.includes(trimmedUserText) &&
      !isWelcomeHubTopicText
    ) {
      setWelcomeHubDismissed(true);
    }

    if (source === "voice" && needsEmailForMessage) {
      promptEmailRequiredInChat(needsEmailForEstimate ? "estimate" : "general", trimmedUserText);
      return;
    }
    if (
      source === "text" &&
      needsEmailForMessage &&
      !EMAIL_INLINE_RE.test(trimmedUserText)
    ) {
      promptEmailRequiredInChat(needsEmailForEstimate ? "estimate" : "general", trimmedUserText);
      return;
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
        if (emailCaptureAwaitingInput) {
          setEmailCaptureAwaitingInput(false);
          setEmailCaptureDismissed(true);
          setEmailCapturePromptVisible(false);
          void appendMessageToConvex({
            role: "assistant",
            source: "text",
            content: "Perfect, thanks! I saved your email for follow-up.",
          });
        }
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

    // Forward user message to EstimateWizardPanel local tracker
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
  }, [
    voiceStatus,
    conversationId,
    ensureConversationId,
    onboardingName,
    onboardingEmail,
    hasCapturedEmail,
    emailCaptureAwaitingInput,
    appendMessageToConvex,
    promptEmailRequiredInChat,
  ]);

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
  }, [convexMessages?.length, forceScrollToBottom]);



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

      setIntroRevealComplete(false);
      setIntroAnimStep(0);
      setIntroSessionKey((k) => k + 1);
      introPersistedRef.current = false;
      addressPromptPersistedRef.current = false;
      setShowIntroHubPinned(false);
      setShowIntroAddressPinned(false);
      setPinnedFirstAssistantMessage(null);
      setEmailCapturePromptVisible(false);
      setEmailCaptureDismissed(false);
      setEmailCaptureAwaitingInput(false);
      lastSavedConversationEmailRef.current = "";

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
      setIntroRevealComplete(false);
      setIntroAnimStep(0);
      setIntroSessionKey((k) => k + 1);
      introPersistedRef.current = false;
      addressPromptPersistedRef.current = false;
      setShowIntroHubPinned(false);
      setShowIntroAddressPinned(false);
      setPinnedFirstAssistantMessage(null);
      setWelcomeHubMode(null);
      setWelcomeHubDismissed(false);
      setWelcomeVoiceCueBuffer("");
      setVoiceWelcomeRevealAll(false);
      setIntroTypewriterDone(false);
      setIntroVisibleChars(0);
      setShowVoicePickerCard(false);
      setPickerConfirmedVoice(null);
      setEmailCapturePromptVisible(false);
      setEmailCaptureDismissed(false);
      setEmailCaptureAwaitingInput(false);
      lastSavedConversationEmailRef.current = "";
      setConversationId(id);
      hasAskedEmailRef.current = false;
      setOnboardingMessages([]);
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

  const visibleConvexChatMessages = useMemo(() => {
    const raw = convexMessages || [];
    const filtered = raw.filter((message) => {
      if (message.role === "system" && message.source === "contextual") return false;
      if (message.role === "user" && message.content.startsWith("I selected:")) return false;
      if (/onboarding complete\./i.test((message.content || "").trim())) return false;
      const mode = getMessageMode(message.content);
      if (mode === "update") return false;
      const c = message.content || "";
      if (message.role === "user" && /^\[ESTIMATE\s+(MODE|PANEL)\]/i.test(c.trim())) return false;
      return true;
    });
    const toolDeduped = filtered.filter((message, index, arr) => {
      const isTool = !!parseToolCall(message.content);
      if (!isTool) {
        if (index > 0 && message.role === "assistant") {
          const prev = arr[index - 1];
          if (prev && prev.role === "assistant" && prev.content === message.content) return false;
        }
        return true;
      }
      const prev = index > 0 ? arr[index - 1] : null;
      const prevIsTool = !!(prev && parseToolCall(prev.content));
      if (prevIsTool && prev?.content === message.content) return false;
      return true;
    });
    return toolDeduped;
  }, [convexMessages, getMessageMode]);

  const visibleConvexChatMessagesRef = useRef(visibleConvexChatMessages);
  useEffect(() => { visibleConvexChatMessagesRef.current = visibleConvexChatMessages; }, [visibleConvexChatMessages]);
  const emailCaptureLanguage = useMemo<"en" | "ua">(() => {
    for (let i = visibleConvexChatMessages.length - 1; i >= 0; i--) {
      const m = visibleConvexChatMessages[i];
      if (m.role !== "user") continue;
      if (!m.content?.trim()) continue;
      return detectLanguageFromText(m.content);
    }
    return lastUserLanguageRef.current;
  }, [visibleConvexChatMessages]);
  // Keep quick-prompt fallback predictable: no extra history-based auto cards.

  // Pin "Estimate session" card under the final-summary bubble (not the last Q before the user’s last answer).
  // 1) Prefer assistant text that looks like a delivered estimate. 2) If none (strict model text), fall back once
  // to last assistant after the last user message while we have __lastEstimateFinalResult.
  useEffect(() => {
    if (!estimateFirstMessageId || !isCiedenEstimateSessionCompleted()) return;
    const msgs = visibleConvexChatMessages;
    const firstIdx = msgs.findIndex((m) => String(m._id) === estimateFirstMessageId);
    if (firstIdx === -1) return;

    let strictIdx = -1;
    for (let i = firstIdx; i < msgs.length; i++) {
      const m = msgs[i];
      if (
        m.role === "assistant" &&
        !parseToolCall(m.content) &&
        looksLikeAssistantFinalEstimateContent(m.content)
      ) {
        strictIdx = i;
      }
    }

    if (strictIdx !== -1) {
      const id = String(msgs[strictIdx]._id);
      setEstimateEndMsgId((prev) => (prev === id ? prev : id));
      return;
    }

    const hasStored =
      typeof window !== "undefined" && !!(window as unknown as { __lastEstimateFinalResult?: unknown }).__lastEstimateFinalResult;
    if (!hasStored) return;

    let lastUserIdx = -1;
    for (let i = firstIdx; i < msgs.length; i++) {
      if (msgs[i].role === "user") lastUserIdx = i;
    }
    let fbIdx = -1;
    if (lastUserIdx >= firstIdx) {
      for (let i = msgs.length - 1; i > lastUserIdx; i--) {
        if (msgs[i].role === "assistant" && !parseToolCall(msgs[i].content)) {
          fbIdx = i;
          break;
        }
      }
    } else {
      for (let i = msgs.length - 1; i >= firstIdx; i--) {
        if (msgs[i].role === "assistant" && !parseToolCall(msgs[i].content)) {
          fbIdx = i;
          break;
        }
      }
    }
    if (fbIdx === -1) return;
    const idfb = String(msgs[fbIdx]._id);
    setEstimateEndMsgId((prev) => (prev == null ? idfb : prev));
  }, [visibleConvexChatMessages, estimateFirstMessageId, estimateFinalResult]);

  // Find the index of the end-of-session message for the "View estimate result" card.
  const estimateButtonIdx = useMemo(() => {
    if (!estimateEndMsgId) return -1;
    return visibleConvexChatMessages.findIndex(m => String(m._id) === estimateEndMsgId);
  }, [visibleConvexChatMessages, estimateEndMsgId]);

  const emptyLoadedThread = Boolean(
    conversationId &&
      !convexMessagesLoading &&
      convexMessages.length === 0,
  );
  const preUserPhaseMessages = useMemo(() => {
    const raw = convexMessages || [];
    return raw.filter((m) => {
      if (m.role === "system" && m.source === "contextual") return false;
      if (/onboarding complete\./i.test((m.content || "").trim())) return false;
      const mode = getMessageMode(m.content);
      if (mode === "update") return false;
      return m.role === "assistant" || m.role === "user";
    });
  }, [convexMessages, getMessageMode]);
  const hasVisibleUserMessages = preUserPhaseMessages.some((m) => m.role === "user");

  useEffect(() => {
    welcomeInitialGateDoneRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || convexMessagesLoading) return;
    if (welcomeInitialGateDoneRef.current) return;
    welcomeInitialGateDoneRef.current = true;
    setWelcomeHubDismissed(hasVisibleUserMessages);
  }, [conversationId, convexMessagesLoading, hasVisibleUserMessages]);

  /** Welcome hub: same thread; stays through voice until user types or picks a substantive quick prompt. */
  const showIntroQuickPath = Boolean(
    conversationId && !convexMessagesLoading && !welcomeHubDismissed,
  );
  /** Same 6 buttons as onboarding, but kept at the bottom of the thread after the first user message. */
  const showFollowUpQuickPromptGrid = Boolean(
    conversationId && !convexMessagesLoading && hasVisibleUserMessages,
  );

  const voiceWelcomeVisiblePromptCount = useMemo(() => {
    if (welcomeHubMode !== "voice") return 0;
    const lower = welcomeVoiceCueBuffer.toLowerCase();
    let c = 0;
    for (const p of VOICE_CHAT_QUICK_PROMPTS) {
      if (!lower.includes(p.title.toLowerCase())) break;
      c++;
    }
    return c;
  }, [welcomeHubMode, welcomeVoiceCueBuffer]);

  const welcomeVisiblePromptCount =
    welcomeHubMode === "text"
      ? 6
      : welcomeHubMode === "voice"
        ? Math.min(6, Math.max(voiceWelcomeVisiblePromptCount, voiceWelcomeRevealAll ? 6 : 0))
        : 0;

  useEffect(() => {
    if (!showIntroQuickPath) return;
    setWelcomeHubMode(null);
    setWelcomeVoiceCueBuffer("");
    setVoiceWelcomeRevealAll(false);
    setIntroTypewriterDone(false);
    setIntroVisibleChars(0);
    let cancelled = false;
    let i = 0;
    const full = VOICE_CHAT_HARDCODED_INTRO;
    const tick = () => {
      if (cancelled) return;
      i = Math.min(full.length, i + 2);
      setIntroVisibleChars(i);
      if (i < full.length) {
        window.setTimeout(tick, 22);
      } else {
        setIntroTypewriterDone(true);
      }
    };
    const t0 = window.setTimeout(tick, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
    };
  }, [showIntroQuickPath, introSessionKey]);

  useEffect(() => {
    if (welcomeHubMode !== "voice" || !showIntroQuickPath) {
      setVoiceWelcomeRevealAll(false);
      return;
    }
    setVoiceWelcomeRevealAll(false);
    const t = window.setTimeout(() => setVoiceWelcomeRevealAll(true), 14000);
    return () => window.clearTimeout(t);
  }, [welcomeHubMode, showIntroQuickPath, introSessionKey]);

  const hasVisibleAssistantMessages = preUserPhaseMessages.some((m) => m.role === "assistant");
  const preUserFirstAssistantMessage = preUserPhaseMessages.find(
    (m) =>
      m.role === "assistant" &&
      !matchesHardcodedStaticIntro(m.content || "") &&
      !matchesHiddenOnboardingAssistantBubble(m.content || ""),
  ) || null;
  const preUserFirstAssistantId = preUserFirstAssistantMessage?._id ?? null;
  const hasAssistantIntroDuplicateInConvex = useMemo(
    () =>
      preUserPhaseMessages.some(
        (m) => m.role === "assistant" && matchesHardcodedStaticIntro(m.content || ""),
      ),
    [preUserPhaseMessages],
  );
  /** Fresh voice-started thread: first assistant message exists, user has not replied yet. */
  const isPreUserReplyPhase = Boolean(
    conversationId &&
      !convexMessagesLoading &&
      hasVisibleAssistantMessages &&
      !hasVisibleUserMessages,
  );
  const [postFirstMessageStep, setPostFirstMessageStep] = useState<0 | 1 | 2>(0);
  const [showIntroHubPinned, setShowIntroHubPinned] = useState(false);
  const [showIntroAddressPinned, setShowIntroAddressPinned] = useState(false);
  const [pinnedFirstAssistantMessage, setPinnedFirstAssistantMessage] = useState<{
    id: string;
    content: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (!isPreUserReplyPhase || !preUserFirstAssistantId) {
      setPostFirstMessageStep(0);
      return;
    }
    // Stagger: 0 = agent bubble only, 1–2 = reveal name/mode prompt (quick grid is separate UI).
    setPostFirstMessageStep(0);
    const t1 = setTimeout(() => setPostFirstMessageStep(1), 280);
    const t2 = setTimeout(() => setPostFirstMessageStep(2), 640);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isPreUserReplyPhase, preUserFirstAssistantId]);

  useEffect(() => {
    if (postFirstMessageStep >= 1) setShowIntroHubPinned(true);
    if (postFirstMessageStep >= 2) setShowIntroAddressPinned(true);
  }, [postFirstMessageStep]);

  useEffect(() => {
    if (!preUserFirstAssistantMessage || pinnedFirstAssistantMessage) return;
    if (matchesHardcodedStaticIntro(preUserFirstAssistantMessage.content || "")) {
      return;
    }
    if (matchesHiddenOnboardingAssistantBubble(preUserFirstAssistantMessage.content || "")) {
      return;
    }
    setPinnedFirstAssistantMessage({
      id: preUserFirstAssistantMessage._id,
      content: preUserFirstAssistantMessage.content,
      timestamp:
        (preUserFirstAssistantMessage as { _creationTime?: number })._creationTime ??
        Date.now(),
    });
  }, [preUserFirstAssistantMessage, pinnedFirstAssistantMessage]);
  const introAnimationRunning = Boolean(
    emptyLoadedThread && !introRevealComplete,
  );
  const showIntroSynthAddress = Boolean(
    (isPreUserReplyPhase && !!preUserFirstAssistantId && postFirstMessageStep >= 2) ||
      showIntroAddressPinned,
  );

  /** Returning user with existing history but no user messages yet: welcome hub above Convex messages.
   *  Never show when showIntroQuickPath or showFollowUpQuickPromptGrid is active (would duplicate buttons). */
  const showReturningWelcomeHub = Boolean(
    conversationId &&
      !convexMessagesLoading &&
      convexMessages.length > 0 &&
      !hasVisibleUserMessages &&
      !showIntroQuickPath &&
      !introRevealComplete &&
      !showIntroHubPinned &&
      !showIntroAddressPinned &&
      !pinnedFirstAssistantMessage,
  );

  useEffect(() => {
    if (!conversationId || convexMessagesLoading) return;
    if (emailCapturePromptVisible || onboardingEmail) return;

    const userCount = visibleConvexChatMessages.filter((m) => m.role === "user").length;
    const hasUsefulAssistantReply = visibleConvexChatMessages.some(
      (m) => m.role === "assistant" && !isLikelyDefaultCiedenGreeting(m.content || ""),
    );
    const hasToolCard = (convexMessages || []).some((m) => !!parseToolCall(m.content || ""));

    if (
      userCount >= EMAIL_CAPTURE_MIN_USER_MESSAGES &&
      (hasUsefulAssistantReply || hasToolCard)
    ) {
      setEmailCapturePromptVisible(true);
    }
  }, [
    conversationId,
    convexMessagesLoading,
    emailCapturePromptVisible,
    onboardingEmail,
    visibleConvexChatMessages,
    convexMessages,
  ]);

  useEffect(() => {
    if (!conversationId || !onboardingEmail) return;
    if (lastSavedConversationEmailRef.current === onboardingEmail) return;

    let cancelled = false;
    void (async () => {
      try {
        await updateGuestContact({
          conversationId,
          guestEmail: onboardingEmail,
          guestName: onboardingName || undefined,
          guestId: guestId ?? undefined,
        });
        if (!cancelled) {
          lastSavedConversationEmailRef.current = onboardingEmail;
        }
      } catch (error) {
        console.error("Failed to persist conversation guest contact:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    onboardingEmail,
    onboardingName,
    guestId,
    updateGuestContact,
  ]);

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
        await appendMessageToConvex({
          content: text,
          role: "system",
          source: "contextual",
        });
        console.log('🗂️ Saved contextual update to Convex (CLOSE_QUIZ_MODAL)');
      }
    } else if (!!parseToolCall(text)) {
      // Tool calls should be saved to Convex as new messages (even if protocol is partial)
      console.log('💾 Saving tool call to Convex:', text);
      await appendMessageToConvex({
        content: text,
        role: "assistant",
        source: "contextual",
      });
      console.log('✅ Tool call message saved to Convex');
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
      await appendMessageToConvex({
        content: text,
        role: "system",
        source: "contextual",
      });
      console.log('🗂️ Saved contextual update to Convex');
    }
  }, [appendMessageToConvex, sendContextualUpdate, sendProgrammaticMessage]);

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
        <WelcomeVoiceCueBridge
          enabled={
            welcomeHubMode === "voice" &&
            showIntroQuickPath &&
            introTypewriterDone
          }
          onAgentText={onWelcomeVoiceAgentText}
        />
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
              clearGuestIdentityInCookie();
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("cieden_preferred_name");
                window.localStorage.removeItem("cieden_preferred_email");
                window.localStorage.removeItem("cieden_last_conversation_id");
              }
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
              <div className="space-y-4 lg:space-y-6 w-full max-w-[min(100%,1400px)] mx-auto py-6">
                {conversationId && !convexMessagesLoading && (showIntroQuickPath || showVoicePickerCard) && (
                  <div className="space-y-6 w-full max-w-[900px] mx-auto">
                    {showIntroQuickPath && (
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <WelcomeRobot modelUrl="/welcome-robot.glb" className="mb-4" />
                        <ChatMessage
                          message={{
                            id: `voice-chat-static-intro-${introSessionKey}`,
                            role: "assistant",
                            content: VOICE_CHAT_HARDCODED_INTRO.slice(0, introVisibleChars),
                            timestamp: staticIntroTimestamp,
                            suppressDefaultSuggestions: true,
                            suggestedAnswers: introTypewriterDone
                              ? [...ADDRESS_NAME_PROMPT_CHOICES]
                              : undefined,
                          }}
                          onQuickPrompt={
                            introTypewriterDone ? (t) => sendQuickPrompt(t) : undefined
                          }
                          userName={userDisplayName}
                        />
                      </motion.div>
                    )}
                    <AnimatePresence initial={false} mode="sync">
                      {showVoicePickerCard && (
                        <motion.div
                          key="voice-picker-card"
                          initial={{ opacity: 0, y: 16, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.97 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="w-full max-w-[900px] mx-auto"
                        >
                          <div className="rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-lg px-6 py-5 space-y-4">
                            {pickerConfirmedVoice !== null ? (
                              <>
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#4C3AE6]/30">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#4C3AE6]">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <h3 className="text-white font-semibold text-base">
                                      {VOICE_OPTIONS.find(v => v.id === pickerConfirmedVoice)?.name ?? "Jessica"}
                                    </h3>
                                    <p className="text-white/50 text-xs">Voice selected — connecting...</p>
                                  </div>
                                </div>
                                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                  <motion.div
                                    className="h-full bg-[#4C3AE6] rounded-full"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" x2="12" y1="19" y2="22"/>
                                  </svg>
                                  <h3 className="text-white font-semibold text-base">Choose a voice</h3>
                                </div>
                                <p className="text-white/60 text-sm">Tap a voice to preview it, then press Select to start.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {VOICE_OPTIONS.map((voice) => {
                                    const isSelected = pickerSelectedVoice === voice.id;
                                    const isLoading = previewLoadingVoice === voice.id;
                                    const isPlaying = previewPlayingVoice === voice.id;
                                    return (
                                      <motion.button
                                        key={voice.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                          setPickerSelectedVoice(voice.id);
                                          if (voice.id) {
                                            void playVoicePreview(voice.id);
                                          } else {
                                            stopPreviewAudio();
                                          }
                                        }}
                                        className={`relative flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                          isSelected
                                            ? "bg-[#4C3AE6]/40 border-[#4C3AE6] text-white ring-2 ring-[#4C3AE6]/30 shadow-md shadow-[#4C3AE6]/20 scale-[1.02]"
                                            : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-sm hover:scale-[1.01]"
                                        }`}
                                      >
                                        {isSelected && !isLoading && !isPlaying && (
                                          <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-[#4C3AE6]">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                          </span>
                                        )}
                                        {isLoading && (
                                          <span className="absolute top-2 right-2 h-4 w-4 rounded-full border-2 border-[#4C3AE6]/40 border-t-[#4C3AE6] animate-spin" />
                                        )}
                                        {isPlaying && !isLoading && (
                                          <span className="absolute top-2 right-2 flex gap-[2px] items-end h-4">
                                            <span className="w-[3px] bg-[#4C3AE6] rounded-full animate-pulse" style={{ height: "50%", animationDelay: "0ms" }} />
                                            <span className="w-[3px] bg-[#4C3AE6] rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
                                            <span className="w-[3px] bg-[#4C3AE6] rounded-full animate-pulse" style={{ height: "65%", animationDelay: "300ms" }} />
                                          </span>
                                        )}
                                        <span className="font-medium text-sm">{voice.name}</span>
                                        <span className="text-[11px] opacity-50">{voice.label}</span>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-3 pt-1">
                                  <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleVoicePickerSelect}
                                    className={`px-7 py-3 rounded-2xl text-sm font-semibold border transition-all duration-200 ${
                                      pickerSelectedVoice !== (settings.voice ?? "")
                                        ? "bg-violet-500/25 border-violet-300/70 text-white shadow-[0_8px_22px_rgba(124,58,237,0.35)] ring-1 ring-violet-300/40 hover:bg-violet-500/35 hover:border-violet-200"
                                        : "bg-white/8 border-white/25 text-white/90 hover:bg-white/14 hover:border-white/40"
                                    }`}
                                  >
                                    Select voice
                                  </motion.button>
                                  <button
                                    type="button"
                                    onClick={() => { stopPreviewAudio(); setShowVoicePickerCard(false); }}
                                    className="px-4 py-3 rounded-2xl text-white/50 hover:text-white/80 hover:bg-white/5 text-sm transition-all duration-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {showIntroQuickPath && welcomeHubMode !== null && introTypewriterDone && (
                      <motion.div
                        className="pt-1 space-y-3"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                      >
                        <div className="text-center px-2 space-y-2">
                          <h2 className="text-xl font-semibold text-white">
                            {VOICE_CHAT_WELCOME_TITLE}
                          </h2>
                          <p className="text-white/70 text-sm sm:text-base leading-snug">
                            {VOICE_CHAT_WELCOME_SUBTITLE}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                          {(welcomeHubMode === "text"
                            ? VOICE_CHAT_QUICK_PROMPTS
                            : VOICE_CHAT_QUICK_PROMPTS.slice(0, welcomeVisiblePromptCount)
                          ).map((prompt, index) => (
                            <motion.button
                              key={`intro-grid-${introSessionKey}-${prompt.title}-${index}`}
                              type="button"
                              initial={{ opacity: 0, y: 14, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{
                                duration: 0.35,
                                ease: "easeOut",
                                delay: welcomeHubMode === "text" ? 0.08 : index * 0.07,
                              }}
                              onClick={() => {
                                if (disableQuickPrompts) return;
                                const value = (prompt as { valueUk?: string }).valueUk || prompt.valueEn;
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
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                <AnimatePresence initial={false} mode="wait">
                  {pinnedFirstAssistantMessage &&
                    !showIntroQuickPath &&
                    !matchesHardcodedStaticIntro(pinnedFirstAssistantMessage.content) &&
                    !matchesHiddenOnboardingAssistantBubble(pinnedFirstAssistantMessage.content) && (
                    <motion.div
                      key={`intro-step-first-${pinnedFirstAssistantMessage.id}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <ChatMessage
                        key={`pre-user-first-${pinnedFirstAssistantMessage.id}`}
                        message={{
                          id: pinnedFirstAssistantMessage.id,
                          role: "assistant",
                          content: pinnedFirstAssistantMessage.content,
                          timestamp: pinnedFirstAssistantMessage.timestamp,
                          suggestedAnswers: ADDRESS_NAME_PROMPT_CHOICES,
                        }}
                        onQuickPrompt={(text) => sendQuickPrompt(text)}
                        userName={userDisplayName}
                      />
                    </motion.div>
                  )}
                  {/* Hide typing as soon as a real first assistant row exists in Convex (avoids dots + text overlap before pinned sync). */}
                  {!pinnedFirstAssistantMessage &&
                    !preUserFirstAssistantMessage &&
                    !hasAssistantIntroDuplicateInConvex &&
                    conversationId &&
                    !convexMessagesLoading &&
                    !hasVisibleUserMessages &&
                    !(showIntroQuickPath && welcomeHubMode !== null) && (
                    <motion.div
                      key="first-msg-typing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.22, delay: 0.15 }}
                    >
                      <ChatMessage
                        message={{
                          id: "first-msg-typing",
                          role: "assistant",
                          content: "__TYPING__",
                          timestamp: Date.now(),
                        }}
                        userName={userDisplayName}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false} mode="sync">
                  {emailCapturePromptVisible && !onboardingEmail && (
                    <motion.div
                      key="email-capture-prompt"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="space-y-4 w-full max-w-[900px] mx-auto"
                    >
                      <ChatMessage
                        message={{
                          id: "email-capture-prompt",
                          role: "assistant",
                          content:
                            emailCaptureLanguage === "ua"
                              ? EMAIL_CAPTURE_PROMPT_UA
                              : EMAIL_CAPTURE_PROMPT,
                          timestamp: Date.now(),
                          suggestedAnswers: [
                            emailCaptureLanguage === "ua"
                              ? EMAIL_CAPTURE_CHOICE_UA
                              : EMAIL_CAPTURE_CHOICE_EN,
                          ],
                        }}
                        onQuickPrompt={(text) => sendQuickPrompt(text)}
                        userName={userDisplayName}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>


                {visibleConvexChatMessages.map((message, index) => {
                  const normalizeIntroText = (value: string) =>
                    value
                      .toLowerCase()
                      .replace(/\s+/g, " ")
                      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
                      .trim();
                  if (
                    message.role === "assistant" &&
                    matchesHardcodedStaticIntro(message.content || "")
                  ) {
                    return null;
                  }
                  if (
                    message.role === "assistant" &&
                    matchesHiddenOnboardingAssistantBubble(message.content || "")
                  ) {
                    return null;
                  }
                  if (
                    pinnedFirstAssistantMessage &&
                    message._id === pinnedFirstAssistantMessage.id
                  ) {
                    return null;
                  }
                  if (
                    pinnedFirstAssistantMessage &&
                    message.role === "assistant" &&
                    normalizeIntroText(message.content || "") ===
                      normalizeIntroText(pinnedFirstAssistantMessage.content || "")
                  ) {
                    return null;
                  }
                  if (
                    pinnedFirstAssistantMessage &&
                    message.role === "assistant" &&
                    isLikelyDefaultCiedenGreeting(message.content || "")
                  ) {
                    return null;
                  }
                  const isToolCall = !!parseToolCall(message.content);
                  // Show end-session card whenever we have a pinned message (do not hide while result panel is open).
                  const isEstimateEndMsg =
                    estimateEndMsgId !== null && String(message._id) === String(estimateEndMsgId);
                  const estimateEndButton = isEstimateEndMsg ? (
                    <div key={`est-card-${message._id}`} className="w-full max-w-[900px] mx-auto my-3">
                      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
                          Estimate session
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300/90">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Completed
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const data = estimateFinalResult ?? (window as any).__lastEstimateFinalResult;
                              if (data) window.dispatchEvent(new CustomEvent("estimate-reopen", { detail: data }));
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/40 to-indigo-600/40 hover:from-purple-600/60 hover:to-indigo-600/60 border border-purple-400/20 px-4 py-2.5 text-sm font-medium text-white transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/15"
                            aria-label="View estimate result"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <path d="M8 21h8" /><path d="M12 17v4" />
                              <path d="M7 8h2m4 0h4M7 12h10" />
                            </svg>
                            View estimate result
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null;
                  let segmentUserIdx = -1;
                  if (message.role === "user") {
                    segmentUserIdx = index;
                  } else {
                    for (let i = index - 1; i >= 0; i--) {
                      if (visibleConvexChatMessages[i].role === "user") {
                        segmentUserIdx = i;
                        break;
                      }
                    }
                  }
                  const segmentUserContent =
                    segmentUserIdx >= 0 ? visibleConvexChatMessages[segmentUserIdx].content || "" : "";
                  const segmentExpectedTool = resolveQuickPromptTool(segmentUserContent);
                  let nextUserIdx = visibleConvexChatMessages.length;
                  if (segmentUserIdx >= 0) {
                    for (let i = segmentUserIdx + 1; i < visibleConvexChatMessages.length; i++) {
                      if (visibleConvexChatMessages[i].role === "user") {
                        nextUserIdx = i;
                        break;
                      }
                    }
                  }
                  const currentToolName = parseToolCall(message.content)?.toolName ?? null;
                  const shouldSuppressSegmentToolDuplicate =
                    isToolCall &&
                    !!segmentExpectedTool &&
                    currentToolName === segmentExpectedTool &&
                    segmentUserIdx >= 0 &&
                    index > segmentUserIdx &&
                    index < nextUserIdx;
                  if (shouldSuppressSegmentToolDuplicate) {
                    return null;
                  }
                  if (isToolCall) {
                    return (
                      <React.Fragment key={message._id}>
                        <MessageCard
                          message={message}
                          onUserAction={handleUserAction}
                          compact={isMobile}
                        />
                        {estimateEndButton}
                      </React.Fragment>
                    );
                  }
                  const botMsg: ChatbotMessage = {
                    id: message._id,
                    role: message.role as "user" | "assistant",
                    content: message.content,
                    timestamp: (message as { _creationTime?: number })._creationTime ?? Date.now(),
                  };
                  const hasAnyUserBefore = visibleConvexChatMessages
                    .slice(0, index)
                    .some((m) => m.role === "user");
                  const disableQuickPromptsForFirstGreeting =
                    message.role === "assistant" && !hasAnyUserBefore;
                  const isEstimateActive = showEstimateAssistantRunner || showEstimatePanel;
                  const isEstimateMessage = message.role === "assistant" &&
                    ((message.content || "").includes("[ESTIMATE") || (message.metadata as any)?.estimateFlow);
                  // Suppress suggestions for all messages that belong to a completed estimate session
                  const isInsideCompletedEstimate = (() => {
                    if (estimateButtonIdx === -1) return false;
                    const firstIdx = visibleConvexChatMessages.findIndex(m => String(m._id) === estimateFirstMessageId);
                    if (firstIdx === -1) return false;
                    const currentVisibleIdx = visibleConvexChatMessages.findIndex(
                      (m) => String(m._id) === String(message._id),
                    );
                    if (currentVisibleIdx === -1) return false;
                    return currentVisibleIdx >= firstIdx && currentVisibleIdx <= estimateButtonIdx;
                  })();
                  const segmentHasPrimaryCard =
                    segmentExpectedTool
                      ? true
                      : segmentUserIdx >= 0 &&
                        visibleConvexChatMessages
                          .slice(segmentUserIdx + 1, nextUserIdx)
                          .some((m) => !!parseToolCall(m.content));
                  const suppressSuggestions =
                    disableQuickPromptsForFirstGreeting ||
                    isEstimateActive ||
                    isEstimateMessage ||
                    isInsideCompletedEstimate ||
                    (message.role === "assistant" && segmentHasPrimaryCard);
                  const shouldRenderSegmentFallbackAfterUser =
                    message.role === "user" &&
                    !!segmentExpectedTool &&
                    !/^\[ESTIMATE\s+(MODE|PANEL)\]/i.test((message.content || "").trim());
                  return (
                    <React.Fragment key={message._id}>
                      <ChatMessage
                        message={botMsg}
                        onQuickPrompt={
                          suppressSuggestions
                            ? undefined
                            : (text) => sendQuickPrompt(text)
                        }
                        userName={userDisplayName}
                      />
                      {shouldRenderSegmentFallbackAfterUser && (
                        <MessageCard
                          message={{
                            _id: `segment-fallback-${String(message._id)}-${segmentExpectedTool}` as Id<"messages">,
                            role: "assistant",
                            content: `TOOL_CALL:${segmentExpectedTool}:${JSON.stringify({ mode: "default" })}`,
                            source: "text",
                          }}
                          onUserAction={handleUserAction}
                          compact={isMobile}
                        />
                      )}
                      {estimateEndButton}
                    </React.Fragment>
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
                <div ref={messagesEndRef} className={estimateDockActive ? "h-6" : "h-8"} />
              </div>
              </div>
            </main>
            
            {/* Unified Chat Input */}
              {isMobile ? (
            <footer className="flex-shrink-0 p-2 pb-1 bg-transparent pointer-events-none overflow-visible" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 8px), 24px)' }}>
              {emailComposerGateNotice && (
                <div className="pointer-events-auto px-2 pb-2 max-w-[900px] mx-auto">
                  <div
                    role="status"
                    className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-center text-sm text-amber-50"
                  >
                    {emailComposerGateNotice}
                  </div>
                </div>
              )}
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
                  onRequestSelect={handleComposerQuickSelect}
                  isMobile={true}
                  settings={settings}
                  updateSettings={updateSettings}
                  emailRequiredGate={emailRequiredGate}
                  emailRequiredForEstimate={!hasCapturedEmail}
                  onEmailGateBlocked={(reason, attemptedText) => promptEmailRequiredInChat(reason, attemptedText)}
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
              {emailComposerGateNotice && (
                <div className="pointer-events-auto px-4 pb-2 max-w-[900px] mx-auto">
                  <div
                    role="status"
                    className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-center text-sm text-amber-50"
                  >
                    {emailComposerGateNotice}
                  </div>
                </div>
              )}
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
                onRequestSelect={handleComposerQuickSelect}
                settings={settings}
                updateSettings={updateSettings}
                emailRequiredGate={emailRequiredGate}
                emailRequiredForEstimate={!hasCapturedEmail}
                onEmailGateBlocked={(reason, attemptedText) => promptEmailRequiredInChat(reason, attemptedText)}
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
