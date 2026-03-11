"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useConversation, type Status } from '@elevenlabs/react';
import { perfLog, isDiagnosticsEnabled } from '@/src/utils/perf';

export type VoiceTransportHandle = {
  startSession: (options: Parameters<typeof useConversation>[0]) => Promise<string | undefined | null>;
  endSession: () => Promise<void>;
  sendUserMessage: (text: string) => void;
  sendContextualUpdate: (text: string) => void;
  setVolume: (v: { volume: number }) => void;
  getStatus: () => Status;
  getId: () => string | undefined;
  getConversation: () => ReturnType<typeof useConversation>;
};

type VoiceTransportProps = Parameters<typeof useConversation>[0] & {
  attemptId: string;
  onMountReady?: () => void;
};

export const VoiceTransport = forwardRef<VoiceTransportHandle, VoiceTransportProps>(function VoiceTransport(
  props,
  ref
) {
  const { onMountReady, attemptId, ...convOptions } = props as VoiceTransportProps;
  const hasNotifiedReady = useRef(false);

  const conv = useConversation({
    ...(convOptions as any),
  });

  useImperativeHandle(
    ref,
    () => ({
      startSession: async (options) => (conv as any).startSession?.(options as any),
      endSession: async () => (conv as any).endSession?.(),
      sendUserMessage: (t) => (conv as any).sendUserMessage?.(t),
      sendContextualUpdate: (t) => (conv as any).sendContextualUpdate?.(t),
      setVolume: (v) => (conv as any).setVolume?.(v),
      getStatus: () => conv.status,
      getId: () => (conv as any).getId?.(),
      getConversation: () => conv,
    }),
    [conv]
  );

  useEffect(() => {
    if (!hasNotifiedReady.current) {
      hasNotifiedReady.current = true;
      try {
        if (isDiagnosticsEnabled()) {
          perfLog('voice.transport_ready', { attemptId });
        }
      } catch (_) {}
      try { onMountReady?.(); } catch (_) {}
    }
  }, [onMountReady, attemptId]);

  useEffect(() => {
    return () => {
      try {
        // Helpful diagnostic
        // eslint-disable-next-line no-console
        console.log(`[VoiceTransport] Unmount cleanup for attempt ${attemptId}`);
      } catch (_) {}
      // Note: We intentionally avoid forcing endSession() here because the hook
      // already performs teardown on unmount, and explicit calls can race in dev.
    };
  }, [attemptId]);

  return null;
});


