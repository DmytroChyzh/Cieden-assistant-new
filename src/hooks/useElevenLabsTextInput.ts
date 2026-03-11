import { useState, useCallback, useEffect } from 'react';

interface UseElevenLabsTextInputProps {
  sendUserMessage?: (text: string) => void;
  sendUserActivity?: () => void;
}

interface UseElevenLabsTextInputReturn {
  textInput: string;
  isTyping: boolean;
  setTextInput: (text: string) => void;
  handleInputChange: (text: string) => void;
  handleSubmit: () => void;
  canSend: boolean;
}

/**
 * Hook for handling text input with ElevenLabs SDK integration
 * Manages typing state, activity notifications, and message sending
 */
export function useElevenLabsTextInput({
  sendUserMessage,
  sendUserActivity
}: UseElevenLabsTextInputProps): UseElevenLabsTextInputReturn {
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle input change with activity notification
  const handleInputChange = useCallback((text: string) => {
    setTextInput(text);
    
    // Start typing state if not already typing
    if (!isTyping) {
      setIsTyping(true);
      // Notify ElevenLabs that user is typing to prevent interruption
      if (sendUserActivity) {
        sendUserActivity();
      }
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing state
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000); // Stop typing state after 2 seconds of inactivity
    
    setTypingTimeout(timeout);
  }, [isTyping, sendUserActivity, typingTimeout]);

  // Handle message submission
  const handleSubmit = useCallback(() => {
    if (!textInput.trim() || !sendUserMessage) {
      return;
    }

    const messageText = textInput.trim();
    console.log('📤 Submitting text message to ElevenLabs:', messageText);
    
    // Send message via ElevenLabs SDK
    sendUserMessage(messageText);
    
    // Clear input and reset state
    setTextInput('');
    setIsTyping(false);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  }, [textInput, sendUserMessage, typingTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  const canSend = Boolean(textInput.trim() && sendUserMessage);

  return {
    textInput,
    isTyping,
    setTextInput,
    handleInputChange,
    handleSubmit,
    canSend
  };
}