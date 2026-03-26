"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { NormalMode } from './NormalMode';
import { GoMode } from './GoMode';
import { SettingsPanel } from './SettingsPanel';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { useTextInput } from './hooks/useTextInput';
import { useSettings } from './hooks/useSettings';
import type { Settings } from './hooks/useSettings';
import { ActionHandlers } from '@/src/utils/toolBridge';
import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import {
  EstimateAssistantProgressDock,
  VOICE_CHAT_COMPOSER_LAYOUT,
} from '@/src/components/cieden/EstimateAssistantProgressDock';

interface UnifiedChatInputProps {
  conversationId?: Id<"conversations"> | null;
  onMessage?: (message: string, source: 'voice' | 'text') => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'listening' | 'speaking') => void;
  onContextualUpdate?: (sendUpdate: (text: string) => void) => void;
  className?: string;
  /** When true, align desktop input to the left instead of centered **/
  alignLeft?: boolean;
  actionHandlers?: ActionHandlers;
  onRequestSelect?: (request: string) => void;
  isMobile?: boolean;
  /**
   * Callback for real-time audio levels
   * @param isUserSpeaking - Boolean speaking state
   * @param userVadScore - User VAD score (0-1) from ElevenLabs SDK onVadScore
   * @param agentWebAudioLevel - Agent audio level (0-1) from Web Audio API speaker analysis
   */
  onVoiceAudioUpdate?: (isUserSpeaking: boolean, userVadScore: number, agentWebAudioLevel: number) => void;
  onProgrammaticSendReady?: (sendFn: (text: string) => Promise<void>) => void;
  // Optional shared settings to keep HUD and input in sync
  settings?: Settings;
  updateSettings?: (updates: Partial<Settings>) => void;
  /** Optional handler for messages before auth / conversation is ready (onboarding) */
  onPreAuthMessage?: (text: string) => Promise<void> | void;
  // Desktop settings sidebar open state (for animating input centering)
  showSettings?: boolean;
}

export function UnifiedChatInput({
  conversationId,
  onMessage,
  onStatusChange,
  onContextualUpdate,
  className,
  alignLeft,
  actionHandlers,
  onRequestSelect,
  isMobile = false,
  onVoiceAudioUpdate,
  onProgrammaticSendReady,
  settings: settingsProp,
  updateSettings: updateSettingsProp,
  showSettings: showSettingsProp,
  onPreAuthMessage
}: UnifiedChatInputProps) {
  const [mode, setMode] = useState<'normal' | 'go'>('normal');
  const [localShowSettings, setLocalShowSettings] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [dailyLimitError, setDailyLimitError] = useState<{ code: number; reason: string } | null>(null);
  const [currentSessionMode, setCurrentSessionMode] = useState<'text' | 'voice' | null>(null);
  const [isSessionTransitioning, setIsSessionTransitioning] = useState(false);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0); // Track agent audio from SDK
  const [userInputLevel, setUserInputLevel] = useState(0); // Track user input audio level from SDK
  const isSettingsOpen = showSettingsProp ?? localShowSettings;
  
  // Prefer externally provided settings (page-level) to keep HUD and input in sync
  const settingsHook = useSettings();
  const settings = settingsProp ?? settingsHook.settings;
  const updateSettings = updateSettingsProp ?? settingsHook.updateSettings;

  // Get ElevenLabs context for session management
  const elevenLabsContext = useElevenLabsConversation();
  const {
    sessionMode,
    stopText,
    isTransitioning,
    conversation,
    setVoicePreferences: setProviderVoicePreferences,
    restartVoiceIfActive
  } = elevenLabsContext;

  useEffect(() => {
    console.log('🔗 ElevenLabs context status - sessionMode:', sessionMode);
  }, [sessionMode]);

  useEffect(() => {
    setProviderVoicePreferences({
      voiceId: settings.voice ?? null,
      speed: typeof settings.speed === 'number' ? settings.speed : null
    });
  }, [settings.voice, settings.speed, setProviderVoicePreferences]);

  useEffect(() => {
    void restartVoiceIfActive();
  }, [settings.voice, settings.speed, restartVoiceIfActive]);

  const {
    isRecording,
    // isUserSpeaking - now derived from frequency data below instead of hook's heuristic
    voiceStatus,
    userWaveformData,
    agentWaveformData,
    startRecording,
    stopRecording,
    sendContextualUpdate
  } = useVoiceRecording({
    conversationId,
    onTranscript: (text) => onMessage?.(text, 'voice'),
    onStatusChange,
    onAgentAudioLevel: setAgentAudioLevel, // Track agent audio level from SDK
    actionHandlers
  });

  const {
    textInput,
    setTextInput,
    sendTextMessage,
    sendSpecificMessage,
    canSend
  } = useTextInput({
    conversationId,
    onMessage: (text) => onMessage?.(text, 'text'),
    onDailyLimitReached: (error) => {
      setDailyLimitError(error);
      console.error('🚫 Daily limit reached in unified chat input:', error);
    },
    onPreAuthMessage
  });

  // Agent audio level now comes from SDK via useVoiceRecording callback
  // User VAD comes from ElevenLabsProvider.vadScore (SDK onVadScore callback)

  // Expose sendContextualUpdate to parent component
  // NOTE: Empty dependency array to prevent infinite loop caused by function reference changes
  // This only needs to run once on mount to pass the callback reference to the parent
  useEffect(() => {
    if (onContextualUpdate) {
      onContextualUpdate(sendContextualUpdate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose programmatic text send function to parent
  // Use ref to prevent infinite re-renders
  const sendSpecificMessageRef = useRef(sendSpecificMessage);
  useEffect(() => {
    sendSpecificMessageRef.current = sendSpecificMessage;
  }, [sendSpecificMessage]);

  useEffect(() => {
    if (onProgrammaticSendReady) {
      console.log('✅ Programmatic send function ready');
      // Wrap in a stable function reference
      onProgrammaticSendReady((text: string) => sendSpecificMessageRef.current(text));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll user input frequency data (SDK-native) for smooth waveform amplitude
  useEffect(() => {
    if (sessionMode !== 'voice' || conversation?.status !== 'connected') return;
    const getInput = (conversation as any)?.getInputByteFrequencyData;
    if (typeof getInput !== 'function') return;
    const id = setInterval(() => {
      try {
        const data: Uint8Array | undefined = getInput.call(conversation);
        if (data && data.length) {
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const level = Math.min(sum / data.length / 128, 1);
          setUserInputLevel(level);
        }
      } catch (_) {}
    }, 150);
    return () => clearInterval(id);
  }, [conversation?.status, sessionMode]);

  // Derive user speaking state from frequency level (same approach as agent)
  // Threshold: 0.1 provides good balance between sensitivity and false positives
  const SPEAKING_THRESHOLD = 0.1;
  const isUserSpeaking = userInputLevel > SPEAKING_THRESHOLD;

  // Notify parent about audio state/levels when provided
  // Both speaking state and audio level derived from frequency data
  useEffect(() => {
    if (onVoiceAudioUpdate) {
      // User: SDK frequency data, Agent: SDK getOutputByteFrequencyData()
      // Both use frequency-based detection for consistent visualization
      onVoiceAudioUpdate(isUserSpeaking, userInputLevel, agentAudioLevel);
    }
  }, [onVoiceAudioUpdate, isUserSpeaking, userInputLevel, agentAudioLevel]);

  // Low-frequency telemetry for frequency-based audio levels
  useEffect(() => {
    const DEBUG_AUDIO_TELEMETRY = true;
    if (!DEBUG_AUDIO_TELEMETRY) return;
    if (sessionMode !== 'voice' || conversation?.status !== 'connected') return;

    const id = setInterval(() => {
      try {
        const hasInput = typeof (conversation as any)?.getInputByteFrequencyData === 'function';
        const hasOutput = typeof (conversation as any)?.getOutputByteFrequencyData === 'function';
        const agentSpeaking = (conversation as any)?.isSpeaking ?? false;
        // Round for readability
        const fmt = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)).toFixed(3) : 'n/a');
        console.log('[telemetry] audio', {
          user: { level: fmt(userInputLevel), speaking: isUserSpeaking, hasInput },
          agent: { level: fmt(agentAudioLevel), speaking: !!agentSpeaking, hasOutput }
        });
      } catch (_) {}
    }, 2000);
    return () => clearInterval(id);
  }, [sessionMode, conversation?.status, isUserSpeaking, userInputLevel, agentAudioLevel]);

  const handleSettingsClose = useCallback(() => {
    setLocalShowSettings(false);
  }, []);

  // Toggle between normal and go mode
  const toggleGoMode = useCallback(() => {
    setMode(mode === 'normal' ? 'go' : 'normal');
    // Store preference
    updateSettings({ goMode: mode === 'normal' });
  }, [mode, updateSettings]);

  // Apply go mode from settings
  useEffect(() => {
    if (settings.goMode) {
      setMode('go');
    }
  }, [settings.goMode]);


  // Call control functions with single session enforcement
  const handleStartCall = useCallback(async () => {
    // Enforce single session policy
    if (currentSessionMode === 'text') {
      console.log('📝 Ending text session before starting voice');
      setIsSessionTransitioning(true);
      try {
        await stopText();
      } finally {
        setCurrentSessionMode(null);
        setIsSessionTransitioning(false);
      }
    }

    // Prevent rapid toggles
    if (isSessionTransitioning || isTransitioning) {
      console.log('⏳ Session transition in progress, ignoring start call');
      return;
    }

    // Pre-request microphone permission on gesture
    try {
      const preflightStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // CRITICAL: Stop tracks immediately to release microphone
      preflightStream.getTracks().forEach(track => track.stop());
    } catch (e) {
      console.warn('🎤 Microphone permission denied, falling back to text mode');
      // Auto-fallback to text mode on permission denial
      return;
    }

    setCurrentSessionMode('voice');
    setIsMuted(false);
    startRecording(); // This will trigger voice status changes that drive isCallActive
  }, [startRecording, currentSessionMode, isSessionTransitioning, stopText]);

  const handleEndCall = useCallback(() => {
    setIsCallActive(false);
    setIsMuted(false);
    setCurrentSessionMode(null);
    stopRecording();
  }, [stopRecording]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // TODO: Integrate with ElevenLabs SDK mute functionality
  }, []);

  // Let call active state reflect voice status or immediate recording intent
  useEffect(() => {
    const callActiveStates = ['connecting', 'listening', 'speaking'];
    setIsCallActive(callActiveStates.includes(voiceStatus) || isRecording);
  }, [voiceStatus, isRecording]);

  const SIDEBAR_WIDTH_PX = 360;
  const composerRootRef = useRef<HTMLDivElement>(null);
  /** Only while Preliminary estimate “Work with the assistant” progress dock is shown */
  const [estimateAssistantDockActive, setEstimateAssistantDockActive] = useState(false);

  useEffect(() => {
    const onProg = (e: Event) => {
      const d = (e as CustomEvent<{ active?: boolean }>).detail;
      setEstimateAssistantDockActive(!!d?.active);
    };
    window.addEventListener("estimate-assistant-progress", onProg as EventListener);
    return () => window.removeEventListener("estimate-assistant-progress", onProg as EventListener);
  }, []);

  /**
   * Desktop: extra bottom inset only when the estimate progress dock is visible.
   * Otherwise `main` uses the default 72px Tailwind fallback (normal bubble position).
   */
  useLayoutEffect(() => {
    if (isMobile) {
      document.documentElement.style.removeProperty("--vc-composer-bottom-inset");
      return;
    }

    if (!estimateAssistantDockActive) {
      document.documentElement.style.removeProperty("--vc-composer-bottom-inset");
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(VOICE_CHAT_COMPOSER_LAYOUT));
      });
      return;
    }

    let raf = 0;
    const getRoot = () =>
      composerRootRef.current ??
      (typeof document !== "undefined"
        ? (document.getElementById("unified-chat-input-root") as HTMLElement | null)
        : null);

    const apply = () => {
      const root = getRoot();
      if (!root) return;
      const h = root.getBoundingClientRect().height;
      /* bottom-2 (8px) + a tiny comfort gap */
      const inset = Math.ceil(h + 8 + 6);
      document.documentElement.style.setProperty("--vc-composer-bottom-inset", `${inset}px`);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(VOICE_CHAT_COMPOSER_LAYOUT));
      });
    };

    const ro = new ResizeObserver(() => apply());
    let observed: HTMLElement | null = null;
    const syncObserve = () => {
      const el = getRoot();
      if (!el) return;
      if (observed !== el) {
        if (observed) ro.unobserve(observed);
        ro.observe(el);
        observed = el;
      }
    };

    apply();
    syncObserve();
    const rafAttach = requestAnimationFrame(() => {
      apply();
      syncObserve();
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafAttach);
      ro.disconnect();
      document.documentElement.style.removeProperty("--vc-composer-bottom-inset");
    };
  }, [isMobile, mode, estimateAssistantDockActive]);

  return (
    <motion.div 
      ref={composerRootRef}
      id="unified-chat-input-root"
      initial={false}
      animate={{
        right: !isMobile && isSettingsOpen ? SIDEBAR_WIDTH_PX : 0
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={cn(
        isMobile ? "relative w-full" : "fixed bottom-2 z-50",
        // No panel: full width so inner mx-auto centers input on screen. Panel open: only left half.
        isMobile ? "" : alignLeft ? "left-0 w-1/2" : "left-0 right-0",
        className
      )}
      style={!isMobile && isSettingsOpen ? { right: SIDEBAR_WIDTH_PX } : undefined}
    >
      {/* Full width of container (up to 900px), centered — so input is never shrunk */}
      <div className={isMobile ? "w-full" : "w-full max-w-[900px] mx-auto px-4"}>
      <EstimateAssistantProgressDock />
      {/* Settings Panel Overlay */}
      <AnimatePresence>
        {false && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
            onClose={handleSettingsClose}
            onToggleGoMode={toggleGoMode}
          />
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <AnimatePresence mode="wait">
        {mode === 'normal' ? (
          <NormalMode
            key="normal"
            textInput={textInput}
            onTextInputChange={setTextInput}
            onSendText={sendTextMessage}
            isRecording={isRecording}
            voiceStatus={voiceStatus}
            onStartRecording={handleStartCall}
            onStopRecording={stopRecording}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
            isCallActive={isCallActive}
            canSend={canSend}
            dailyLimitError={dailyLimitError}
            onRequestSelect={onRequestSelect}
            isMobile={isMobile}
          />
        ) : (
          <GoMode
            key="go"
            isRecording={isRecording}
            voiceStatus={voiceStatus}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            waveformData={agentWaveformData}
            onExitGoMode={() => setMode('normal')}
          />
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
