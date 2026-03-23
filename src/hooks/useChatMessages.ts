"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCopilotReadable } from "@copilotkit/react-core";
import { getGuestIdentityFromCookie } from "@/src/utils/guestIdentity";

interface UseChatMessagesProps {
  conversationId: Id<"conversations"> | null;
}

export function useChatMessages({ conversationId }: UseChatMessagesProps) {
  const guestIdentity = getGuestIdentityFromCookie();
  const guestId = guestIdentity?.guestId;

  // Get messages from Convex
  const messages = useQuery(
    api.messages.list, 
    conversationId
      ? {
          conversationId,
          ...(guestId ? { guestId } : {}),
        }
      : "skip"
  );

  const sendMessage = useMutation(api.messages.send);

  // Make messages readable to CopilotKit for context
  useCopilotReadable({
    description: "Previous conversation messages including voice transcripts from ElevenLabs",
    value: messages?.map(msg => ({
      role: msg.role,
      content: msg.content,
      source: msg.source, // voice or text
      timestamp: new Date(msg.createdAt).toISOString()
    })) || [],
  });

  return {
    convexMessages: messages || [],
    isLoading: messages === undefined,
    sendMessage,
  };
}