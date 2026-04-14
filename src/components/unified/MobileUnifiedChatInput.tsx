"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { AudioLines, PhoneOff, Mic, MicOff, Send, Settings2, Zap, Plus } from 'lucide-react';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { useTextInput } from './hooks/useTextInput';
import { useSettings } from './hooks/useSettings';
import { ActionHandlers } from '@/src/utils/toolBridge';
import { WaveformIndicator } from './WaveformIndicator';

interface MobileUnifiedChatInputProps {
  conversationId?: Id<"conversations"> | null;
  onMessage?: (message: string, source: 'voice' | 'text') => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'listening' | 'speaking') => void;
  onContextualUpdate?: (sendUpdate: (text: string) => void) => void;
  className?: string;
  actionHandlers?: ActionHandlers;
  onRequestSelect?: (request: string) => void;
  /**
   * Callback for real-time audio levels
   * @param isUserSpeaking - Boolean speaking state
   * @param userVadScore - User VAD score (0-1) from ElevenLabs SDK onVadScore
   * @param agentWebAudioLevel - Agent audio level (0-1) from Web Audio API speaker analysis
   */
  onVoiceAudioUpdate?: (isUserSpeaking: boolean, userVadScore: number, agentWebAudioLevel: number) => void;
}

export function MobileUnifiedChatInput({
  conversationId,
  onMessage,
  onStatusChange,
  onContextualUpdate,
  className,
  actionHandlers,
  onRequestSelect,
  onVoiceAudioUpdate
}: MobileUnifiedChatInputProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [dailyLimitError, setDailyLimitError] = useState<{ code: number; reason: string } | null>(null);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0); // Track agent audio from SDK
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useSettings();
  
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
  const { isVoiceTransportConnected } = useElevenLabsConversation();
  const isConnecting = voiceStatus === 'connecting' && !isVoiceTransportConnected;

  // Keep call-active state in sync with voiceStatus (connecting/listening/speaking)
  useEffect(() => {
    const activeStates = ['connecting', 'listening', 'speaking'];
    setIsCallActive(activeStates.includes(voiceStatus));
  }, [voiceStatus]);

  useEffect(() => {
    const focusHandler = () => {
      inputRef.current?.focus();
    };
    window.addEventListener("focus-chat-input", focusHandler);
    return () => window.removeEventListener("focus-chat-input", focusHandler);
  }, []);
  
  const {
    textInput,
    setTextInput,
    sendTextMessage,
    canSend
  } = useTextInput({
    conversationId,
    onMessage: (text) => onMessage?.(text, 'text'),
    onDailyLimitReached: (error) => {
      setDailyLimitError(error);
      console.error('🚫 Daily limit reached in mobile chat input:', error);
    }
  });

  // Provider transition gating
  const elevenLabsContext = useElevenLabsConversation();
  const {
    isTransitioning,
    sessionMode,
    conversation,
    setVoicePreferences: setProviderVoicePreferences,
    restartVoiceIfActive
  } = elevenLabsContext;

  // Poll user input frequency data (SDK-native) for smooth waveform amplitude
  const [userInputLevel, setUserInputLevel] = useState(0);

  useEffect(() => {
    if (sessionMode !== 'voice' || conversation.status !== 'connected') return;

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
  }, [conversation, sessionMode]);
  useEffect(() => {
    setProviderVoicePreferences({
      voiceId: settings.voice ?? null,
      speed: typeof settings.speed === 'number' ? settings.speed : null
    });
  }, [settings.voice, settings.speed, setProviderVoicePreferences]);

  useEffect(() => {
    void restartVoiceIfActive();
  }, [settings.voice, settings.speed, restartVoiceIfActive]);

  // Derive user speaking state from frequency level (same approach as desktop)
  // Threshold: 0.1 provides good balance between sensitivity and false positives
  const SPEAKING_THRESHOLD = 0.1;
  const isUserSpeaking = userInputLevel > SPEAKING_THRESHOLD;

  // Agent audio level now comes from SDK via useVoiceRecording callback
  // User audio level now comes from frequency data for smooth waveform visualization
  const userAudioLevel = userInputLevel;

  // Expose sendContextualUpdate to parent component
  useEffect(() => {
    if (onContextualUpdate) {
      onContextualUpdate(sendContextualUpdate);
    }
  }, [onContextualUpdate, sendContextualUpdate]);

  // Notify parent about audio state/levels when provided
  useEffect(() => {
    if (onVoiceAudioUpdate) {
      // User: SDK frequency data, Agent: SDK getOutputByteFrequencyData()
      // Both use frequency-based detection for consistent visualization
      onVoiceAudioUpdate(isUserSpeaking, userInputLevel, agentAudioLevel);
    }
  }, [onVoiceAudioUpdate, isUserSpeaking, userInputLevel, agentAudioLevel]);

  // Call control functions
  const handleStartCall = useCallback(() => {
    setIsMuted(false);
    startRecording();
  }, [startRecording]);

  const handleEndCall = useCallback(() => {
    stopRecording();
    setIsCallActive(false);
    setIsMuted(false);
  }, [stopRecording]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVoicePress = () => {
    if (isTransitioning) return;
    if (voiceStatus === 'connecting') {
      // Allow cancel/stop during connecting
      stopRecording();
      return;
    }
    if (isCallActive) {
      handleEndCall();
    } else if (isRecording) {
      stopRecording();
    } else {
      handleStartCall();
    }
  };

  const handleSend = () => {
    if (isTransitioning) return;
    if (textInput.trim() && canSend) {
      sendTextMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActionsList = [
    "What does Cieden do?",
    "Show me your portfolio",
    "How much does a project cost?",
    "What's your design process?",
    "How do I start a project?"
  ];

  return (
    <div className={cn("relative w-full", className)}>
      {/* Icon gradient defs (shared) */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="uiIconGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#224AD7" stopOpacity="0.6" />
            <stop offset="56%" stopColor="#CA40DB" />
            <stop offset="100%" stopColor="#7645D9" />
          </linearGradient>
        </defs>
      </svg>
      {/* Mobile Settings Panel Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 z-50"
          >
            <div className="text-white text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Settings</span>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-white/60 hover:text-white text-lg"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Audio Quality</span>
                  <span className="text-green-400 capitalize">{audioQuality}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Voice Detection</span>
                  <span className="text-blue-400">Auto</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Quick Actions Drawer */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-xl p-3 z-50"
          >
            <div className="text-white text-sm space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Quick Actions</span>
                <button 
                  onClick={() => setShowQuickActions(false)}
                  className="text-white/60 hover:text-white text-lg"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1">
                {quickActionsList.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onRequestSelect?.(action);
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-aligned waveforms */}
      <div className="relative w-full h-0">
        {/* Status indicator – connecting */}
        {voiceStatus === 'connecting' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1"
          >
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-white/60">Connecting Voice</span>
            </div>
          </motion.div>
        )}
        {(voiceStatus !== 'idle' || isRecording) && (
          <>
            <div className="absolute -top-8 left-4 h-8 flex items-center">
              <WaveformIndicator
                audioLevel={agentAudioLevel}
                quality="good"
                isVisible={true}
                isActive={agentAudioLevel > 0.01}
                side="left"
              />
            </div>
            <div className="absolute -top-8 right-4 h-8 flex items-center">
              <WaveformIndicator
                audioLevel={userAudioLevel}
                quality="good"
                isVisible={true}
                isActive={userAudioLevel > 0.01}
                side="right"
              />
            </div>
          </>
        )}
      </div>

      {/* Main Mobile Input Container - Figma exact styling */}
      <div 
        className={cn(
          "relative w-full flex items-center gap-2",
          "transition-all duration-300",
          isRecording && "ring-2 ring-purple-500/30"
        )}
        style={{
          height: '56px',
          padding: '4px 8px 4px 16px',
          borderRadius: '64px',
          border: '1px solid #262531',
          background: 'rgba(163, 161, 161, 0.15)'
        }}
      >

        {/* Quick actions icon (gradient plus) */}
        <Plus size={24} strokeWidth={2} style={{ stroke: 'url(#uiIconGradient)' }} />

        {/* Input field with flex grow */}
        <div className="flex flex-col justify-center flex-1">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here"
            className="bg-transparent text-white placeholder-opacity-100 outline-none w-full"
            style={{
              color: '#A3A1A1',
              fontFamily: 'Gilroy',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: 'normal',
              letterSpacing: '-0.32px'
            }}
          />
        </div>

        {/* Main button with animated background and gradient icons */}
        <motion.div
          className={cn(
            "flex flex-col justify-center items-center cursor-pointer relative"
          )}
          style={{ width: 48, height: 48, borderRadius: 100, background: isConnecting ? '#FDBA74' : '#FFF' }}
          animate={{
            boxShadow: (voiceStatus !== 'idle') && !isConnecting
              ? '0 10px 15px -3px rgba(239, 68, 68, 0.25), 0 4px 6px -2px rgba(239, 68, 68, 0.1)'
              : '0 0 0 0 rgba(0,0,0,0)'
          }}
          transition={{ boxShadow: { duration: 0.25 } }}
          onClick={textInput.trim() ? handleSend : handleVoicePress}
        >
          {/* Rotating border ring during connecting */}
          {isConnecting && (
            <svg
              className="absolute -inset-1 pointer-events-none animate-spin"
              width={56}
              height={56}
              viewBox="0 0 56 56"
            >
              <defs>
                <linearGradient id="ringGradMobile" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
              </defs>
              <circle
                cx="28"
                cy="28"
                r="26"
                stroke="url(#ringGradMobile)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}
          {/* Gradient overlay that fades in when active */}
          <motion.div
            className="absolute inset-0 rounded-full z-0"
            style={{
              background: 'linear-gradient(to right, #ef4444, #dc2626)',
              pointerEvents: 'none'
            }}
            animate={{
              opacity: (voiceStatus !== 'idle') && !isConnecting ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
          />
          <AnimatePresence mode="wait">
            {voiceStatus !== 'idle' ? (
              <motion.div className="relative z-10" key="phone" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <PhoneOff size={24} strokeWidth={2} className="text-white" />
              </motion.div>
            ) : textInput.trim() ? (
              <motion.div key="send" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <svg width="24" height="24" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.9643 12.7213L5.29787 12.5109M23.9643 12.7213L0.931201 23.4933L5.29787 12.5109M23.9643 12.7213L1.17979 1.43294L5.29787 12.5109" stroke="url(#uiIconGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            ) : (
              <motion.div key="wave" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="wavegrad-mobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(34,74,215,0.6)" />
                      <stop offset="56%" stopColor="#CA40DB" />
                      <stop offset="100%" stopColor="#7645D9" />
                    </linearGradient>
                  </defs>
                  <rect x="3"  y="10" width="3" height="12" rx="1" fill="url(#wavegrad-mobile)" />
                  <rect x="9" y="4"  width="3" height="24" rx="1" fill="url(#wavegrad-mobile)" />
                  <rect x="15" y="8"  width="3" height="16" rx="1" fill="url(#wavegrad-mobile)" />
                  <rect x="21" y="6"  width="3" height="20" rx="1" fill="url(#wavegrad-mobile)" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>


      {/* Daily limit error */}
      {dailyLimitError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-2 py-1 mt-1"
        >
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs text-red-200 font-medium">
                {dailyLimitError.code === 1008 ? 'Daily Limit Reached' : 'ElevenLabs Error'}
              </span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              {dailyLimitError.reason || 'Please try again tomorrow.'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
