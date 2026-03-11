interface DynamicVariables {
  user_id: string;
  conversation_id: string;
  app_mode: 'text' | 'voice';
  session_id?: string;
  context?: string;
}

interface RuntimeOverrides {
  systemPrompt?: string;
  firstMessage?: string;
  textOnly?: boolean;
  greeting?: string;
  volume?: number;
}

export function buildDynamicVariables(params: {
  userId: string;
  conversationId: string;
  mode: 'text' | 'voice';
  sessionId?: string;
  context?: string;
}): DynamicVariables {
  return {
    user_id: params.userId,
    conversation_id: params.conversationId,
    app_mode: params.mode,
    ...(params.sessionId && { session_id: params.sessionId }),
    ...(params.context && { context: params.context })
  };
}

export function buildRuntimeOverrides(mode: 'text' | 'voice'): RuntimeOverrides {
  const ciedenIdentity = "You are the Cieden AI Design Assistant. You represent Cieden (UI/UX design agency). Never present yourself as a bank, financial assistant, or software development company.";
  if (mode === 'text') {
    return {
      systemPrompt: `${ciedenIdentity} Provide clear, concise text-based responses about Cieden's services, portfolio, and collaboration.`,
      firstMessage: "",
      textOnly: true,
      greeting: "",
      volume: 0
    };
  }

  return {
    systemPrompt: `${ciedenIdentity} Respond naturally with voice about Cieden's design work, collaboration formats, and engagement options (no development services).`,
    greeting: "Hi! I'm the Cieden AI Design Assistant. How can I help you today — portfolio, pricing, or starting a design project?"
  };
}

export function extractContextFromMessages(messages: Array<{ role: string; content: string }>, maxTokens: number = 1000): string {
  const recentMessages = messages.slice(-10);

  const context = recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  if (context.length > maxTokens * 4) {
    return context.substring(0, maxTokens * 4) + '...';
  }

  return context;
}

export function buildContextualUpdate(params: {
  previousMode: 'text' | 'voice';
  newMode: 'text' | 'voice';
  context: string;
  userId: string;
  conversationId: string;
}): { systemPrompt: string; dynamicVariables: DynamicVariables } {
  const modeTransition = `${params.previousMode}_to_${params.newMode}`;

  let systemPrompt = "";

  const ciedenIdentity = "You are the Cieden AI Design Assistant. You represent Cieden (UI/UX design agency). Never present yourself as a bank, financial assistant, or software development company.";
  switch (modeTransition) {
    case 'text_to_voice':
      systemPrompt = `${ciedenIdentity}\n\nYou are continuing a conversation that started in text mode. Previous context:\n${params.context}\n\nNow respond naturally with voice as Cieden's assistant.`;
      break;
    case 'voice_to_text':
      systemPrompt = `${ciedenIdentity}\n\nYou are continuing a conversation that started in voice mode. Previous context:\n${params.context}\n\nNow provide text-based responses as Cieden's assistant.`;
      break;
    default:
      systemPrompt = buildRuntimeOverrides(params.newMode).systemPrompt || '';
  }

  const dynamicVariables = buildDynamicVariables({
    userId: params.userId,
    conversationId: params.conversationId,
    mode: params.newMode,
    context: params.context
  });

  return { systemPrompt, dynamicVariables };
}

export function shouldSuppressGreeting(mode: 'text' | 'voice', isModeSwitching: boolean): boolean {
  return mode === 'text' || isModeSwitching;
}

export function validateSessionTransition(currentSession: any, newMode: 'text' | 'voice'): { valid: boolean; reason?: string } {
  if (!currentSession) {
    return { valid: true };
  }

  if (currentSession.status === 'active' && currentSession.mode === newMode) {
    return { valid: false, reason: 'Session already active in this mode' };
  }

  if (currentSession.status === 'connecting') {
    return { valid: false, reason: 'Session is currently connecting' };
  }

  return { valid: true };
}

// Observability helpers
export function logSessionEvent(event: {
  type: 'start' | 'end' | 'switch' | 'error';
  mode: 'text' | 'voice';
  connectionType?: 'websocket' | 'webrtc';
  conversationId?: string;
  sessionId?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...event
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const emoji = event.type === 'error' ? '❌' :
                  event.type === 'start' ? '🚀' :
                  event.type === 'end' ? '🏁' : '🔄';
    console.log(`${emoji} Session Event:`, logEntry);
  }

  // TODO: Send to analytics service in production
  return logEntry;
}

export function measureModeSwitch(startTime: number): number {
  const latencyMs = Date.now() - startTime;

  if (latencyMs > 500) {
    console.warn(`⚠️ Mode switch took ${latencyMs}ms (target: <500ms)`);
  } else {
    console.log(`✅ Mode switch completed in ${latencyMs}ms`);
  }

  return latencyMs;
}

// Debounce helper for rapid Start/End toggles
export function createSessionDebouncer(delayMs: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingAction: (() => void) | null = null;

  return {
    debounce(action: () => void) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      pendingAction = action;
      timeoutId = setTimeout(() => {
        if (pendingAction) {
          pendingAction();
          pendingAction = null;
        }
        timeoutId = null;
      }, delayMs);
    },

    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingAction = null;
    },

    isPending(): boolean {
      return timeoutId !== null;
    }
  };
}

// Message normalization for consistent handling
export function normalizeAgentMessage(event: any): { content: string; source: string } | null {
  // Handle agent_response payloads
  if (event.type === 'agent_response' && event.agent_response) {
    return {
      content: event.agent_response,
      source: 'ai'
    };
  }

  // Handle { source: 'ai', message: '...' } format
  if (event.source === 'ai' && event.message) {
    return {
      content: event.message,
      source: 'ai'
    };
  }

  // Handle legacy format
  if (typeof event === 'string') {
    return {
      content: event,
      source: 'ai'
    };
  }

  return null;
}