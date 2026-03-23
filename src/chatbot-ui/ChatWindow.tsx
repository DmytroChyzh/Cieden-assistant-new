"use client";

import type { RefObject } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatbotMessage } from "./types";

export const CHATBOT_MAX_WIDTH = 900;

export interface QuickPromptItem {
  title: string;
  desc?: string;
  valueEn: string;
  valueUk?: string;
}

interface ChatWindowProps {
  messages: ChatbotMessage[];
  userName?: string;
  isLoading?: boolean;
  quickPrompts?: QuickPromptItem[];
  onQuickPrompt?: (value: string) => void;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  paddingBottom?: number;
  /** When set, render custom node per message (e.g. tool cards); otherwise use ChatMessage */
  renderMessage?: (message: ChatbotMessage) => React.ReactNode;
}

/**
 * Chatbot-style message list + empty state.
 * No Firebase/Language/Theme; data and callbacks from FinPilot.
 */
export function ChatWindow({
  messages,
  userName = "You",
  isLoading = false,
  quickPrompts = [],
  onQuickPrompt,
  messagesEndRef,
  paddingBottom,
  renderMessage,
}: ChatWindowProps) {
  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex-1 overflow-y-auto w-full px-4 lg:px-0 py-8 transition-colors duration-300 relative"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: paddingBottom ? `${paddingBottom}px` : undefined,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: CHATBOT_MAX_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Empty state placeholder — intentionally minimal; parent controls welcome text */}

        {quickPrompts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onQuickPrompt?.(prompt.valueUk || prompt.valueEn)}
                className="p-4 bg-white/5 rounded-lg text-left hover:bg-white/10 transition-colors border border-white/10"
              >
                <h3 className="font-medium text-white mb-1">{prompt.title}</h3>
                {prompt.desc && <p className="text-sm text-white/60">{prompt.desc}</p>}
              </button>
            ))}
          </div>
        )}

        {hasMessages &&
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                width: "100%",
                maxWidth: CHATBOT_MAX_WIDTH,
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {renderMessage ? renderMessage(message) : <ChatMessage message={message} onQuickPrompt={onQuickPrompt} userName={userName} />}
            </div>
          ))}

        {isLoading && (
          <div
            style={{
              width: "100%",
              maxWidth: CHATBOT_MAX_WIDTH,
              margin: "0 auto",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-end",
            }}
          >
            <div className="relative max-w-2xl items-start">
              <div className="flex items-center mb-1 text-xs text-white/50 justify-start" style={{ minHeight: 18 }}>
                <svg className="mr-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="4" />
                  <circle cx="7.5" cy="16" r="1.5" />
                  <circle cx="16.5" cy="16" r="1.5" />
                  <path d="M12 2v4m-6 4V6m12 4V6" />
                </svg>
                <span>Assistant</span>
              </div>
              <div className="rounded-3xl px-5 py-4 shadow-md bg-white/10 flex items-center justify-center gap-2" style={{ minHeight: 40 }}>
                <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef ?? undefined} />
      </div>
    </div>
  );
}
