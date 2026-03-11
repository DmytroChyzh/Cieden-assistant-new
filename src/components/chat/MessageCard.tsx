"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ToolCallMessageRenderer } from "./ToolCallMessageRenderer";
import { Id } from "@/convex/_generated/dataModel";

interface MessageCardProps {
  message: {
    _id: Id<"messages">;
    role: "user" | "assistant" | "system";
    content: string;
    source?: "voice" | "text" | "contextual" | "websocket" | "webrtc";
  };
  onUserAction?: ((text: string) => void) | null;
  compact?: boolean;
}

export function MessageCard({ message, onUserAction, compact = false }: MessageCardProps) {
  const isToolMessage = message.content.startsWith("TOOL_CALL:");
  const isUser = message.role === "user";

  // Chatbot-style bubbles for regular text messages (user/assistant)
  if (!isToolMessage && (message.role === "user" || message.role === "assistant")) {
    return (
      <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        <div className="w-full flex justify-center px-4 lg:px-0">
          <div
            className="relative max-w-2xl w-full"
            style={{ maxWidth: 900 }}
          >
            {/* Label */}
            <div
              className={`flex items-center mb-1 text-xs text-white/60 ${
                isUser ? "justify-end" : "justify-start"
              }`}
              style={{ minHeight: 18 }}
            >
              {isUser ? (
                <>
                  <span>You</span>
                  <svg
                    className="ml-1"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                  </svg>
                </>
              ) : (
                <>
                  <svg
                    className="mr-1"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="10" rx="4" />
                    <circle cx="7.5" cy="16" r="1.5" />
                    <circle cx="16.5" cy="16" r="1.5" />
                    <path d="M12 2v4m-6 4V6m12 4V6" />
                  </svg>
                  <span>Assistant</span>
                </>
              )}
            </div>

            {/* Bubble with full glassmorphism effect — sharp corner: user = bottom-right, assistant = bottom-left */}
            <div
              className={`rounded-3xl px-5 py-4 shadow-lg transition-colors duration-300 backdrop-blur-xl ring-1 ring-white/10 ${
                isUser
                  ? "rounded-br-none bg-[#3C2780]/70 text-white shadow-[0_18px_45px_-20px_rgba(60,39,128,0.9)]"
                  : "rounded-bl-none bg-white/8 text-white shadow-[0_18px_45px_-20px_rgba(0,0,0,0.85)]"
              }`}
            >
              <div className={compact ? "text-sm" : "text-sm md:text-base"}>
                <p className="text-white leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card layout for tool calls — той самий контейнер, що й бульбашки (картки на рівні з повідомленнями)
  const wrapperJustify =
    message.role === "user"
      ? "justify-end"
      : isToolMessage && compact
      ? "justify-center"
      : "justify-start";

  const cardClassName = `w-full backdrop-blur-xl transition-all duration-200 text-white ${
    message.role === "user"
      ? "bg-white/[0.12] border-white/[0.2] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
      : "bg-white/[0.06] border-white/[0.12] shadow-xl shadow-purple-500/5 hover:shadow-purple-500/15 ring-1 ring-inset ring-white/[0.05]"
  }`;

  return (
    <div className={`flex w-full ${wrapperJustify} mb-4`}>
      <div className="w-full flex justify-center px-4 lg:px-0">
        <div
          className="relative max-w-2xl w-full"
          style={{ maxWidth: 900 }}
        >
          <Card className={cardClassName}>
            <CardContent
              className={
                compact
                  ? "p-2"
                  : isToolMessage
                  ? "px-2 py-4 sm:p-4 lg:p-5 xl:p-6"
                  : "p-4 lg:p-5 xl:p-6"
              }
            >
              <ToolCallMessageRenderer
                content={message.content}
                onUserAction={onUserAction}
                messageId={message._id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}