"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion, AnimatePresence } from "framer-motion";
import LuminaGradientBackground from "@/components/LuminaGradientBackground";

type OnboardingStep = "greeting" | "ask_name" | "ask_email" | "creating" | "done";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface OnboardingChatProps {
  onComplete: () => void;
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const { signIn } = useAuthActions();
  const makeMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [step, setStep] = useState<OnboardingStep>("greeting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(true);
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: makeMessageId(), role: "assistant", content },
      ]);
      setTimeout(scrollToBottom, 100);
    }, 800 + Math.random() * 400);
  }, [scrollToBottom]);

  useEffect(() => {
    if (step === "greeting") {
      setTimeout(() => {
        addAssistantMessage(
          "Hi! Welcome to Cieden. I'm your AI design assistant. Before we begin, could you please tell me your name?"
        );
        setStep("ask_name");
        setTimeout(() => {
          setInputDisabled(false);
          inputRef.current?.focus();
        }, 1400);
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async () => {
    const value = inputValue.trim();
    if (!value || inputDisabled) return;

    setMessages((prev) => [
      ...prev,
      { id: makeMessageId(), role: "user", content: value },
    ]);
    setInputValue("");
    setInputDisabled(true);

    if (step === "ask_name") {
      setUserName(value);
      setStep("ask_email");
      setTimeout(() => {
        addAssistantMessage(
          `Nice to meet you, ${value}! Now, could you share your email? Our team might reach out to discuss your project.`
        );
        setTimeout(() => {
          setInputDisabled(false);
          inputRef.current?.focus();
        }, 1400);
      }, 300);
      return;
    }

    if (step === "ask_email") {
      const email = value;
      setStep("creating");

      setTimeout(() => {
        addAssistantMessage(
          `Thank you, ${userName}! Setting everything up for you...`
        );
      }, 300);

      try {
        const generatedPassword = `cieden_guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        await signIn("password", {
          email,
          password: generatedPassword,
          name: userName,
          flow: "signUp",
        });

        setStep("done");
        setTimeout(onComplete, 1500);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes("already exists") || errorMsg.includes("Could not create")) {
          const fallbackPassword = `cieden_${Date.now()}`;
          try {
            await signIn("password", {
              email: `${email.split("@")[0]}+${Date.now()}@${email.split("@")[1] || "cieden.guest"}`,
              password: fallbackPassword,
              name: userName,
              flow: "signUp",
            });
            setStep("done");
            setTimeout(onComplete, 1500);
            return;
          } catch {
            // fall through
          }
        }

        setStep("ask_email");
        addAssistantMessage(
          "Hmm, something went wrong. Could you try a different email address?"
        );
        setTimeout(() => {
          setInputDisabled(false);
          inputRef.current?.focus();
        }, 1400);
      }
    }
  }, [inputValue, inputDisabled, step, userName, addAssistantMessage, signIn, onComplete]);

  return (
    <div className="min-h-screen relative flex flex-col">
      <LuminaGradientBackground />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-center py-6">
          <h1 className="text-white/80 text-lg font-medium tracking-wide">
            Cieden AI Assistant
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm sm:text-base ${
                      msg.role === "user"
                        ? "bg-white/10 text-white border border-white/10"
                        : "bg-white/5 text-white/90 border border-white/5"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white/50 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </div>
              </motion.div>
            )}

            {step === "creating" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-4"
              >
                <div className="text-white/40 text-sm">Setting up your session...</div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex gap-3"
            >
              <input
                ref={inputRef}
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
        </div>
      </div>
    </div>
  );
}
