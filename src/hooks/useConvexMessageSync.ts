import { useMemo, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { Role, TextMessage } from '@copilotkit/runtime-client-gql';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface UseConvexMessageSyncProps {
  conversationId: Id<"conversations"> | null;
}

export function useConvexMessageSync({ conversationId }: UseConvexMessageSyncProps) {
  // Get messages from Convex
  const convexMessages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : 'skip'
  );

  // Memoize message conversion function for better performance
  const convertMessage = useCallback((convexMessage: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const copilotRole = convexMessage.role === 'assistant' ? Role.Assistant : Role.User;
    
    // Check if message has chart metadata from MCP tool call
    const hasChartMetadata = convexMessage.metadata && (
      convexMessage.metadata.chartId || 
      convexMessage.metadata.mcpTool?.includes('Chart')
    );
    
    let messageContent = convexMessage.content;
    
    // If message has chart metadata, enhance it with chart info
    if (hasChartMetadata) {
      const chartType = convexMessage.metadata.chartType || 'chart';
      messageContent += `\n\n🎯 **Chart created successfully!** View your ${chartType} chart above this message.`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Chart message detected:`, {
          chartId: convexMessage.metadata.chartId,
          chartType: convexMessage.metadata.chartType,
          mcpTool: convexMessage.metadata.mcpTool
        });
      }
    }
    
    return new TextMessage({
      id: convexMessage._id,
      content: messageContent,
      role: copilotRole,
    });
  }, []);

  // Convert Convex messages to CopilotKit format - optimize dependencies
  const copilotMessages = useMemo(() => {
    // Handle all loading states: undefined (loading), null (no data), empty array
    if (!convexMessages?.length) return [];

    if (process.env.NODE_ENV === 'development') {
      console.log(`📨 Converting ${convexMessages.length} Convex messages to CopilotKit format`);
    }

    return convexMessages
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(convertMessage);
  }, [convexMessages, convertMessage]);

  return {
    convexMessages,
    copilotMessages,
    syncedCount: convexMessages?.length || 0,
  };
}