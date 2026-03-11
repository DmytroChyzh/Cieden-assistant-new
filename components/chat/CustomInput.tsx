"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { useChatContext } from "@copilotkit/react-ui";
import { useCopilotContext } from "@copilotkit/react-core";

interface Message {
  id: string;
  content: string;
  role: string;
}

interface CustomInputProps {
  inProgress: boolean;
  onSend: (text: string) => Promise<Message>;
  isVisible?: boolean;
  onStop?: () => void;
  onUpload?: () => void;
  hideStopButton?: boolean;
  showPoweredBy?: boolean; // We'll ignore this completely
}

export const CustomInput = ({
  inProgress,
  onSend,
  onStop,
  onUpload,
  hideStopButton = false,
}: CustomInputProps) => {
  // Using contexts to prevent tree shaking warnings
  useChatContext();
  useCopilotContext();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [text, setText] = useState("");

  const handleDivClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // If the user clicked a button or inside a button, don't focus the textarea
    if (target.closest("button")) return;

    // If the user clicked the textarea, do nothing (it's already focused)
    if (target.tagName === "TEXTAREA") return;

    // Otherwise, focus the textarea
    textareaRef.current?.focus();
  };

  const send = useCallback(() => {
    if (inProgress) return;
    onSend(text);
    setText("");
    textareaRef.current?.focus();
  }, [inProgress, onSend, text]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      if (text.trim() && !inProgress) {
        send();
      }
    }
  };

  const canSend = useMemo(() => {
    return !inProgress && text.trim().length > 0;
  }, [inProgress, text]);

  const canStop = useMemo(() => {
    return inProgress && !hideStopButton;
  }, [inProgress, hideStopButton]);

  const buttonIcon = canStop ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />;

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div
        className="relative bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-2xl p-3 cursor-text min-h-[60px] flex items-end gap-3 shadow-xl shadow-black/10 dark:shadow-black/20 transition-all duration-300 hover:bg-white/15 dark:hover:bg-white/8 hover:border-white/30 dark:hover:border-white/15"
        onClick={handleDivClick}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Type your message..."
          rows={1}
          className="flex-1 resize-none bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/60 dark:placeholder:text-white/40 font-medium"
          style={{
            minHeight: "20px",
            maxHeight: "120px",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "20px";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        
        <div className="flex items-center gap-2">
          {onUpload && (
            <button
              onClick={onUpload}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Upload file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          )}
          
          <button
            onClick={canStop ? onStop : send}
            disabled={!canSend && !canStop}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canSend || canStop
                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
            aria-label={canStop ? "Stop" : "Send message"}
          >
            {buttonIcon}
          </button>
        </div>
      </div>
    </div>
  );
};