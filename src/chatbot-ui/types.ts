/**
 * Minimal types for Chatbot UI — no Firebase/Chatbot backend.
 * Used by ChatWindow / ChatMessage; data comes from Convex (FinPilot).
 */

export type MessageRole = "user" | "assistant";

export interface ChatbotMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date | number;
  suggestedAnswers?: string[];
  /** When true, do not inject the generic EN/UA default suggestion chips. */
  suppressDefaultSuggestions?: boolean;
}
