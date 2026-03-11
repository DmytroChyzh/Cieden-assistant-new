"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeIndicatorProps {
  mode: 'text' | 'voice' | null;
  connectionType?: 'websocket' | 'webrtc' | null;
  status?: 'active' | 'connecting' | 'transitioning' | 'idle';
  className?: string;
}

export function ModeIndicator({ mode, connectionType, status = 'idle', className }: ModeIndicatorProps) {
  if (!mode) return null;

  const isActive = status === 'active' || status === 'connecting';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
          "bg-background/80 backdrop-blur border shadow-sm",
          isActive && "border-primary",
          className
        )}
      >
        {/* Mode Icon */}
        {mode === 'voice' ? (
          <Mic className="w-3 h-3" />
        ) : (
          <MessageSquare className="w-3 h-3" />
        )}

        {/* Mode Label */}
        <span className="capitalize">{mode} Mode</span>

        {/* Connection Type Indicator */}
        {connectionType && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {connectionType === 'websocket' ? 'WS' : 'RTC'}
            </span>
          </>
        )}

        {/* Status Indicator */}
        {status === 'connecting' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Wifi className="w-3 h-3 text-yellow-500" />
          </motion.div>
        )}

        {status === 'active' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-green-500 rounded-full"
          />
        )}

        {status === 'transitioning' && (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 bg-yellow-500 rounded-full"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}