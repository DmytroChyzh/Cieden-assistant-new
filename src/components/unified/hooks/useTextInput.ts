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

interface UseTextInputProps {
  conversationId?: Id<"conversations"> | null;
  onMessage?: (message: string) => void;
  onDailyLimitReached?: (error: { code: number; reason: string }) => void;
  /** Optional handler for messages before a conversation / auth is ready */
  onPreAuthMessage?: (message: string) => Promise<void> | void;
}

export function useTextInput({
  conversationId,
  onMessage,
  onDailyLimitReached,
  onPreAuthMessage
}: UseTextInputProps) {
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // TEMP: allow sending even before auth / conversationId exists.
  // When `conversationId` is missing we will not persist to Convex, but we will still surface AI output via `onMessage`.
  const [canSend, setCanSend] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ElevenLabs/ConvAI can hard-fail on very large payloads.
  // We only apply truncation for ESTIMATE MODE messages (where the user may paste big specs).
  const MAX_ESTIMATE_TRANSPORT_CHARS = 8000;
  const truncateForTransport = (text: string) => {
    if (text.length <= MAX_ESTIMATE_TRANSPORT_CHARS) return text;
    const head = Math.floor(MAX_ESTIMATE_TRANSPORT_CHARS / 2);
    const tail = MAX_ESTIMATE_TRANSPORT_CHARS - head;
    return `${text.slice(0, head)}\n...\n${text.slice(-tail)}`;
  };

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
        /(естимейт|естimation|оценк|расч|калькулятор|сколько стоит|сколько сто)/.test(lower);

      if (isEstimateOpen && !isCostIntent) return;

      const toolCallMessage = (toolName: string) =>
        `TOOL_CALL:${toolName}:${JSON.stringify({ mode: "default" })}`;

      type InjectedTool =
        | "show_about"
        | "show_process"
        | "show_cases"
        | "show_best_case"
        | "show_engagement_models"
        | "show_next_steps"
        | "show_getting_started"
        | "show_support"
        | "open_calculator";

      let injectedTool: InjectedTool | null = null;

      // About / who we are
      if (
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

      // Getting started / first step / book a call
      if (
        !injectedTool &&
        /(book a call|schedule a call|first step|how to start|start a project|get started)/.test(
          lower,
        )
      ) {
        injectedTool = "show_getting_started";
      }
      if (
        !injectedTool &&
        /(записаться на звонок|звонок|созвон|консультац|бріф|брив|з чого почати|перший крок|як почати|как начать|первый шаг)/.test(
          lower,
        )
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
      if (
        !injectedTool &&
        /(engagement models|collaboration models|pricing models|collaboration|models of cooperation|retainer|partnership|dedicated team|time & material|time and material|tm)\b/.test(
          lower,
        )
      ) {
        injectedTool = "show_engagement_models";
      }
      if (
        !injectedTool &&
        /(модел[іь] співпрац[іи]|модел[іь] сотрудничеств[а] |моделі співпраці|модели сотрудничества|ретейнер|партнерств[оа]|партнёрств[оа]|підписк[аі]|подписк[аы]|dedicated team|time & material|t&m)/.test(
          lower,
        )
      ) {
        injectedTool = "show_engagement_models";
      }

      // Cost / estimate
      if (!injectedTool && isCostIntent) {
        injectedTool = "open_calculator";
      }

      if (!injectedTool) return;

      // Cost intent: open estimate panel ASAP (like existing tool handlers).
      if (injectedTool === "open_calculator") {
        try {
          window.dispatchEvent(new CustomEvent("open-estimate-panel"));
        } catch (_) {}
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
    setPendingConversationHistory
  } = useElevenLabsConversation();

  // Get conversation history for context (used to pass dynamic variables at session start)
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );

  // Persist AI responses from the ElevenLabs WebSocket
  useEffect(() => {
    const unsubscribe = registerTextHandler(async (event: NormalizedMessageEvent) => {
      if (event.source !== 'ai' || event.via !== 'websocket') return;

      // In guest mode (no conversationId) we can't persist to Convex yet,
      // so we at least surface the assistant message in UI.
      if (!conversationId) {
        onMessage?.(`__GUEST_AI__:${event.message}`);
        return;
      }

      try {
        const guestId = getGuestIdentityFromCookie()?.guestId;
        await createMessage({
          conversationId,
          content: event.message,
          role: 'assistant',
          source: 'text',
          metadata: {
            elevenLabsTextResponse: true,
            via: 'websocket',
            timestamp: Date.now()
          },
          guestId: guestId ?? undefined,
        });
      } catch (error) {
        console.error('Failed to persist ElevenLabs text response:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, createMessage, registerTextHandler, onMessage]);

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
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  // Update send availability as conversationId / onboarding handler changes.
  useEffect(() => {
    setCanSend(true);
  }, [conversationId, onPreAuthMessage]);

  // Send text message
  const sendTextMessage = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    const isGuest = !conversationId && !onPreAuthMessage;

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

      // Optimistically reflect in UI
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
        const conversationHistory = prior.length ? extractContextFromMessages(prior) : undefined;

        // Seed pending history for provider autostart or next session
        setPendingConversationHistory?.(conversationHistory);
        // Only start if not connected to avoid restarts
        if (!isTextConnected) {
          await startText(conversationHistory);
        }
      }

      let didSend = await sendViaProvider(transportText);
      if (!didSend && sessionMode === 'text') {
        // Retry once after brief delay (SDK status may be syncing)
        console.log('⚠️ First send attempt failed, retrying after 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
        didSend = await sendViaProvider(transportText);
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
    setPendingConversationHistory
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
        // Ensure text session is ready (sendViaProvider relies on transport being connected).
        if (sessionMode !== 'voice' && !isTextConnected) {
          await startText();
        }

        let didSend = await sendViaProvider(transportText);
        if (!didSend && sessionMode === 'text') {
          // Retry once after brief delay (SDK status may be syncing)
          await new Promise(resolve => setTimeout(resolve, 100));
          didSend = await sendViaProvider(transportText);
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
      } finally {
        resetTextIdleTimer();
      }

      return;
    }

    try {
      console.log('📝 Sending specific message via ElevenLabs:', trimmed);
      await maybeInjectToolCardForUserIntent(trimmed);

      const isEstimatePayload =
        trimmed.startsWith("[ESTIMATE MODE]") || trimmed.includes("[ESTIMATE MODE]");
      const transportText = isEstimatePayload ? truncateForTransport(trimmed) : trimmed;

      // Optimistically reflect in UI
      onMessage?.(trimmed);

      // Persist user message immediately for chat history
      try {
        const guestId = getGuestIdentityFromCookie()?.guestId;
        await createMessage({
          conversationId,
          content: trimmed,
          role: 'user',
          source: 'text',
          metadata: {
            via: sessionMode === 'voice' ? 'webrtc' : 'websocket',
            timestamp: Date.now()
          },
          guestId: guestId ?? undefined,
        });
      } catch (error) {
        console.error('Failed to persist user text message:', error);
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
        const conversationHistory = prior.length
          ? extractContextFromMessages(prior)
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
      }

      let didSend = await sendViaProvider(transportText);
      if (!didSend && sessionMode === 'text') {
        // Retry once after brief delay (SDK status may be syncing)
        console.log('⚠️ First send attempt failed, retrying after 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
        didSend = await sendViaProvider(transportText);
      }

      if (!didSend) {
        throw new Error('Text transport reported a send failure');
      }

      resetTextIdleTimer();
    } catch (error) {
      console.error('Failed to send ElevenLabs text message:', error);
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'ElevenLabs text transport failed';
      onDailyLimitReached?.({ code: 0, reason: message });
      return;
    }
  }, [conversationId, onMessage, createMessage, maybeInjectToolCardForUserIntent, sessionMode, startText, sendViaProvider, resetTextIdleTimer, messages, isTextConnected, setPendingConversationHistory]);

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
