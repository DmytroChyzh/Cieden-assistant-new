"use client";
import { useEffect } from 'react';
import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';

export function SessionResetter() {
  const { stopVoice, stopText, startText, sessionMode, isTextConnected } = useElevenLabsConversation();
  useEffect(() => {
    const handler = () => {
      (async () => {
        try {
          if (sessionMode === 'voice') {
            await stopVoice();
          }
          if (isTextConnected) {
            await stopText();
            await startText();
          }
        } catch (_) {}
      })();
    };
    window.addEventListener('history-cleared', handler);
    return () => window.removeEventListener('history-cleared', handler);
  }, [stopVoice, stopText, startText, sessionMode, isTextConnected]);
  return null;
}


