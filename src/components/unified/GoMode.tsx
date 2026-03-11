"use client";

import { motion } from 'framer-motion';
import { Mic, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaveformVisualizer } from './WaveformVisualizer';

interface GoModeProps {
  isRecording: boolean;
  voiceStatus: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  waveformData: number[];
  onExitGoMode: () => void;
}

export function GoMode({
  isRecording,
  voiceStatus,
  onStartRecording,
  onStopRecording,
  waveformData,
  onExitGoMode
}: GoModeProps) {
  const handleMainAction = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="relative p-4 pb-8"
    >
      {/* Exit Go Mode button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onExitGoMode}
        className={cn(
          "absolute top-4 right-4 p-3",
          "bg-white/10 backdrop-blur-xl",
          "border border-white/20",
          "rounded-full",
          "shadow-xl"
        )}
      >
        <X className="w-6 h-6 text-white/70" />
      </motion.button>

      <div className="space-y-4">
        {/* Main Voice Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMainAction}
          className={cn(
            "relative w-full h-24",
            "backdrop-blur-xl backdrop-saturate-150",
            "border-2",
            "rounded-3xl",
            "shadow-2xl",
            "transition-all duration-300",
            "overflow-hidden",
            isRecording ? (
              "bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50"
            ) : (
              "bg-white/10 border-white/30 hover:bg-white/15"
            )
          )}
        >
          {/* Waveform background when recording */}
          {isRecording && (
            <div className="absolute inset-0 opacity-30">
              <WaveformVisualizer data={waveformData} isActive={isRecording} />
            </div>
          )}

          <div className="relative flex flex-col items-center justify-center h-full">
            <motion.div
              animate={isRecording ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={{
                duration: 2,
                repeat: isRecording ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="flex items-center gap-3"
            >
              {isRecording ? (
                <>
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xl font-semibold text-white">
                    RECORDING
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 text-white" />
                  <span className="text-xl font-semibold text-white">
                    TAP TO SPEAK
                  </span>
                </>
              )}
            </motion.div>
            
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/60 mt-2"
              >
                Tap to stop
              </motion.div>
            )}
          </div>
        </motion.button>

        {/* Stop Recording Button (only when recording) */}
        {isRecording && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStopRecording}
            className={cn(
              "w-full h-20",
              "bg-gradient-to-r from-orange-500/20 to-red-500/20",
              "backdrop-blur-xl backdrop-saturate-150",
              "border-2 border-orange-500/50",
              "rounded-3xl",
              "shadow-xl",
              "flex items-center justify-center gap-3"
            )}
          >
            <Square className="w-6 h-6 text-white fill-white" />
            <span className="text-lg font-medium text-white">
              STOP
            </span>
          </motion.button>
        )}

      </div>

      {/* Status text */}
      {voiceStatus !== 'idle' && !isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 left-0 right-0 text-center"
        >
          <span className="text-sm text-white/50">
            {voiceStatus}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}