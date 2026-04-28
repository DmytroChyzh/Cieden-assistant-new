"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { ChatbotMessage } from "./types";

interface ChatMessageProps {
  message: ChatbotMessage;
  onQuickPrompt?: (value: string) => void;
  userName?: string;
}

const DEFAULT_SUGGESTIONS_EN = [
  "I want a preliminary estimate",
  "Book a call",
  "Tell me more about that",
  "Show your best case",
  "Let's talk about something else",
];

const DEFAULT_SUGGESTIONS_UA = [
  "Хочу попередню оцінку",
  "Записатися на дзвінок",
  "Розкажи детальніше",
  "Покажи найкращий кейс",
  "Давай поговоримо про інше",
];
const BOOK_CALL_EN = "Book a call";
const BOOK_CALL_UA = "Записатися на дзвінок";
const ESTIMATE_EN = "I want a preliminary estimate";
const ESTIMATE_UA = "Хочу попередню оцінку";
const TARGET_SUGGESTIONS_COUNT = 5;

/**
 * One message bubble — Chatbot visual style.
 * No Theme/Language context, no VoiceSpeaker; wired for FinPilot.
 */
export function ChatMessage({ message, onQuickPrompt, userName }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const { cleanContent, fallbackAnswers } = useMemo(() => {
    let cleanContent = message.content;
    // Hide internal estimate control payloads from users
    cleanContent = cleanContent
      .replace(/ESTIMATE_PANEL_RESULT:\s*\{[\s\S]*?\}(?=\s|$)/g, "")
      .replace(/\[ESTIMATE\s+(?:MODE|PANEL)\][^\n]*\n?/gi, "")
      .replace(/(?:^|\n)\s*(?:ENTER\s+)?ESTIMATE\s+MODE[^\n]*\n?/gi, "\n")
      .replace(/(?:^|\n)\s*EXIT\s+ESTIMATE\s+MODE[^\n]*\n?/gi, "\n")
      .trim();
    const fallbackAnswers: string[] = [];
    const match = cleanContent.match(/\[([\s\S]*?)\]\s*$/);
    if (match) {
      try {
        // Parse suggestions payload as strict JSON first. Some options contain apostrophes
        // (e.g. "I'd like ..."), so replacing all single quotes breaks valid JSON.
        let arr: unknown = null;
        try {
          arr = JSON.parse(match[0]);
        } catch {
          arr = JSON.parse(match[0].replace(/'/g, '"'));
        }
        if (Array.isArray(arr)) {
          fallbackAnswers.push(...arr.map((s: unknown) => String(s).trim()).filter(Boolean));
          cleanContent = cleanContent.replace(match[0], "").trim();
        }
      } catch {
        // ignore
      }
    }
    return { cleanContent, fallbackAnswers };
  }, [message.content]);

  const isTypingBubble = !isUser && cleanContent === "__TYPING__";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const date =
    typeof message.timestamp === "number"
      ? new Date(message.timestamp)
      : message.timestamp;
  const timeStr = date && !isNaN(date.getTime()) ? format(date, "HH:mm") : "";
  const explicitSuggestions =
    (Array.isArray(message.suggestedAnswers) && message.suggestedAnswers.length > 0
      ? message.suggestedAnswers
      : fallbackAnswers) || [];
  const hasUkrainian = /[іїєґІЇЄҐ]/.test(cleanContent);
  const defaultSuggestions = hasUkrainian ? DEFAULT_SUGGESTIONS_UA : DEFAULT_SUGGESTIONS_EN;
  const isPreliminaryEstimateMessage =
    /preliminary\s+estimate|попередн\w*\s+оцінк/i.test(cleanContent);
  const isVoiceModeChooserMessage = explicitSuggestions.some((s) => {
    const n = s.trim().toLowerCase();
    return n === "continue by voice" || n === "continue by text";
  });
  const ensuredExplicitSuggestions = (() => {
    if (isUser || isTypingBubble || explicitSuggestions.length === 0) return explicitSuggestions;
    if (isPreliminaryEstimateMessage || isVoiceModeChooserMessage) return explicitSuggestions;
    const bookCallChip = hasUkrainian ? BOOK_CALL_UA : BOOK_CALL_EN;
    const estimateChip = hasUkrainian ? ESTIMATE_UA : ESTIMATE_EN;
    const result = [...explicitSuggestions];
    const hasBookCall = result.some((s) => s.trim().toLowerCase() === bookCallChip.toLowerCase());
    const hasEstimate = result.some((s) => s.trim().toLowerCase() === estimateChip.toLowerCase());
    if (!hasEstimate) result.push(estimateChip);
    if (!hasBookCall) result.push(bookCallChip);
    return result;
  })();
  const baseSuggestions =
    isUser || isTypingBubble
      ? []
      : message.suppressDefaultSuggestions
        ? ensuredExplicitSuggestions
        : ensuredExplicitSuggestions.length === 0
          ? defaultSuggestions
          : ensuredExplicitSuggestions;
  const suggestions = (() => {
    if (baseSuggestions.length === 0) return baseSuggestions;
    if (isPreliminaryEstimateMessage || isVoiceModeChooserMessage) return baseSuggestions;
    const pool = hasUkrainian ? DEFAULT_SUGGESTIONS_UA : DEFAULT_SUGGESTIONS_EN;
    const unique = Array.from(new Set(baseSuggestions.map((s) => s.trim()).filter(Boolean)));
    for (const option of pool) {
      if (unique.length >= TARGET_SUGGESTIONS_COUNT) break;
      if (!unique.some((s) => s.toLowerCase() === option.toLowerCase())) {
        unique.push(option);
      }
    }
    return unique.slice(0, TARGET_SUGGESTIONS_COUNT);
  })();

  return (
    <div className="w-full py-2" style={{ display: "flex", justifyContent: "center" }}>
      <div
        className={`w-full flex ${isUser ? "justify-end" : "justify-start"} items-end`}
        style={{ maxWidth: 900, margin: "0 auto" }}
      >
        <div className={`relative max-w-2xl ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`flex items-center mb-1 text-xs text-white/60 ${isUser ? "justify-end" : "justify-start"}`}
            style={{ minHeight: 18 }}
          >
            {isUser ? (
              <>
                <span>{userName || "Client"}</span>
                <svg className="ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                </svg>
              </>
            ) : (
              <>
                <svg className="mr-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="4" />
                  <circle cx="7.5" cy="16" r="1.5" />
                  <circle cx="16.5" cy="16" r="1.5" />
                  <path d="M12 2v4m-6 4V6m12 4V6" />
                </svg>
                <span>Assistant</span>
              </>
            )}
          </div>
          <div
            className={`rounded-3xl px-5 py-4 shadow-lg transition-colors duration-300 backdrop-blur-xl ring-1 ring-white/10 ${
              isUser
                ? "rounded-br-none bg-[#3C2780]/60 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                : "rounded-bl-none bg-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
            }`}
            style={{ wordBreak: "break-word" }}
          >
            {isTypingBubble ? (
              <div className="flex items-center gap-1.5 py-1">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-white/70 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-white/70 animate-bounce"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-white/70 animate-bounce"
                  style={{ animationDelay: "320ms" }}
                />
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{cleanContent}</div>
            )}
          </div>
          <div
            className={`flex items-center gap-2 mt-1 text-xs text-white/50 ${isUser ? "justify-end" : "justify-start"}`}
          >
            <span>{timeStr}</span>
            {!isUser && !isTypingBubble && (
              <button type="button" onClick={handleCopy} className="hover:text-white/80 transition" title="Copy">
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {!isUser && onQuickPrompt && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestions.map((answer, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickPrompt(answer)}
                  aria-label={answer}
                  className="px-4 py-2 rounded-xl bg-[#4C3AE6]/40 hover:bg-[#4C3AE6]/70 text-white font-medium transition-colors cursor-pointer"
                >
                  {answer}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
