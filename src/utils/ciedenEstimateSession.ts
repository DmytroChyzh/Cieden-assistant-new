/**
 * Client-only session management for the estimate flow.
 *
 * Each estimate session is identified by the messageId of its `open_calculator` tool call.
 * Sessions can be: "active" (Q&A in progress), "completed" (final result delivered),
 * or "cancelled" (user cancelled before completion).
 *
 * Multiple sessions can exist in the same chat — each keeps its own state.
 */

export interface EstimateSessionData {
  status: "active" | "completed" | "cancelled";
  result?: Record<string, unknown>;
  /** Index-based first message ID (the open_calculator tool call) */
  chooserMessageId: string;
}

type SessionMap = Map<string, EstimateSessionData>;

function getSessionMap(): SessionMap {
  if (typeof window === "undefined") return new Map();
  const w = window as unknown as { __ciedenEstimateSessions?: SessionMap };
  if (!w.__ciedenEstimateSessions) {
    w.__ciedenEstimateSessions = new Map();
  }
  return w.__ciedenEstimateSessions;
}

/** Returns the currently active session's chooser message ID, or null. */
export function getActiveEstimateSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return ((window as any).__ciedenActiveEstimateSession as string) ?? null;
}

function setActiveSessionId(id: string | null): void {
  if (typeof window === "undefined") return;
  (window as any).__ciedenActiveEstimateSession = id;
}

/** Register a new estimate session tied to the chooser card's messageId. */
export function startEstimateSession(chooserMessageId: string): void {
  const map = getSessionMap();
  // Mark any previously active session as cancelled (if it wasn't completed)
  const prevId = getActiveEstimateSessionId();
  if (prevId && map.has(prevId)) {
    const prev = map.get(prevId)!;
    if (prev.status === "active") {
      prev.status = "cancelled";
    }
  }
  map.set(chooserMessageId, { status: "active", chooserMessageId });
  setActiveSessionId(chooserMessageId);
}

/** Mark the currently active session as completed and store the result. */
export function completeEstimateSession(result?: Record<string, unknown>): void {
  const id = getActiveEstimateSessionId();
  if (!id) return;
  const map = getSessionMap();
  const session = map.get(id);
  if (session) {
    session.status = "completed";
    if (result) session.result = result;
  }
}

/** Cancel the currently active session. */
export function cancelEstimateSession(): void {
  const id = getActiveEstimateSessionId();
  if (!id) return;
  const map = getSessionMap();
  const session = map.get(id);
  if (session && session.status === "active") {
    session.status = "cancelled";
  }
  setActiveSessionId(null);
}

/** Get session data for a specific chooser messageId. */
export function getEstimateSession(chooserMessageId: string): EstimateSessionData | undefined {
  return getSessionMap().get(chooserMessageId);
}

/** Check if any session is currently active. */
export function hasActiveEstimateSession(): boolean {
  return getActiveEstimateSessionId() !== null &&
    getSessionMap().get(getActiveEstimateSessionId()!)?.status === "active";
}

/** Check if a SPECIFIC session is completed. */
export function isSessionCompleted(chooserMessageId: string): boolean {
  return getSessionMap().get(chooserMessageId)?.status === "completed" ?? false;
}

// Legacy compatibility wrappers (used across the codebase)

export function markCiedenEstimateSessionCompleted(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __ciedenEstimateSessionCompleted?: boolean }).__ciedenEstimateSessionCompleted = true;
  completeEstimateSession();
}

export function resetCiedenEstimateSessionCompleted(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __ciedenEstimateSessionCompleted?: boolean }).__ciedenEstimateSessionCompleted = false;
}

export function isCiedenEstimateSessionCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as { __ciedenEstimateSessionCompleted?: boolean }).__ciedenEstimateSessionCompleted === true;
}
