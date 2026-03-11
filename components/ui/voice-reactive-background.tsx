"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VoiceReactiveBackgroundProps {
  voiceStatus: 'idle' | 'connecting' | 'listening' | 'speaking';
  isUserSpeaking?: boolean;
  isAgentSpeaking?: boolean;
  userAudioLevel?: number;
  agentAudioLevel?: number;
  showLeftGradient?: boolean;
  showRightGradient?: boolean;
  showCenterGradient?: boolean;
  gradientVariant?: 'default' | 'alt';
}

export function VoiceReactiveBackground({
  voiceStatus,
  isUserSpeaking = false,
  isAgentSpeaking = false,
  userAudioLevel = 0,
  agentAudioLevel = 0,
  showLeftGradient = true,
  showRightGradient = true,
  showCenterGradient = false,
  gradientVariant = 'default'
}: VoiceReactiveBackgroundProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Both user and agent speaking states are now passed as reliable props
  const isVoiceActive = voiceStatus !== 'idle';
  
  // Calculate animation intensity based on audio levels - scale up for better visibility
  const userIntensity = Math.min(userAudioLevel * 3, 1); // Increased multiplier for better visibility
  const agentIntensity = Math.min(agentAudioLevel * 3, 1); // Increased multiplier

  // Only show animations when voice is active
  useEffect(() => {
    setIsVisible(isVoiceActive);
  }, [isVoiceActive]);

  const leftColors = gradientVariant === 'alt'
    ? [
        (0.8 + agentIntensity * 0.2),
        (0.6 + agentIntensity * 0.2),
        (0.4 + agentIntensity * 0.2)
      ]
    : [
        (0.8 + agentIntensity * 0.2),
        (0.6 + agentIntensity * 0.2),
        (0.4 + agentIntensity * 0.2)
      ];

  const rightColors = gradientVariant === 'alt'
    ? [
        (0.8 + userIntensity * 0.2),
        (0.6 + userIntensity * 0.2),
        (0.4 + userIntensity * 0.2)
      ]
    : [
        (0.8 + userIntensity * 0.2),
        (0.6 + userIntensity * 0.2),
        (0.4 + userIntensity * 0.2)
      ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* User Side Animation (Right) */}
      {showRightGradient && (
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isUserSpeaking ? 1.0 : 0,
        }}
        transition={{
          opacity: { duration: 0.3, ease: "easeInOut" },
        }}
      >
        <motion.div
          className="absolute right-0 top-0 h-full w-1/3 sm:w-20 md:w-16 lg:w-12"
          style={{
            background: `radial-gradient(ellipse at center right, 
              rgba(34, 74, 215, ${rightColors[0]}) 0%, 
              rgba(202, 64, 219, ${rightColors[1]}) 30%, 
              rgba(118, 69, 217, ${rightColors[2]}) 50%,
              transparent 80%)`,
            filter: 'blur(15px)',
          }}
          animate={{
            scale: isUserSpeaking ? [1, 1.05, 1] : 1,
            opacity: isUserSpeaking ? [0.8, 1, 0.8] : 0,
          }}
          transition={{
            scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </motion.div>
      )}

      {/* Agent Side Animation (Left) */}
      {showLeftGradient && (
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isAgentSpeaking ? 1.0 : 0,
        }}
        transition={{
          opacity: { duration: 0.3, ease: "easeInOut" },
        }}
      >
        <motion.div
          className="absolute left-0 top-0 h-full w-1/3 sm:w-20 md:w-16 lg:w-12"
          style={{
            background: `radial-gradient(ellipse at center left, 
              rgba(168, 85, 247, ${leftColors[0]}) 0%, 
              rgba(124, 58, 237, ${leftColors[1]}) 30%, 
              rgba(79, 70, 229, ${leftColors[2]}) 50%,
              transparent 80%)`,
            filter: 'blur(15px)',
          }}
          animate={{
            scale: isAgentSpeaking ? [1, 1.08, 1] : 1,
            opacity: isAgentSpeaking ? [0.7, 1, 0.7] : 0,
          }}
          transition={{
            scale: { duration: 1.0, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </motion.div>
      )}

      {/* Central Connecting Animation - only when both are active */}
      {showCenterGradient && (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isVoiceActive && (isUserSpeaking || isAgentSpeaking) ? 0.6 : 0,
        }}
        transition={{
          opacity: { duration: 0.5, ease: "easeInOut" },
        }}
      >
        <motion.div
          className="w-1/2 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, 
              rgba(168, 85, 247, 0.6) 0%, 
              rgba(34, 74, 215, 0.6) 100%)`,
            filter: 'blur(8px)',
          }}
          animate={{
            scaleX: isVoiceActive ? [0.5, 1, 0.5] : 0.5,
            scaleY: isVoiceActive ? [1, 2, 1] : 1,
          }}
          transition={{
            scaleX: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
            scaleY: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </motion.div>
      )}
    </div>
  );
}