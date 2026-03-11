"use client";

export type SessionMode = 'text' | 'voice' | null;

export interface SessionState {
  conversationId: string;
  mode: SessionMode;
  tabId: string;
  timestamp: number;
}

export type ForceStopVoicePayload = { newOwner: string };

export interface SessionMessage {
  type: 'SESSION_STARTED' | 'SESSION_ENDED' | 'SESSION_HEARTBEAT' | 'CLAIM_SESSION' | 'FORCE_STOP_VOICE';
  payload: SessionState | { tabId: string } | ForceStopVoicePayload;
}

// Generate unique tab ID
export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Check if session is stale (no heartbeat for 30 seconds)
export function isSessionStale(state: SessionState | null): boolean {
  if (!state) return true;
  const now = Date.now();
  return (now - state.timestamp) > 30000; // 30 seconds
}

// Session lock management via localStorage
export class SessionLock {
  private static readonly LOCK_KEY = 'elevenlabs_session_lock';

  static get(): SessionState | null {
    try {
      const data = localStorage.getItem(this.LOCK_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to read session lock:', e);
      return null;
    }
  }

  static set(state: SessionState): void {
    try {
      localStorage.setItem(this.LOCK_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to set session lock:', e);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.LOCK_KEY);
    } catch (e) {
      console.error('Failed to clear session lock:', e);
    }
  }

  static updateHeartbeat(tabId: string): void {
    const current = this.get();
    if (current && current.tabId === tabId) {
      current.timestamp = Date.now();
      this.set(current);
    }
  }
}

// Cross-tab messaging via BroadcastChannel
export function createSessionChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel not supported in this browser');
    return null;
  }

  return new BroadcastChannel('elevenlabs_session');
}
