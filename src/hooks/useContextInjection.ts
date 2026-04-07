"use client";

import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { extractContextFromMessages } from '@/src/utils/agentContext';
import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { getGuestIdentityFromCookie } from '@/src/utils/guestIdentity';

interface UseContextInjectionProps {
  conversationId?: Id<"conversations"> | null;
}

export function useContextInjection({ conversationId }: UseContextInjectionProps) {
  const guestId = getGuestIdentityFromCookie()?.guestId;
  const messages = useQuery(
    api.messages.list,
    conversationId
      ? {
          conversationId,
          ...(guestId ? { guestId } : {}),
        }
      : "skip"
  );

  const { conversation, sessionMode, sendContextualUpdateOverSocket } = useElevenLabsConversation();

  const contextSentRef = useRef(false);
  const prevModeRef = useRef<typeof sessionMode>(sessionMode);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Reset when mode leaves active or connection drops
  useEffect(() => {
    const status = (conversation as any)?.status as string | undefined; // SDK status
    const prevMode = prevModeRef.current;
    const prevStatus = prevStatusRef.current;

    // Detect mode change
    if (prevMode !== sessionMode) {
      // If leaving active session, reset the sent flag
      if (sessionMode === 'idle') {
        contextSentRef.current = false;
      }
      prevModeRef.current = sessionMode;
    }

    // Detect disconnects
    if (prevStatus !== status) {
      if (status === 'disconnected') {
        contextSentRef.current = false;
      }
      prevStatusRef.current = status;
    }
  }, [conversation, sessionMode]);

  // Inject context once per session after transport connects
  // History should be provided via dynamicVariables at session start;
  // skip connect-time history injection for both modes to avoid post-greeting stalls.
  useEffect(() => {
    const status = (conversation as any)?.status as string | undefined;
    const isConnected = status === 'connected';
    const isVoice = sessionMode === 'voice';
    const isText = sessionMode === 'text';

    if (!isConnected || (!isVoice && !isText)) return;
    // Do not inject full conversation history on connect in either mode
    return;
  }, [conversation, sessionMode, messages, sendContextualUpdateOverSocket]);
}


