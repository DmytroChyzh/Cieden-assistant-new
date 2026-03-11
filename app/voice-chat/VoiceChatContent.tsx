"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UnifiedChatInput } from "@/src/components/unified/UnifiedChatInput";
import { SpeakingHUD } from "@/src/components/voice/SpeakingHUD";
import { useTextMessaging } from "@/src/hooks/useTextMessaging";
import { VoiceChatHeader } from "@/src/components/VoiceChatHeader";
import { EmptyStateWrapper } from "@/src/components/EmptyStateWrapper";
import { MagicCard } from '@/src/components/magicui/magic-card';
import { SettingsPanel } from '@/src/components/unified/SettingsPanel';
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useChatMessages } from "@/src/hooks/useChatMessages";
import { ActionHandlers } from "@/src/utils/toolBridge";
import { useElevenLabsConversation } from "@/src/providers/ElevenLabsProvider";
import dynamic from 'next/dynamic';

// Import all the card components
import { ChartMessage } from "@/src/components/charts/ChartMessage";
import { MessageCard } from "@/src/components/chat/MessageCard";
import { BalanceCard } from "@/src/components/charts/BalanceCard";
import { QuizCard } from "@/src/components/quiz/QuizCard";
import { EMICard } from "@/src/components/charts/EMICard";
import { SavingsGoalCard } from "@/src/components/charts/SavingsGoalCard";
import { DocumentIDCard } from "@/src/components/charts/DocumentIDCard";
import { LendingOptionsCard } from "@/src/components/charts/LendingOptionsCard";
import { CreditScoreDisplay } from "@/src/components/charts/CreditScoreDisplay";

// Dynamically import the background components with no SSR
const AISwarmBackground = dynamic(
  () => import('@/components/ui/ai-swarm-background').then(mod => mod.Component),
  { ssr: false }
);

const VoiceReactiveBackground = dynamic(
  () => import('@/components/ui/voice-reactive-background').then(mod => mod.VoiceReactiveBackground),
  { ssr: false }
);

interface VoiceChatContentProps {
  conversationId: Id<"conversations"> | null;
  actionHandlers: ActionHandlers;
  voiceStatus: 'idle' | 'connecting' | 'listening' | 'speaking';
  settings: any;
  updateSettings: any;
  isMobile?: boolean;
}

export function VoiceChatContent({
  conversationId,
  actionHandlers,
  voiceStatus,
  settings,
  updateSettings,
  isMobile = false
}: VoiceChatContentProps) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [clearing, setClearing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sendContextualUpdate, setSendContextualUpdate] = useState<((text: string) => void) | null>(null);

  // Voice audio state - all from frequency data via callback
  // No VAD dependency - speaking state derived from frequency levels
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [userAudioLevel, setUserAudioLevel] = useState(0);

  // Derive agent speaking state from voice status
  const isAgentSpeaking = voiceStatus === 'speaking';

  const clearHistory = useMutation(api.messages.clearForConversation);
  const createMessage = useMutation(api.messages.create);

  // Custom hook for Convex message integration
  const { convexMessages } = useChatMessages({ conversationId });

  // Text messaging for when voice is idle (with tool calling support)
  // This hook now has access to the ElevenLabsProvider context
  const { sendTextMessage } = useTextMessaging({
    conversationId,
    actionHandlers
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = useCallback(() => {
    // Scroll handling logic if needed
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (!conversationId) return;
    setClearing(true);
    try {
      await clearHistory({ conversationId });
    } finally {
      setClearing(false);
    }
  }, [conversationId, clearHistory]);

  const handleUserAction = useCallback(async (text: string) => {
    if (text.startsWith('TOOL_CALL:')) {
      console.log('💾 Saving tool call to Convex:', text);
      if (conversationId) {
        try {
          await createMessage({
            conversationId,
            content: text,
            role: 'assistant',
            source: 'contextual'
          });
          console.log('✅ Tool call message saved to Convex');
        } catch (error) {
          console.error('❌ Failed to save tool call message:', error);
        }
      }
    } else if (sendContextualUpdate) {
      sendContextualUpdate(text);
      if (conversationId) {
        try {
          await createMessage({
            conversationId,
            content: text,
            role: 'system',
            source: 'contextual'
          });
          console.log('🗂️ Saved contextual update to Convex');
        } catch (error) {
          console.error('❌ Failed to save contextual update message:', error);
        }
      }
    }
  }, [conversationId, createMessage, sendContextualUpdate]);

  const handleVoiceAudioUpdate = useCallback((userSpeaking: boolean, userLevel: number, agentLevel: number) => {
    setIsUserSpeaking(userSpeaking);
    setUserAudioLevel(userLevel);
    setAgentAudioLevel(agentLevel);
  }, []);

  const handleMessage = useCallback((message: string, source: 'voice' | 'text') => {
    console.log(`📩 Message from ${source}:`, message.slice(0, 100));
  }, []);

  const handleVoiceStatusChange = useCallback((status: 'idle' | 'connecting' | 'listening' | 'speaking') => {
    console.log('🎤 Voice status:', status);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [convexMessages]);

  // Function to render message content based on type
  const renderMessageContent = (message: any) => {
    const content = message.content || '';

    // Check if this is a tool call message
    if (content.startsWith('TOOL_CALL:')) {
      const parts = content.split(':');
      const toolName = parts[1];
      const params = parts.slice(2).join(':');

      try {
        const parsedParams = JSON.parse(params);

        switch(toolName) {
          case 'show_balance':
            return <BalanceCard data={parsedParams} onUserAction={handleUserAction} />;
          case 'show_savings_goal':
            return <SavingsGoalCard data={parsedParams} onUserAction={handleUserAction} />;
          case 'show_document_id':
            return <DocumentIDCard data={parsedParams} onUserAction={handleUserAction} />;
          case 'show_lending_options':
            return <LendingOptionsCard data={parsedParams} onUserAction={handleUserAction} />;
          case 'show_credit_score':
            return <CreditScoreDisplay data={parsedParams} onUserAction={handleUserAction} />;
          case 'show_emi_info':
            return <EMICard data={parsedParams} onUserAction={handleUserAction} />;
          case 'start_quiz':
            return <QuizCard initialData={parsedParams} onUserAction={handleUserAction} />;
          default:
            return <MessageCard message={message} />;
        }
      } catch (e) {
        console.error('Failed to parse tool params:', e);
        return <MessageCard message={message} />;
      }
    }

    // Check for chart messages
    if (message.chartData) {
      return <ChartMessage message={message} />;
    }

    // Default message rendering
    return <MessageCard message={message} />;
  };

  // Memoize rendered messages to avoid re-rendering cards on frequent audio state updates
  const renderedMessages = useMemo(() => (
    convexMessages.map((message) => (
      <motion.div
        key={message._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="message-card-wrapper"
      >
        {renderMessageContent(message)}
      </motion.div>
    ))
  ), [convexMessages, handleUserAction]);

  return (
    <div
      className={`${isMobile ? 'h-full voice-chat-background-embed' : 'min-h-screen voice-chat-background'} relative page-fade-in-animation`}
    >
      {/* Background layers - only render on client */}
      {mounted && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          {/* Base particle animation */}
          <AISwarmBackground />
          {/* Voice-reactive overlay */}
          <VoiceReactiveBackground
            voiceStatus={voiceStatus}
            isUserSpeaking={isUserSpeaking}
            isAgentSpeaking={isAgentSpeaking}
            userAudioLevel={userAudioLevel}
            agentAudioLevel={agentAudioLevel}
            showLeftGradient={settings?.visuals?.showSideGradients ?? true}
            showRightGradient={settings?.visuals?.showSideGradients ?? true}
            showCenterGradient={settings?.visuals?.showCenterGradient ?? false}
            gradientVariant={settings?.visuals?.gradientVariant ?? 'default'}
          />
        </div>
      )}

      {/* Main content layer */}
      <div className={`relative z-10 h-full ${isMobile ? 'grid grid-rows-[auto,1fr,auto] min-h-0' : 'flex flex-col'}`}>
        {/* Header with full menu actions */}
        <VoiceChatHeader
          className={isMobile ? 'relative' : undefined}
          onSettingsOpen={() => setShowSettings(true)}
          onClearHistory={handleClearHistory}
          onSignOut={async () => {
            await signOut();
            // Keep users in the main assistant flow after sign-out
            router.push('/voice-chat');
          }}
          clearing={clearing}
        />

        <main className={`${isMobile ? 'min-h-0 overflow-hidden' : 'flex-1'} flex flex-col`}>
          {/* Messages Display */}
          <div
            className="flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden scrollbar-chat min-h-0"
            onScroll={handleScroll}
            style={{
              contain: 'layout style paint',
              willChange: 'scroll-position',
              paddingBottom: isMobile ? 'calc(260px + env(safe-area-inset-bottom))' : '280px'
            }}
          >
            <EmptyStateWrapper hasMessages={convexMessages.length > 0}>
              <div className="max-w-4xl mx-auto space-y-6">
                <AnimatePresence initial={false}>
                  {renderedMessages}
                </AnimatePresence>
                <div className="h-12" />
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </EmptyStateWrapper>
          </div>

          {/* Voice Status Display */}
          {voiceStatus !== 'idle' && (
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
        </main>

        {/* Unified Chat Input */}
        <UnifiedChatInput
          conversationId={conversationId}
          onMessage={handleMessage}
          onStatusChange={handleVoiceStatusChange}
          onContextualUpdate={(sendUpdate) => setSendContextualUpdate(() => sendUpdate)}
          actionHandlers={actionHandlers}
          onVoiceAudioUpdate={handleVoiceAudioUpdate}
          isMobile={isMobile}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        show={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
      />
    </div>
  );
}

// Import AnimatePresence for animations
import { AnimatePresence } from "framer-motion";
