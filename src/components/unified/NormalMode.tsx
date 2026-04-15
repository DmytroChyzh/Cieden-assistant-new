"use client";

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneSlash } from '@phosphor-icons/react';
import { Microphone, MicrophoneSlash, PaperPlaneRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { QuickActionsDrawer } from '@/src/components/quick-actions/QuickActionsDrawer';
import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';

interface NormalModeProps {
  textInput: string;
  onTextInputChange: (text: string) => void;
  onSendText: () => void;
  isRecording: boolean;
  voiceStatus: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  isCallActive?: boolean;
  canSend: boolean;
  dailyLimitError?: { code: number; reason: string } | null;
  onRequestSelect?: (request: string) => void;
  isMobile?: boolean;
  emailRequiredGate?: boolean;
}

export function NormalMode({
  textInput,
  onTextInputChange,
  onSendText,
  isRecording,
  voiceStatus,
  onStartRecording,
  onStopRecording,
  onToggleMute,
  isMuted = false,
  isCallActive = false,
  canSend,
  dailyLimitError = null,
  onRequestSelect,
  isMobile = false,
  emailRequiredGate = false,
}: NormalModeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [interactionStarted, setInteractionStarted] = useState(false);
  const { isVoiceTransportConnected } = useElevenLabsConversation();
  const isConnecting = voiceStatus === 'connecting' && !isVoiceTransportConnected;
  // Compact pill-shaped input height (+10px from previous)
  const baseMinHeight = 66;
  const containerPaddingVertical = 8; // 4px top + 4px bottom
  const lineHeightPx = 24; // approximate line height for 16px typography
  const contentMinHeight = Math.max(baseMinHeight - containerPaddingVertical, lineHeightPx);
  const textareaPaddingY = Math.max((contentMinHeight - lineHeightPx) / 2, 0);
  const textareaPaddingX = isMobile ? 10 : 14;
  const [containerHeight, setContainerHeight] = useState(baseMinHeight);

  useLayoutEffect(() => {
    setContainerHeight(baseMinHeight);
  }, [baseMinHeight]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const minContentHeight = contentMinHeight;
    const maxTotalHeight = 200;
    const maxContentHeight = Math.max(maxTotalHeight - containerPaddingVertical, minContentHeight);

    textarea.style.height = `${minContentHeight}px`;
    const { scrollHeight } = textarea;

    let targetContentHeight = scrollHeight;
    if (targetContentHeight < minContentHeight) {
      targetContentHeight = minContentHeight;
    }
    if (targetContentHeight > maxContentHeight) {
      targetContentHeight = maxContentHeight;
    }

    textarea.style.height = `${targetContentHeight}px`;
    textarea.style.overflowY = targetContentHeight >= maxContentHeight ? 'auto' : 'hidden';

    const nextContainerHeight = targetContentHeight + containerPaddingVertical;
    if (nextContainerHeight !== containerHeight) {
      setContainerHeight(nextContainerHeight);
    }
  }, [textInput, contentMinHeight, containerPaddingVertical, containerHeight, baseMinHeight]);


  useEffect(() => {
    const focusHandler = () => {
      textareaRef.current?.focus();
    };
    window.addEventListener("focus-chat-input", focusHandler);
    return () => window.removeEventListener("focus-chat-input", focusHandler);
  }, []);

  const hasText = textInput.trim().length > 0;

  const emailInline = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
  const hasEmailInDraft = emailInline.test(textInput.trim());
  const allowSendWhileEmailGate =
    !emailRequiredGate ||
    hasEmailInDraft ||
    textInput.includes("[ESTIMATE MODE]");
  const effectiveCanSend = canSend && allowSendWhileEmailGate;

  const placeholderText = emailRequiredGate
    ? isMobile
      ? "Work email required…"
      : "Add your work email here to continue (required after several messages)"
    : isMobile
      ? (isRecording ? "Voice on - type" : "Type here")
      : (isRecording ? "type here" : "Type your question here");

  const handleSend = () => {
    if (!interactionStarted) setInteractionStarted(true);
    if (effectiveCanSend && hasText) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🟣 NormalMode send triggered", { hasText, canSend: effectiveCanSend });
      }
      onSendText();
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log("🟡 NormalMode send blocked", { hasText, canSend: effectiveCanSend });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="relative"
      style={{
        '--stroke-dark-blue': '#262531',
        '--background-chips-buttons-grey-15': 'rgba(163, 161, 161, 0.15)',
        '--text-secondary-grey': '#A3A1A1',
        '--text-primary-white': '#FFF'
      } as React.CSSProperties}
    >
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
      {/* Status indicator - only show connecting state ABOVE input bar */}
      {voiceStatus === 'connecting' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-2 mb-2"
        >
          <div className="flex items-center gap-2 bg-green-500/20 rounded-full px-3 py-2 w-fit mx-auto">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500">Connecting Voice</span>
          </div>
        </motion.div>
      )}

      {/* Input layout with waveforms positioned outside */}
      <div className={`${isMobile ? 'px-4 mb-1' : 'mx-2 mb-3'}`}>
        {/* Container for input and external waveforms */}
        <div className="flex items-center gap-4 w-full justify-center">
          {/* Main input container - responsive width */}
          <div className={cn(
            "flex-1 w-full",
            "max-w-[900px]" // Chatbot-style wide input bar
          )}>
            <div className="relative w-full">
            {/* Main input container with Figma specifications */}
            <div
              data-waveform-anchor
              className={cn(
                "relative w-full flex items-center transition-all duration-300",
                "rounded-full shadow-md focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-400/50",
                isMobile
                  ? "border border-white/20 bg-black/30"
                  : "bg-black/30 backdrop-blur-xl border-2 border-white/20 hover:border-white/30",
                isRecording && "ring-2 ring-purple-400/50 border-purple-400/30"
              )}
              style={{
                minHeight: `${baseMinHeight}px`,
                height: `${containerHeight}px`,
                padding: isMobile ? "4px 10px 4px 12px" : "6px 12px 6px 16px",
                gap: "8px",
              }}
            >

            {/* Quick actions trigger: plus icon */}
            {onRequestSelect && (
              <QuickActionsDrawer 
                onRequestSelect={onRequestSelect}
                className="transition-colors duration-200"
              >
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className={cn(isMobile ? "p-0" : "p-3", "rounded-full hover:bg-white/10 transition-all duration-200")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="plusGradientLocal" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#224AD7" stopOpacity="0.6" />
                        <stop offset="56%" stopColor="#CA40DB" />
                        <stop offset="100%" stopColor="#7645D9" />
                      </linearGradient>
                    </defs>
                    <path d="M12 4V20M4 12H20" stroke="url(#plusGradientLocal)" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              </QuickActionsDrawer>
            )}

            {/* Text input - Figma typography */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: '1 0 0',
              alignSelf: 'stretch'
            }}>
              <textarea
                ref={textareaRef}
                value={textInput}
                rows={1}
                onChange={(e) => onTextInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                aria-label="Chat input"
                className="bg-transparent text-white outline-none w-full placeholder:text-white/60 dark:placeholder:text-white/40 font-medium resize-none"
                style={{
                  fontFamily: 'Gilroy',
                  fontSize: '16px',
                  fontWeight: '400',
                  letterSpacing: '-0.32px',
                  lineHeight: 'normal',
                  height: `${contentMinHeight}px`,
                  paddingTop: `${textareaPaddingY}px`,
                  paddingBottom: `${textareaPaddingY}px`,
                  paddingLeft: `${textareaPaddingX}px`,
                  paddingRight: `${textareaPaddingX}px`
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Mute button (shows during call) */}
              {isCallActive && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleMute}
                  className={cn(
                    "p-3 rounded-full",
                    "transition-all duration-200",
                    isMuted ? (
                      "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    ) : (
                      "bg-white/10 hover:bg-white/20 text-white/70"
                    )
                  )}
                >
                  {isMuted ? (
                    <MicrophoneSlash size={isMobile ? 16 : 20} weight="fill" />
                  ) : (
                    <Microphone size={isMobile ? 16 : 20} weight="fill" />
                  )}
                </motion.button>
              )}

              {/* Voice/Send button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    if (hasText) {
                      void onSendText();
                      return;
                    }
                    if (isRecording || isCallActive) {
                      onStopRecording();
                      return;
                    }
                    if (emailRequiredGate) return;
                    onStartRecording();
                  }}
                  className={cn(
                    "rounded-full flex items-center justify-center relative",
                  "transition-all duration-300"
                  )}
                style={{ background: isConnecting ? '#FDBA74' : 'var(--text-primary-white)' }}
                  animate={{
                    width: 48,
                    height: 48,
                  boxShadow: (isRecording || isCallActive) && !isConnecting
                      ? '0 10px 15px -3px rgba(239, 68, 68, 0.25), 0 4px 6px -2px rgba(239, 68, 68, 0.1)'
                      : '0 0 0 0 rgba(0,0,0,0)',
                    marginRight: '-2px'
                  }}
                  transition={{
                    boxShadow: { duration: 0.25 }
                  }}
                  disabled={
                    (!effectiveCanSend && hasText) ||
                    (emailRequiredGate && !hasText && !isRecording && !isCallActive)
                  }
                  aria-label={
                    hasText
                      ? "Send message"
                      : isRecording || isCallActive
                        ? "Stop voice"
                        : emailRequiredGate
                          ? "Voice disabled until email is provided"
                          : "Start voice"
                  }
                  aria-disabled={
                    (!effectiveCanSend && hasText) ||
                    (emailRequiredGate && !hasText && !isRecording && !isCallActive)
                  }
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
                        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#FDE68A" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        stroke="url(#ringGrad)"
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
                      opacity: (isRecording || isCallActive) && !isConnecting ? 1 : 0
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  <AnimatePresence mode="wait">
                    {(isRecording || isCallActive) ? (
                      <motion.div
                        className="relative z-10"
                        key="phone"
                        initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.9, rotate: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <PhoneSlash size={20} className="text-white" weight="fill" />
                      </motion.div>
                    ) : hasText ? (
                      <motion.div
                        key="send"
                        initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.9, rotate: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <svg
                          style={{ marginLeft: 4 }}
                          xmlns="http://www.w3.org/2000/svg"
                          width={24}
                          height={24}
                          viewBox="0 0 25 25"
                          fill="none"
                        >
                          <path
                            d="M23.9643 12.7213L5.29787 12.5109M23.9643 12.7213L0.931201 23.4933L5.29787 12.5109M23.9643 12.7213L1.17979 1.43294L5.29787 12.5109"
                            stroke="url(#uiIconGradient)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="wave"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                      >
                        <svg width="24" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="wavegrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(34,74,215,0.6)" />
                              <stop offset="56%" stopColor="#CA40DB" />
                              <stop offset="100%" stopColor="#7645D9" />
                            </linearGradient>
                          </defs>
                          <rect x="0"  y="8" width="3" height="8" rx="1" fill="url(#wavegrad)" />
                          <rect x="6" y="0"  width="3" height="24" rx="1" fill="url(#wavegrad)" />
                          <rect x="12" y="4"  width="3" height="16" rx="1" fill="url(#wavegrad)" />
                          <rect x="18" y="2"  width="3" height="20" rx="1" fill="url(#wavegrad)" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
            </div>
          </div>
          </div>

          </div>
        </div>
      </div>


      {/* Daily limit error message */}
      {dailyLimitError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-2 mt-2"
        >
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-200 font-medium">
                {dailyLimitError.code === 1008 ? 'Daily Limit Reached' : 'ElevenLabs Error'}
              </span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              {dailyLimitError.reason || 'The AI agent has reached its daily usage limit. Please try again tomorrow.'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}