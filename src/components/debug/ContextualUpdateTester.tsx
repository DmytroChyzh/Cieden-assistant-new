"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useElevenLabsConversation } from "@/src/providers/ElevenLabsProvider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Send,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  Radio,
  MessageSquare,
  Activity,
  Eye,
  Database,
  Zap
} from "lucide-react";

interface ContextualUpdate {
  id: string;
  content: string;
  timestamp: number;
  mode: 'text' | 'voice';
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  transportType: 'websocket' | 'webrtc' | 'both';
  metadata?: {
    sessionId?: string;
    agentId?: string;
    responseTime?: number;
  };
}

interface ContextualUpdateTesterProps {
  conversationId: Id<"conversations"> | null;
  onLogUpdate?: (message: string) => void;
}

export function ContextualUpdateTester({
  conversationId,
  onLogUpdate
}: ContextualUpdateTesterProps) {
  const [contextText, setContextText] = useState("");
  const [updates, setUpdates] = useState<ContextualUpdate[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // ElevenLabs connection
  const {
    conversation,
    sessionMode,
    isTextConnected,
    sendTextMessage,
    startText,
    startVoice,
    stopText,
    stopVoice
  } = useElevenLabsConversation();

  // Convex mutations for logging
  const createMessage = useMutation(api.messages.create);
  const logDebugEvent = useMutation(api.messages.logDebugEvent);

  // Pre-defined test contexts
  const testContexts = [
    {
      name: "Financial History",
      content: "User has $50,000 in savings, credit score 750, monthly income $8,500. Recently inquired about home loans."
    },
    {
      name: "Navigation Context",
      content: "User is currently on the loan eligibility page. They've viewed personal loans and auto loans. Spent 3 minutes on EMI calculator."
    },
    {
      name: "Previous Q&A",
      content: "User asked: What's my loan eligibility? Agent answered: Based on your income, you qualify for up to $200,000."
    },
    {
      name: "User Preferences",
      content: "User prefers low-risk investments, interested in retirement planning, has two existing loans totaling $45,000."
    }
  ];

  // Send contextual update
  const sendContextualUpdate = async (content: string, transportType: 'websocket' | 'webrtc' | 'both' = 'both') => {
    const updateId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const update: ContextualUpdate = {
      id: updateId,
      content,
      timestamp: Date.now(),
      mode: sessionMode === 'voice' ? 'voice' : 'text',
      status: 'pending',
      transportType,
      metadata: {
        sessionId: conversation?.getId?.(),
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
      }
    };

    setUpdates(prev => [...prev, update]);
    onLogUpdate?.(`📤 Sending contextual update: "${content.substring(0, 50)}..."`);

    try {
      // Send based on transport type
      if (transportType === 'websocket' || transportType === 'both') {
        if (sessionMode === 'text' && isTextConnected) {
          // For text mode, we need to send through WebSocket
          // This is a silent update that won't trigger response
          await sendTextMessage(`[CONTEXT_UPDATE]: ${content}`);
          onLogUpdate?.("✅ Sent via WebSocket (text mode)");
        }
      }

      if (transportType === 'webrtc' || transportType === 'both') {
        if (sessionMode === 'voice' && conversation?.status === 'connected') {
          // For voice mode, use sendContextualUpdate
          if (typeof conversation.sendContextualUpdate === 'function') {
            conversation.sendContextualUpdate(content);
            onLogUpdate?.("✅ Sent via WebRTC (voice mode)");
          } else {
            onLogUpdate?.("⚠️ sendContextualUpdate not available on conversation object");
          }
        }
      }

      // Log to Convex for tracking
      if (conversationId) {
        await createMessage({
          conversationId,
          content: `[DEBUG] Contextual Update: ${content}`,
          role: 'system',
          source: 'contextual',
          metadata: {
            updateId,
            transportType,
            sessionMode,
            timestamp: Date.now(),
            debugType: 'contextual_update'
          }
        });
      }

      // Update status
      setUpdates(prev => prev.map(u =>
        u.id === updateId ? { ...u, status: 'sent' } : u
      ));

    } catch (error) {
      onLogUpdate?.(`❌ Failed to send update: ${error}`);
      setUpdates(prev => prev.map(u =>
        u.id === updateId ? { ...u, status: 'failed' } : u
      ));
    }
  };

  // Monitor connection status
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        const status = {
          mode: sessionMode,
          textConnected: isTextConnected,
          voiceConnected: conversation?.status === 'connected',
          voiceStatus: conversation?.status,
          hasContextualUpdate: typeof conversation?.sendContextualUpdate === 'function'
        };

        console.log('🔍 Connection Monitor:', status);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring, sessionMode, isTextConnected, conversation]);

  // Connection status badge
  const getConnectionBadge = () => {
    if (sessionMode === 'voice' && conversation?.status === 'connected') {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        <Radio className="h-3 w-3 mr-1" />
        Voice Connected
      </Badge>;
    }
    if (sessionMode === 'text' && isTextConnected) {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
        <MessageSquare className="h-3 w-3 mr-1" />
        Text Connected
      </Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">
      <WifiOff className="h-3 w-3 mr-1" />
      Disconnected
    </Badge>;
  };

  const getStatusIcon = (status: ContextualUpdate['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Status
            </CardTitle>
            {getConnectionBadge()}
          </div>
          <CardDescription>
            Monitor and test contextual updates delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Session Mode:</span>
              <span className="ml-2 font-medium">{sessionMode || 'idle'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Conversation ID:</span>
              <span className="ml-2 font-mono text-xs">{conversation?.getId?.() || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">WebSocket:</span>
              <span className="ml-2">{isTextConnected ? '✅' : '❌'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">WebRTC:</span>
              <span className="ml-2">{conversation?.status === 'connected' ? '✅' : '❌'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startText()}
              disabled={sessionMode === 'text'}
            >
              Start Text Session
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startVoice()}
              disabled={sessionMode === 'voice'}
            >
              Start Voice Session
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (sessionMode === 'text') stopText();
                if (sessionMode === 'voice') stopVoice();
              }}
              disabled={sessionMode === 'idle'}
            >
              Stop Session
            </Button>
            <Button
              size="sm"
              variant={isMonitoring ? "destructive" : "outline"}
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Send Context Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Contextual Update
          </CardTitle>
          <CardDescription>
            Send silent context to the agent without triggering a response
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contextText">Context Message</Label>
            <Textarea
              id="contextText"
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Enter context information (e.g., 'User navigated to loans page')"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => sendContextualUpdate(contextText, 'websocket')}
              disabled={!contextText || (!isTextConnected && sessionMode !== 'text')}
              size="sm"
              variant="outline"
            >
              <Wifi className="h-4 w-4 mr-1" />
              Send via WebSocket
            </Button>
            <Button
              onClick={() => sendContextualUpdate(contextText, 'webrtc')}
              disabled={!contextText || (sessionMode !== 'voice' || conversation?.status !== 'connected')}
              size="sm"
              variant="outline"
            >
              <Radio className="h-4 w-4 mr-1" />
              Send via WebRTC
            </Button>
            <Button
              onClick={() => sendContextualUpdate(contextText, 'both')}
              disabled={!contextText || (sessionMode === 'idle')}
              size="sm"
            >
              <Zap className="h-4 w-4 mr-1" />
              Send to Active Transport
            </Button>
          </div>

          {/* Quick Test Contexts */}
          <div>
            <Label>Quick Test Contexts</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {testContexts.map((ctx, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setContextText(ctx.content);
                    sendContextualUpdate(ctx.content);
                  }}
                  className="justify-start"
                >
                  <Database className="h-3 w-3 mr-2" />
                  {ctx.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Update History
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setUpdates([])}
              disabled={updates.length === 0}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No updates sent yet
              </p>
            ) : (
              <div className="space-y-2">
                {updates.reverse().map((update) => (
                  <div
                    key={update.id}
                    className="bg-card p-3 rounded-lg border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(update.status)}
                        <span className="text-sm font-medium">
                          {update.transportType === 'both' ? 'Both' : update.transportType.toUpperCase()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {update.mode}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {update.content}
                    </p>
                    {update.metadata?.sessionId && (
                      <p className="text-xs font-mono text-muted-foreground">
                        Session: {update.metadata.sessionId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}