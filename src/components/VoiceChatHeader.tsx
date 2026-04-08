"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface HeaderMenuProps {
  onClearHistory?: () => void;
  onSignOut?: () => void;
  onNewChat?: () => void;
  clearing?: boolean;
  userName?: string;
  userEmail?: string;
}

interface VoiceChatHeaderProps extends HeaderMenuProps {
  onSettingsOpen: () => void;
  className?: string;
}

/**
 * Header styled like Chatbot (CIEDEN) project: fixed bar, logo left,
 * Start Over + trash + avatar right. FinPilot handlers kept.
 */
export function VoiceChatHeader({
  onSettingsOpen,
  className,
  onClearHistory,
  onSignOut,
  onNewChat,
  clearing,
  userName: _userName,
  userEmail: _userEmail,
}: VoiceChatHeaderProps) {
  void onSettingsOpen;
  void onSignOut;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-20 w-full h-24 transition-all duration-300",
        "bg-[#212121]/25 backdrop-blur-md backdrop-saturate-150",
        "border-b border-white/10 shadow-[0_12px_60px_-30px_rgba(124,58,237,0.45)]",
        "flex items-center justify-between",
        "px-4 lg:px-16",
        className
      )}
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-2">
        <img
          src="/full_logo.svg"
          alt="CIEDEN"
          className="h-5 w-auto lg:h-6 object-contain"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <span className="text-white font-semibold text-sm lg:text-base leading-none relative top-[-1px]">
          assistant
        </span>
      </div>

      {/* Right: chat actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {onClearHistory && (
          <button
            type="button"
            onClick={() => onClearHistory()}
            disabled={clearing}
            className="p-1.5 lg:p-2 text-white/70 hover:text-white transition"
            title="Clear conversation"
            aria-label="Clear history"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lg:w-[18px] lg:h-[18px]"
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M3 7h16" />
            </svg>
          </button>
        )}
        {onNewChat && (
          <button
            type="button"
            onClick={() => onNewChat()}
            className="rounded-full px-3 py-1.5 text-xs lg:text-sm font-medium border border-white/30 bg-white/10 text-white hover:bg-white/15 transition-colors"
            aria-label="New chat"
          >
            New Chat
          </button>
        )}
      </div>
    </header>
  );
}
