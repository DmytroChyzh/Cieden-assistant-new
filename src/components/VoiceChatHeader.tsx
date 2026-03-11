"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, LogOut, Settings, User } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface HeaderMenuProps {
  onClearHistory?: () => void;
  onSignOut?: () => void;
  clearing?: boolean;
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
  clearing,
}: VoiceChatHeaderProps) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-20 w-full h-24 transition-all duration-300",
        "bg-black/50 backdrop-blur-md",
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

      {/* Right: trash, avatar (user menu) */}
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

        <Popover open={avatarOpen} onOpenChange={setAvatarOpen}>
          <PopoverTrigger asChild>
            <div
              className="rounded-full flex items-center justify-center cursor-pointer w-8 h-8 lg:w-9 lg:h-9 border border-white/30 bg-white/10 text-white hover:bg-white/15 transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setAvatarOpen((v) => !v)}
              aria-label="User menu"
            >
              <User className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 bg-slate-800/95 backdrop-blur-sm border-white/20 text-white p-2"
            align="end"
          >
            {currentUser ? (
              <>
                <div className="px-3 pb-1">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <p className="text-xs text-white/60 truncate">{currentUser.email}</p>
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSettingsOpen();
                      setAvatarOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded text-sm"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onSignOut();
                        setAvatarOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded text-sm"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="px-3 py-2">
                <p className="text-sm text-white/60">Loading...</p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
