"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { 
  CopilotChat
} from "@copilotkit/react-ui";

// Define the props interface based on what CopilotChat accepts
interface CopilotChatProps {
  className?: string;
  instructions?: string;
  labels?: {
    title?: string;
    initial?: string;
  };
}
import { X, MessageCircle } from "lucide-react";

interface CustomChatPopupProps extends Omit<CopilotChatProps, 'className'> {
  /**
   * Whether the chat window should be open by default.
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * If the chat window should close when the user clicks outside of it.
   * @default true
   */
  clickOutsideToClose?: boolean;

  /**
   * If the chat window should close when the user hits the Escape key.
   * @default true
   */
  hitEscapeToClose?: boolean;

  /**
   * The shortcut key to open the chat window.
   * @default '/'
   */
  shortcut?: string;

  /**
   * A callback that gets called when the chat window opens or closes.
   */
  onSetOpen?: (open: boolean) => void;
}

export function CustomChatPopup({
  defaultOpen = false,
  clickOutsideToClose = true,
  hitEscapeToClose = true,
  shortcut = "/",
  onSetOpen,
  ...chatProps
}: CustomChatPopupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onSetOpen?.(newOpen);
  }, [isOpen, onSetOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onSetOpen?.(false);
  }, [onSetOpen]);

  // Click outside to close
  useEffect(() => {
    if (!clickOutsideToClose || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clickOutsideToClose, isOpen, handleClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape to close
      if (event.key === "Escape" && hitEscapeToClose && isOpen) {
        const isInsideChat = windowRef.current?.contains(target);
        if (!isInput || isInsideChat) {
          handleClose();
        }
      }

      // Shortcut to toggle (Cmd/Ctrl + shortcut)
      if (
        event.key === shortcut &&
        ((navigator.platform.includes("Mac") && event.metaKey) || 
         (!navigator.platform.includes("Mac") && event.ctrlKey))
      ) {
        const isInsideChat = windowRef.current?.contains(target);
        if (!isInput || isInsideChat) {
          event.preventDefault();
          handleToggle();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcut, hitEscapeToClose, isOpen, handleToggle, handleClose]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Mobile-style popup window */}
      <div
        ref={windowRef}
        className={`
          fixed inset-4 pointer-events-auto
          bg-white dark:bg-gray-900
          rounded-3xl shadow-2xl
          flex flex-col overflow-hidden
          transform transition-all duration-300 ease-in-out
          ${
            isOpen
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 pointer-events-none"
          }
        `}
        style={{
          top: "5%",
          bottom: "5%",
          left: "50%",
          right: "auto",
          transform: `translateX(-50%) ${isOpen ? "scale(1)" : "scale(0.95)"}`,
          width: "min(400px, calc(100vw - 2rem))",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {chatProps.labels?.title || "✨ FinPilot Assistant"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          <CopilotChat
            {...chatProps}
            className="h-full"
          />
        </div>
      </div>

      {/* Floating action button when closed */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="
            fixed bottom-6 right-6 pointer-events-auto
            w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600
            rounded-full shadow-lg hover:shadow-xl
            flex items-center justify-center
            transform transition-all duration-200 ease-in-out
            hover:scale-105 active:scale-95
          "
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}