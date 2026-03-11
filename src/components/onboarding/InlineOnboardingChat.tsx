"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import type { ChatbotMessage } from "@/src/chatbot-ui";
import { ChatWindow } from "@/src/chatbot-ui/ChatWindow";

interface InlineOnboardingChatProps {
  onComplete: () => void;
}

type OnboardingStep = "ask_name" | "ask_email" | "creating" | "done";

export function InlineOnboardingChat({ onComplete }: InlineOnboardingChatProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<OnboardingStep>("ask_name");
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(true);
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const makeMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId(),
          role: "assistant",
          content,
          timestamp: Date.now(),
        },
      ]);
      setTimeout(scrollToBottom, 100);
    }, 700);
  }, [scrollToBottom]);

  // Initial greeting
  useEffect(() => {
    setMessages([
      {
        id: makeMessageId(),
        role: "assistant",
        content:
          "Hi! Welcome to Cieden. I'm your AI design assistant. Before we begin, could you please tell me your name?",
        timestamp: Date.now(),
      },
    ]);
    setTimeout(() => {
      setInputDisabled(false);
    }, 600);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const value = inputValue.trim();
      if (!value || inputDisabled) return;

      const userMessage: ChatbotMessage = {
        id: makeMessageId(),
        role: "user",
        content: value,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setInputDisabled(true);

      if (step === "ask_name") {
        setUserName(value);
        setStep("ask_email");
        addAssistantMessage(
          `Nice to meet you, ${value}! Now, could you share your email? Our team might reach out to discuss your project.`,
        );
        setTimeout(() => setInputDisabled(false), 1000);
        return;
      }

      if (step === "ask_email") {
        const email = value;
        setStep("creating");
        addAssistantMessage(`Thank you, ${userName}! Setting everything up for you...`);

        try {
          const generatedPassword = `cieden_guest_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

          await signIn("password", {
            email,
            password: generatedPassword,
            name: userName,
            flow: "signUp",
          });

          setStep("done");
          onComplete();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes("already exists") || errorMsg.includes("Could not create")) {
            // Fallback: try sign up with modified email so we always get a fresh guest record
            const parts = email.split("@");
            const local = parts[0] || "guest";
            const domain = parts[1] || "cieden.guest";
            const fallbackEmail = `${local}+${Date.now()}@${domain}`;
            const fallbackPassword = `cieden_${Date.now()}`;
            try {
              await signIn("password", {
                email: fallbackEmail,
                password: fallbackPassword,
                name: userName,
                flow: "signUp",
              });
              setStep("done");
              onComplete();
              return;
            } catch {
              // fall through to error message
            }
          }

          setStep("ask_email");
          addAssistantMessage(
            "Hmm, something went wrong. Could you try a different email address?",
          );
          setTimeout(() => setInputDisabled(false), 1000);
        }
      }
    },
    [inputValue, inputDisabled, step, userName, addAssistantMessage, signIn, onComplete],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatWindow
        messages={messages}
        userName={userName || "You"}
        isLoading={isTyping || step === "creating"}
        messagesEndRef={messagesEndRef}
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[900px] mx-auto px-4 pb-4 flex gap-3"
        style={{ marginTop: "auto" }}
      >
        <input
          type={step === "ask_email" ? "email" : "text"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={inputDisabled || step === "creating" || step === "done"}
          placeholder={
            step === "ask_name"
              ? "Type your name..."
              : step === "ask_email"
              ? "your@email.com"
              : "..."
          }
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:opacity-40 transition-all text-sm sm:text-base"
          autoComplete={step === "ask_email" ? "email" : "off"}
        />
        <button
          type="submit"
          disabled={inputDisabled || !inputValue.trim() || step === "creating" || step === "done"}
          className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl px-5 py-3 transition-all disabled:opacity-30 disabled:hover:bg-white/10 text-sm sm:text-base font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}

