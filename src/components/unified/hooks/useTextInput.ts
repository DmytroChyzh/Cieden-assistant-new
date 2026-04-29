"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useElevenLabsMessages } from '@/src/hooks/useElevenLabsMessages';
import { Id } from '@/convex/_generated/dataModel';
import {
  useElevenLabsConversation,
  type NormalizedMessageEvent
} from '@/src/providers/ElevenLabsProvider';
import { extractContextFromMessages } from '@/src/utils/agentContext';
import { parseToolCall } from '@/src/utils/parseToolCall';
import { getGuestIdentityFromCookie } from '@/src/utils/guestIdentity';
import { resetCiedenEstimateSessionCompleted } from '@/src/utils/ciedenEstimateSession';
import { getActiveEstimateThreadId } from '@/src/utils/ciedenEstimateSession';
import { containsValidEmailInText } from '@/src/utils/emailValidation';
import {
  extractPrimaryEstimateQuestion,
  isEstimateFlowUiActive,
  isEstimateRelevantAssistantQuestion,
  isLikelyDefaultCiedenGreeting,
  normalizeAssistantMessage,
} from '@/src/utils/ciedenChatUi';

interface UseTextInputProps {
  conversationId?: Id<"conversations"> | null;
  onMessage?: (message: string) => void;
  onDailyLimitReached?: (error: { code: number; reason: string }) => void;
  onEmailGateBlocked?: (reason: 'general' | 'estimate', attemptedText: string) => void;
  /** Optional handler for messages before a conversation / auth is ready */
  onPreAuthMessage?: (message: string) => Promise<void> | void;
  /** When true, outgoing text requires inline email in the same message. */
  emailRequiredGate?: boolean;
  /** When true, estimate-intent messages require email even before global gate. */
  emailRequiredForEstimate?: boolean;
}

const ESTIMATE_INTENT_RE =
  /(estimate|estimation|calculator|pricing|price|cost|budget|ballpark|естімейт|естимейт|оцінк|оценк|калькулятор|скільки кошту|сколько сто|вартіст|бюджет)/i;
const TRANSPORT_FALLBACK_ERROR_MESSAGE =
  "I'm having trouble connecting right now. Please try again in a few seconds.";
const ESTIMATE_CHOOSER_NOISE_RE =
  /(opened .*estimate chooser|preliminary estimate chooser|please select (an )?option|to proceed|provide a range|connect with a manager)/i;
const ESTIMATE_FINAL_RE =
  /ESTIMATE_PANEL_RESULT:\s*\{|(preliminary|попередн|оцінк|estimate|вартіст|cost|budget).*(\d|\$|usd|грн)/i;
const ESTIMATE_ACK_PROGRESS_RE =
  /(got it|thanks|thank you|great|perfect|understood|makes sense|let'?s continue|moving on|next|дякую|зрозуміло|чудово|рухаємось далі|йдемо далі)/i;
const ESTIMATE_ONBOARDING_NOISE_RE =
  /(how should i address you|what would you like to explore|before we begin|continue by voice|continue by text|your guide to our ui\/ux|cieden ai assistant)/i;

function shouldKeepAssistantMessageInEstimateMode(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  // Keep estimate thread robust: drop only obvious non-estimate noise.
  if (ESTIMATE_ONBOARDING_NOISE_RE.test(t)) return false;
  if (isLikelyDefaultCiedenGreeting(t)) return false;
  if (ESTIMATE_CHOOSER_NOISE_RE.test(t)) return false;
  if (parseToolCall(t)) return true;
  if (ESTIMATE_FINAL_RE.test(t)) return true;
  if (isEstimateRelevantAssistantQuestion(t)) return true;
  if (ESTIMATE_ACK_PROGRESS_RE.test(t)) return false;
  return false;
}

function isAllowedToolCallInEstimateMode(text: string): boolean {
  const toolName = parseToolCall(text)?.toolName;
  if (!toolName) return true;
  // Keep estimate lane focused: only estimate entry tools are allowed while active.
  return toolName === "open_calculator" || toolName === "generate_estimate";
}

export function useTextInput({
  conversationId,
  onMessage,
  onDailyLimitReached,
  onEmailGateBlocked,
  onPreAuthMessage,
  emailRequiredGate = false,
  emailRequiredForEstimate = false,
}: UseTextInputProps) {
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const programmaticSendDedupeRef = useRef<{ text: string; at: number } | null>(null);
  /** Prevent inserting the same forced tool card twice in a short window (e.g. rapid button re-clicks). */
  const lastForcedToolInjectRef = useRef<{ tool: string; at: number } | null>(null);
  // TEMP: allow sending even before auth / conversationId exists.
  // When `conversationId` is missing we will not persist to Convex, but we will still surface AI output via `onMessage`.
  const [canSend, setCanSend] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSelectedTextModeRef = useRef(false);
  /** Avoid re-subscribing `registerTextHandler` when `conversationId` appears — that caused a brief window with zero handlers where streamed AI replies were dropped. */
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  /** Guard against duplicate websocket assistant persists from racey multi-handler events. */
  const recentAiPersistRef = useRef<{ key: string; at: number } | null>(null);
  /**
   * Estimate-mode reliability guard:
   * keep track of active estimate thread and allow the first assistant turn
   * even if strict classifier marks it as non-estimate.
   */
  const lastEstimateThreadIdRef = useRef<string | null>(null);
  const estimateFirstAssistantDeliveredRef = useRef(false);
  const buildEstimateThreadMetadata = useCallback((base?: Record<string, unknown>) => {
    const activeThreadId = getActiveEstimateThreadId();
    if (!activeThreadId) return base;
    return {
      ...(base ?? {}),
      threadType: "estimate",
      estimateThreadId: activeThreadId,
    };
  }, []);

  // ElevenLabs/ConvAI can hard-fail on very large payloads.
  // We only apply truncation for ESTIMATE MODE messages (where the user may paste big specs).
  const MAX_ESTIMATE_TRANSPORT_CHARS = 8000;
  const truncateForTransport = (text: string) => {
    if (text.length <= MAX_ESTIMATE_TRANSPORT_CHARS) return text;
    const head = Math.floor(MAX_ESTIMATE_TRANSPORT_CHARS / 2);
    const tail = MAX_ESTIMATE_TRANSPORT_CHARS - head;
    return `${text.slice(0, head)}\n...\n${text.slice(-tail)}`;
  };
  const isEstimateIntent = (value: string) => ESTIMATE_INTENT_RE.test(value.trim().toLowerCase());

  // Client-side tool intent injection to guarantee tool cards.
  // This prevents "text-only" responses when the model fails to call a tool.
  const maybeInjectToolCardForUserIntent = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      // If user already sends tool protocol, do not double-inject.
      if (parseToolCall(text)) return;
      if (typeof window === "undefined") return;

      // guest mode: no conversationId, so we can't persist to Convex.
      // Instead we inject into the onboarding/UI stream using __GUEST_AI__.
      const isGuestFlow = !conversationId && !onPreAuthMessage;
      // During auth onboarding (name/email), we don't inject tool cards.
      if (!conversationId && !isGuestFlow) return;

      const lower = text.toLowerCase();
      const isEstimateOpen = (window as any).__ciedenEstimatePanelOpen === true;

      const isCostIntent =
        /(estimate|estimation|calculator|pricing|price|cost|budget|ballpark)/.test(lower) ||
        /(естимейт|естімейт|(?:e|\u0435)стімейт|естimation|оценк|оцінк|оцінка|вартість|бюджет|коштує|росч|расч|калькулятор|сколько стоит|сколько сто|скільки кошт|що кошту|орієнтовн|попередн|знову естім|ще раз естім)/.test(
          lower,
        );

      const toolCallMessage = (toolName: string) =>
        `TOOL_CALL:${toolName}:${JSON.stringify({ mode: "default" })}`;

      type InjectedTool =
        | "show_about"
        | "show_process"
        | "show_cases"
        | "show_best_case"
        | "show_engagement_models"
        | "show_next_steps"
        | "book_call"
        | "show_getting_started"
        | "show_support"
        | "open_calculator";

      let injectedTool: InjectedTool | null = null;

      // Cost / estimate wins over process, models, etc. on the same user message.
      if (isCostIntent) {
        injectedTool = "open_calculator";
      }

      // About / who we are
      if (
        !injectedTool &&
        /(who are you|tell me about yourself|tell me about cieden|about cieden|what do you do|кто ты|кто вы|что вы делаете|что ты робиш|розкажи про себе|покажи про cieden|покажи про сайден|покажи про сиден|о cиден|о cайден)/.test(
          lower,
        )
      ) {
        injectedTool = "show_about";
      }

      // Process / workflow / timeline
      if (
        !injectedTool &&
        /(process|workflow|timeline|stages|how we work|design process)/.test(lower)
      ) {
        injectedTool = "show_process";
      }
      if (
        !injectedTool &&
        /(процес|етапи|таймлайн|як ми працюємо|як працюємо|процес роботи)/.test(lower)
      ) {
        injectedTool = "show_process";
      }

      // Cases / portfolio / examples
      if (!injectedTool && /(best case|флагман|лучший кейс|найкращий кейс)/.test(lower)) {
        injectedTool = "show_best_case";
      }
      // Specific example / one example -> "best case" card (single case)
      if (
        !injectedTool &&
        /(specific example|single example|one example|one-of|точний приклад|конкретний приклад|конкретный пример|конкретний кейс|конкретный кейс)/.test(
          lower,
        )
      ) {
        injectedTool = "show_best_case";
      }
      if (
        !injectedTool &&
        /(portfolio|case studies|case study|cases|examples?|порфтолио|портфолио|кейси|портфоліо|приклад(?:и)?|проекты|проєкти|примеры?)/.test(
          lower,
        )
      ) {
        injectedTool = "show_cases";
      }

      // Next steps
      if (!injectedTool && /(next steps|what happens next|what's next|what next)/.test(lower)) {
        injectedTool = "show_next_steps";
      }
      if (!injectedTool && /(що буде далі|що дальше|наступні кроки|следующие шаги|что дальше|что будет дальше)/.test(lower)) {
        injectedTool = "show_next_steps";
      }

      // Book a call (dedicated manager card)
      if (
        !injectedTool &&
        /(book a call|schedule a call|how do we start working together)/.test(lower)
      ) {
        injectedTool = "book_call";
      }
      if (
        !injectedTool &&
        /(записатися на дзвінок|записаться на звонок|звонок|созвон|консультац)/.test(lower)
      ) {
        injectedTool = "book_call";
      }

      // Getting started / first step
      if (
        !injectedTool &&
        /(first step|how to start|start a project|get started)/.test(lower)
      ) {
        injectedTool = "show_getting_started";
      }
      if (
        !injectedTool &&
        /(бріф|брив|з чого почати|перший крок|як почати|как начать|первый шаг)/.test(lower)
      ) {
        injectedTool = "show_getting_started";
      }

      // Support / after launch
      if (!injectedTool && /(support|after launch|file formats|figma|prototypes|retainer)/.test(lower)) {
        injectedTool = "show_support";
      }
      if (!injectedTool && /(підтримка|після запуску|формати файлів|документац|файли|фигма|прототип|ретейнер)/.test(lower)) {
        injectedTool = "show_support";
      }

      // Engagement / pricing models (collaboration models)
      // IMPORTANT: only auto-inject this overview card for broad "show models" asks.
      // Follow-up questions about a specific model (partnership / dedicated team / T&M)
      // should be answered in plain text, not by repeating the same card.
      if (
        !injectedTool &&
        /(engagement models?|collaboration models?|pricing models?|models of cooperation|cooperation models?|show (me )?(the )?models|what are (your )?models|compare models)\b/.test(
          lower,
        )
      ) {
        injectedTool = "show_engagement_models";
      }
      if (
        !injectedTool &&
        /(модел[іь] співпрац[іи]|модел[іь] сотрудничеств[а]|моделі співпраці|модели сотрудничества|покажи .*модел|які .*модел|сравни .*модел|порівняй .*модел)/.test(
          lower,
        )
      ) {
        injectedTool = "show_engagement_models";
      }

      /** Hybrid case matching: inject full TOOL_CALL payload when user asks for “similar” work. */
      let forcedInjectContent: string | null = null;
      let forcedToolName: string | null = null;
      if (
        !injectedTool &&
        /(similar to my product|like my product|comparable (work|projects)|analogous|anything similar|closest case|relevant case|схож(?:е|ий|а|і) на мій|що ви робили схоже|подібн(?:ий|і) проект|приклади схож|щось схоже|аналог)/i.test(
          text,
        )
      ) {
        try {
          const res = await fetch("/api/case-studies/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text }),
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data.results)) {
            const payload = {
              productDescription: text,
              results: data.results.map(
                (r: {
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
                }) => ({
                  ...r.case,
                  matchReasons: r.matchReasons,
                  relevanceScore: r.relevanceScore,
                  narrativeExcerpt: r.narrativeExcerpt,
                }),
              ),
              overallConfidence: data.overallConfidence,
              lowConfidence: data.lowConfidence,
              semanticAvailable: data.semanticAvailable,
              mode: "default",
            };
            forcedInjectContent = `TOOL_CALL:find_similar_cases:${JSON.stringify(payload)}`;
            forcedToolName = "find_similar_cases";
          }
        } catch {
          /* rely on model tool call */
        }
      }

      if (forcedInjectContent && forcedToolName) {
        if (conversationId) {
          try {
            const guestId = getGuestIdentityFromCookie()?.guestId;
            const persistPayload = {
              conversationId,
              content: forcedInjectContent,
              role: "assistant" as const,
              source: "voice" as const,
              metadata: {
                elevenLabsAgent: true,
                forcedTool: forcedToolName,
                timestamp: Date.now(),
              },
              guestId: guestId ?? undefined,
            };
            window.setTimeout(() => {
              void createMessage(persistPayload).catch(() => {});
            }, 450);
          } catch {
            /* ignore */
          }
        } else if (isGuestFlow) {
          window.setTimeout(() => {
            onMessage?.(`__GUEST_AI__:${forcedInjectContent}`);
          }, 450);
        }
        return;
      }

      if (!injectedTool) return;

      // During active estimate flow we only suppress repeating estimate opener cards.
      // Other tools (cases/process/etc.) should still be allowed to render.
      if (isEstimateOpen && injectedTool === "open_calculator") return;

      const injectNow = Date.now();
      const lastForced = lastForcedToolInjectRef.current;
      if (
        lastForced &&
        lastForced.tool === injectedTool &&
        injectNow - lastForced.at < 700
      ) {
        // Ignore only near-simultaneous duplicate injections from the same click/race.
        return;
      }
      lastForcedToolInjectRef.current = { tool: injectedTool, at: injectNow };

      // Cost intent: open estimate panel ASAP (like existing tool handlers).
      if (injectedTool === "open_calculator") {
        resetCiedenEstimateSessionCompleted();
        (window as unknown as { __ciedenEstimateFlowPrimaryAt?: number }).__ciedenEstimateFlowPrimaryAt =
          Date.now();
      }

      const injectedContent = toolCallMessage(injectedTool);

      if (conversationId) {
        try {
          const guestId = getGuestIdentityFromCookie()?.guestId;
          const payload = {
            conversationId,
            content: injectedContent,
            role: "assistant" as const,
            source: "voice" as const,
            metadata: {
              elevenLabsAgent: true,
              forcedTool: injectedTool,
              timestamp: Date.now(),
            },
            guestId: guestId ?? undefined,
          };

          // Important UX: show tool card AFTER the assistant text bubble.
          // We schedule persistence slightly later, so the text message usually
          // lands first in Convex + UI.
          window.setTimeout(() => {
            void createMessage(payload).catch(() => {
              // Ignore persistence failures; auth/chat session might race.
            });
          }, 450);
        } catch (_) {
          // Ignore persistence failures (auth might not be ready).
        }
      } else if (isGuestFlow) {
        window.setTimeout(() => {
          onMessage?.(`__GUEST_AI__:${injectedContent}`);
        }, 450);
      }
    },
    // NOTE: `createMessage` is declared below in this file.
    // We intentionally don't include it in deps to avoid TDZ ReferenceError.
    [conversationId, onPreAuthMessage, onMessage],
  );

  // Buffered persistence for messages until conversationId is available
  const { handleUserMessage } = useElevenLabsMessages({ conversationId: conversationId ?? null });

  // Direct mutation for AI responses (not buffered - AI only responds after conversationId exists)
  const createMessage = useMutation(api.messages.create);

  const {
    sessionMode,
    startText,
    sendTextMessage: sendViaProvider,
    registerTextHandler,
    registerTextErrorHandler,
    resetTextIdleTimer,
    isTextConnected,
    setPendingConversationHistory,
    sendContextualUpdateOverSocket,
  } = useElevenLabsConversation();
  const guestId = getGuestIdentityFromCookie()?.guestId;

  // Get conversation history for context (used to pass dynamic variables at session start)
  const messages = useQuery(
    api.messages.list,
    conversationId
      ? {
          conversationId,
          ...(guestId ? { guestId } : {}),
        }
      : "skip"
  );

  // Persist AI responses from the ElevenLabs WebSocket
  useEffect(() => {
    const unsubscribe = registerTextHandler(async (event: NormalizedMessageEvent) => {
      if (event.source !== 'ai' || event.via !== 'websocket') return;
      const estimateMode = isEstimateFlowUiActive() || !!getActiveEstimateThreadId();
      const activeEstimateThreadId = getActiveEstimateThreadId();
      if (activeEstimateThreadId !== lastEstimateThreadIdRef.current) {
        lastEstimateThreadIdRef.current = activeEstimateThreadId;
        estimateFirstAssistantDeliveredRef.current = false;
      }
      const normalizedEstimateText = estimateMode
        ? extractPrimaryEstimateQuestion(event.message) ?? event.message
        : event.message;
      if (
        estimateMode &&
        (!shouldKeepAssistantMessageInEstimateMode(normalizedEstimateText) ||
          !isAllowedToolCallInEstimateMode(normalizedEstimateText))
      ) {
        // Do not lose the first assistant turn in a fresh estimate thread.
        // Some first replies are short acknowledgements and can be over-filtered.
        const isFirstEstimateAssistantTurn = !estimateFirstAssistantDeliveredRef.current;
        const canBypassOnce =
          isFirstEstimateAssistantTurn &&
          normalizedEstimateText.trim().length > 0 &&
          !isLikelyDefaultCiedenGreeting(normalizedEstimateText);
        if (canBypassOnce) {
          console.warn(
            "[useTextInput] estimate first-turn bypass: preserving assistant message that strict filter would drop",
          );
        } else {
        // Keep estimate thread focused: ignore generic/non-question chatter while runner is active.
        return;
        }
      }

      const activeConversationId = conversationIdRef.current;

      // In guest mode (no conversationId) we can't persist to Convex yet,
      // so we at least surface the assistant message in UI.
      if (!activeConversationId) {
        onMessage?.(`__GUEST_AI__:${event.message}`);
        return;
      }

      try {
        const dedupKey = normalizeAssistantMessage(normalizedEstimateText);
        const now = Date.now();
        const prev = recentAiPersistRef.current;
        if (dedupKey && prev && prev.key === dedupKey && now - prev.at < 2500) {
          return;
        }
        recentAiPersistRef.current = { key: dedupKey, at: now };

        const guestId = getGuestIdentityFromCookie()?.guestId;
        await createMessage({
          conversationId: activeConversationId,
            content: normalizedEstimateText,
          role: 'assistant',
          source: 'text',
          metadata: buildEstimateThreadMetadata({
            elevenLabsTextResponse: true,
            via: 'websocket',
            timestamp: Date.now()
          }),
          guestId: guestId ?? undefined,
        });
        if (estimateMode) {
          estimateFirstAssistantDeliveredRef.current = true;
        }
      } catch (error) {
        console.error('Failed to persist ElevenLabs text response:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [createMessage, registerTextHandler, onMessage]);

  // Surface transport errors (e.g. daily limit reached)
  useEffect(() => {
    const unsubscribe = registerTextErrorHandler((error) => {
      console.error('🚫 ElevenLabs text transport error:', error);
      onDailyLimitReached?.(error);
    });
    return () => {
      unsubscribe();
    };
  }, [onDailyLimitReached, registerTextErrorHandler]);

  // Handle typing indicator
  const handleInputChange = useCallback((text: string) => {
    setTextInput(text);
    setIsTyping(true);

    const hasText = text.trim().length > 0;
    if (hasText && !hasAutoSelectedTextModeRef.current) {
      hasAutoSelectedTextModeRef.current = true;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("voice-chat-mode-choice", {
            detail: { mode: "text" },
          }),
        );
      }
      // Warm up text transport on first typing interaction so first send is not lost.
      if (sessionMode !== 'voice' && !isTextConnected) {
        void startText().catch((error) => {
          console.warn('[useTextInput] auto-start text mode failed:', error);
        });
      }
    } else if (!hasText) {
      hasAutoSelectedTextModeRef.current = false;
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [isTextConnected, sessionMode, startText]);

  // Update send availability as conversationId / onboarding handler changes.
  useEffect(() => {
    setCanSend(true);
  }, [conversationId, onPreAuthMessage]);

  // Send text message
  const sendTextMessage = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    const blockedForEstimate = emailRequiredForEstimate && isEstimateIntent(trimmed);
    if ((emailRequiredGate || blockedForEstimate) && !containsValidEmailInText(trimmed)) {
      onEmailGateBlocked?.(blockedForEstimate ? 'estimate' : 'general', trimmed);
      return;
    }

    const isGuest = !conversationId && !onPreAuthMessage;
    const estimateUiActive = isEstimateFlowUiActive();

    // Pre-auth onboarding flow: let caller handle onboarding logic and skip Convex/ElevenLabs.
    // Guest mode: when `onPreAuthMessage` is not provided, we still send via ElevenLabs.
    if (!conversationId) {
      setTextInput('');
      if (onPreAuthMessage) {
        await onPreAuthMessage(trimmed);
        return;
      }
      // guest: continue below and send via ElevenLabs
    }

    setTextInput('');
    setCanSend(false);

    try {
      await maybeInjectToolCardForUserIntent(trimmed);

      const isEstimatePayload =
        trimmed.startsWith("[ESTIMATE MODE]") || trimmed.includes("[ESTIMATE MODE]");
      const transportText = isEstimatePayload ? truncateForTransport(trimmed) : trimmed;

      // In estimate mode, route user input to estimate thread only (not main chat lane).
      if (!estimateUiActive) {
        // Optimistically reflect in UI for regular chat mode.
        onMessage?.(isGuest ? `__GUEST_USER__:${trimmed}` : trimmed);

        // Persist user message via buffered hook (handles missing conversationId)
        try {
          await handleUserMessage(trimmed, {
            messageType: 'text',
            via: sessionMode === 'voice' ? 'webrtc' : 'websocket',
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Failed to persist user text message:', error);
        }
      } else if (conversationId) {
        // Persist directly with estimate thread metadata so main feed can filter it out.
        try {
          const guestFromCookie = getGuestIdentityFromCookie()?.guestId;
          await createMessage({
            conversationId,
            content: trimmed,
            role: "user",
            source: "text",
            metadata: buildEstimateThreadMetadata({
              via: sessionMode === "voice" ? "webrtc" : "websocket",
              timestamp: Date.now(),
            }),
            guestId: guestFromCookie ?? undefined,
          });
        } catch (error) {
          console.error("Failed to persist estimate-thread user message:", error);
        }
      }

      if (sessionMode !== 'voice') {
        // Wait briefly for prior messages to load (previous session only)
        let tries = 0;
        while (typeof messages === 'undefined' && tries < 10) {
          // 10 * 50ms = 500ms max
           
          await new Promise(r => setTimeout(r, 50));
          tries++;
        }

        const prior = Array.isArray(messages)
          ? messages.map(m => ({ role: m.role, content: m.content || '' }))
          : [];
        // Convex `messages` can lag one tick after `handleUserMessage`; append this send so
        // `conversation_history` always includes the latest `user:` line for ConvAI (avoids intro replay).
        const pendingUserLine = { role: 'user' as const, content: transportText };
        const lastRow = prior.length > 0 ? prior[prior.length - 1] : null;
        const merged =
          lastRow?.role === 'user' && (lastRow.content || '').trim() === transportText.trim()
            ? prior
            : [...prior, pendingUserLine];
        const conversationHistory = merged.length ? extractContextFromMessages(merged) : undefined;

        // Seed pending history for provider autostart or next session
        setPendingConversationHistory?.(conversationHistory);
        // Only start if not connected to avoid restarts
        if (!isTextConnected) {
          await startText(conversationHistory);
        }

        // Autostart often opens the socket before any user line exists in dynamic vars — nudge ConvAI
        // so the first real chat message does not replay the dashboard `first_message` monologue.
        const hadUserInPrior = prior.some((m) => m.role === "user");
        const hasUserInMerged = merged.some((m) => m.role === "user");
        if (!hadUserInPrior && hasUserInMerged) {
          sendContextualUpdateOverSocket(
            "[THREAD_STATE] The scripted in-app first greeting was already shown. The user just sent their first chat line. Reply like a senior account manager in 1–4 short sentences: acknowledge + substance. Do NOT replay the full first_message template (voice/text choice, before we begin, how should I address you) unless the user explicitly asks."
          );
        }
      }

      const maxRetries = isEstimatePayload ? 3 : 2;
      let didSend = false;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        didSend = await sendViaProvider(transportText);
        if (didSend) break;
        if (attempt < maxRetries && sessionMode !== 'voice') {
          const delay = attempt === 0 ? 150 : 400 * attempt;
          console.log(`⚠️ Send attempt ${attempt + 1} failed, retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          if (!isTextConnected) {
            await startText();
          }
        }
      }

      if (!didSend) {
        throw new Error('Text transport reported a send failure');
      }

      resetTextIdleTimer();
    } catch (error) {
      console.error('Failed to send ElevenLabs text message:', error);
      // Surface transport errors so in production the user doesn't just see "nothing happens".
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'ElevenLabs text transport failed';
      onDailyLimitReached?.({ code: 0, reason: message });
      try {
        if (conversationId) {
          const guestFromCookie = getGuestIdentityFromCookie()?.guestId;
          await createMessage({
            conversationId,
            content: TRANSPORT_FALLBACK_ERROR_MESSAGE,
            role: 'assistant',
            source: 'text',
            metadata: {
              transportError: true,
              timestamp: Date.now()
            },
            guestId: guestFromCookie ?? undefined,
          });
        } else {
          onMessage?.(`__GUEST_AI__:${TRANSPORT_FALLBACK_ERROR_MESSAGE}`);
        }
      } catch (persistError) {
        console.error('Failed to persist/send transport fallback message:', persistError);
      }
      setTextInput(trimmed);
    } finally {
      setCanSend(true);
    }
  }, [
    conversationId,
    textInput,
    onMessage,
    onPreAuthMessage,
    createMessage,
    maybeInjectToolCardForUserIntent,
    sessionMode,
    startText,
    sendViaProvider,
    resetTextIdleTimer,
    messages,
    isTextConnected,
    setPendingConversationHistory,
    sendContextualUpdateOverSocket,
    emailRequiredGate,
    emailRequiredForEstimate,
    onEmailGateBlocked,
    buildEstimateThreadMetadata,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Send a specific message directly (for programmatic sends)
  const sendSpecificMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const now = Date.now();
    const prevDedupe = programmaticSendDedupeRef.current;
    if (
      prevDedupe &&
      prevDedupe.text === trimmed &&
      now - prevDedupe.at < 500
    ) {
      console.warn("[useTextInput] Skip duplicate programmatic send within debounce window");
      return;
    }
    programmaticSendDedupeRef.current = { text: trimmed, at: now };

    const blockedForEstimate = emailRequiredForEstimate && isEstimateIntent(trimmed);
    if ((emailRequiredGate || blockedForEstimate) && !containsValidEmailInText(trimmed)) {
      onEmailGateBlocked?.(blockedForEstimate ? 'estimate' : 'general', trimmed);
      return;
    }

    const isGuest = !conversationId && !onPreAuthMessage;

    // Guest mode: no Convex conversationId, but we still want the assistant to respond.
    if (!conversationId) {
      if (onPreAuthMessage) {
        await onPreAuthMessage(trimmed);
        return;
      }

      onMessage?.(isGuest ? `__GUEST_USER__:${trimmed}` : trimmed);

      // Ensure tool cards still appear in guest mode (quick prompt buttons use this path).
      await maybeInjectToolCardForUserIntent(trimmed);

      const isEstimatePayload =
        trimmed.startsWith("[ESTIMATE MODE]") || trimmed.includes("[ESTIMATE MODE]");
      const transportText = isEstimatePayload ? truncateForTransport(trimmed) : trimmed;

      try {
        if (sessionMode !== 'voice' && !isTextConnected) {
          await startText();
        }

        const guestMaxRetries = isEstimatePayload ? 3 : 1;
        let didSend = false;
        for (let attempt = 0; attempt <= guestMaxRetries; attempt++) {
          didSend = await sendViaProvider(transportText);
          if (didSend) break;
          if (attempt < guestMaxRetries && sessionMode !== 'voice') {
            const delay = attempt === 0 ? 150 : 400 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            if (!isTextConnected) await startText();
          }
        }

        if (!didSend) {
          throw new Error('Text transport reported a send failure');
        }
      } catch (error) {
        console.error('Failed to send ElevenLabs text message (guest):', error);
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'ElevenLabs text transport failed (guest)';
        onDailyLimitReached?.({ code: 0, reason: message });
        onMessage?.(`__GUEST_AI__:${TRANSPORT_FALLBACK_ERROR_MESSAGE}`);
      } finally {
        resetTextIdleTimer();
      }

      return;
    }

    const estimateUiActive = isEstimateFlowUiActive();
    const isEstimatePayload =
      trimmed.startsWith("[ESTIMATE MODE]") || trimmed.includes("[ESTIMATE MODE]");
    const transportText = isEstimatePayload ? truncateForTransport(trimmed) : trimmed;

    try {
      console.log('📝 Sending specific message via ElevenLabs:', trimmed);

      if (!isEstimatePayload && !estimateUiActive) {
        onMessage?.(trimmed);

        try {
          const guestId = getGuestIdentityFromCookie()?.guestId;
          const baseMetadata = {
            via: sessionMode === 'voice' ? 'webrtc' : 'websocket',
            timestamp: Date.now(),
          };
          await createMessage({
            conversationId,
            content: trimmed,
            role: 'user',
            source: 'text',
            metadata: isEstimatePayload ? buildEstimateThreadMetadata(baseMetadata) : baseMetadata,
            guestId: guestId ?? undefined,
          });
        } catch (error) {
          console.error('Failed to persist user text message:', error);
        }

        await maybeInjectToolCardForUserIntent(trimmed);
      } else if (!isEstimatePayload && estimateUiActive && conversationId) {
        // Route plain user replies into estimate thread while estimate mode is active.
        try {
          const guestId = getGuestIdentityFromCookie()?.guestId;
          await createMessage({
            conversationId,
            content: trimmed,
            role: "user",
            source: "text",
            metadata: buildEstimateThreadMetadata({
              via: sessionMode === "voice" ? "webrtc" : "websocket",
              timestamp: Date.now(),
            }),
            guestId: guestId ?? undefined,
          });
        } catch (error) {
          console.error("Failed to persist estimate-thread specific message:", error);
        }
      }

      if (sessionMode !== 'voice') {
        let tries = 0;
        while (typeof messages === 'undefined' && tries < 10) {
           
          await new Promise(r => setTimeout(r, 50));
          tries++;
        }

        const prior = Array.isArray(messages)
          ? messages.map(m => ({ role: m.role, content: m.content || '' }))
          : [];
        const pendingUserLine = { role: 'user' as const, content: transportText };
        const lastRow = prior.length > 0 ? prior[prior.length - 1] : null;
        const merged =
          lastRow?.role === 'user' && (lastRow.content || '').trim() === transportText.trim()
            ? prior
            : [...prior, pendingUserLine];
        const conversationHistory = merged.length
          ? extractContextFromMessages(merged)
          : undefined;

        console.log('[useTextInput] startText (specific) history debug (prior only)', {
          loaded: typeof messages !== 'undefined',
          count: Array.isArray(messages) ? messages.length : 0,
          hasHistory: !!conversationHistory,
          length: conversationHistory?.length ?? 0,
          preview: conversationHistory ? conversationHistory.slice(0, 400) : '(none)'
        });
        // Seed pending history and only start if not connected
        setPendingConversationHistory?.(conversationHistory);
        if (!isTextConnected) {
          await startText(conversationHistory);
        }

        const hadUserInPrior = prior.some((m) => m.role === "user");
        const hasUserInMerged = merged.some((m) => m.role === "user");
        if (!hadUserInPrior && hasUserInMerged) {
          sendContextualUpdateOverSocket(
            "[THREAD_STATE] The scripted in-app first greeting was already shown. The user just sent their first chat line. Reply like a senior account manager in 1–4 short sentences: acknowledge + substance. Do NOT replay the full first_message template (voice/text choice, before we begin, how should I address you) unless the user explicitly asks."
          );
        }
      }

      const maxRetries = isEstimatePayload ? 3 : 2;
      let didSend = false;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        didSend = await sendViaProvider(transportText);
        if (didSend) break;
        if (attempt < maxRetries && sessionMode !== 'voice') {
          const delay = attempt === 0 ? 100 : 300 * attempt;
          console.log(`⚠️ Send attempt ${attempt + 1} failed, retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          if (!isTextConnected) {
            await startText();
          }
        }
      }

      if (!didSend) {
        throw new Error('Text transport reported a send failure');
      }

      resetTextIdleTimer();
    } catch (error) {
      console.error('Failed to send ElevenLabs text message:', error);
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'ElevenLabs text transport failed';
      if (!isEstimatePayload) {
        onDailyLimitReached?.({ code: 0, reason: message });
      }
      try {
        if (conversationId) {
          const guestFromCookie = getGuestIdentityFromCookie()?.guestId;
          await createMessage({
            conversationId,
            content: TRANSPORT_FALLBACK_ERROR_MESSAGE,
            role: 'assistant',
            source: 'text',
            metadata: {
              transportError: true,
              timestamp: Date.now()
            },
            guestId: guestFromCookie ?? undefined,
          });
        } else {
          onMessage?.(`__GUEST_AI__:${TRANSPORT_FALLBACK_ERROR_MESSAGE}`);
        }
      } catch (persistError) {
        console.error('Failed to persist/send transport fallback message:', persistError);
      }
      return;
    }
  }, [conversationId, onMessage, onPreAuthMessage, createMessage, maybeInjectToolCardForUserIntent, sessionMode, startText, sendViaProvider, resetTextIdleTimer, messages, isTextConnected, setPendingConversationHistory, sendContextualUpdateOverSocket, emailRequiredGate, emailRequiredForEstimate, onDailyLimitReached, onEmailGateBlocked, buildEstimateThreadMetadata]);

  // Apply prior-only history once messages are loaded (handles autostart race)
  const priorHistoryAppliedRef = useRef(false);
  useEffect(() => {
    if (priorHistoryAppliedRef.current) return;
    // Only for text mode workflows (do nothing if in voice)
    if (sessionMode === 'voice') return;
    if (!Array.isArray(messages) || messages.length === 0) return;

    const prior = messages.map(m => ({ role: m.role, content: m.content || '' }));
    const conversationHistory = prior.length
      ? extractContextFromMessages(prior)
      : undefined;

    if (conversationHistory && conversationHistory.length > 0) {
      priorHistoryAppliedRef.current = true;
      console.log('[useTextInput] applying prior-only history (pending seed)', {
        count: messages.length,
        length: conversationHistory.length,
        preview: conversationHistory.slice(0, 400)
      });
      // Seed history so provider autostart can use it; avoid restart if connected
      setPendingConversationHistory?.(conversationHistory);
      if (!isTextConnected) {
        void startText(conversationHistory);
      }
    }
  }, [messages, sessionMode, startText, isTextConnected, setPendingConversationHistory]);

  return {
    textInput,
    setTextInput: handleInputChange,
    sendTextMessage,
    sendSpecificMessage,
    isTyping,
    canSend,
    isWebSocketConnected: isTextConnected
  };
}
