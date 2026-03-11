"use client";

import { motion } from 'framer-motion';
import { X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import type { Settings } from './hooks/useSettings';

interface ConversationVisualsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onClose: () => void;
  inSidebar?: boolean;
}

export function ConversationVisualsPanel({
  settings,
  onUpdateSettings,
  onClose,
  inSidebar = false,
}: ConversationVisualsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use 'mouseup' instead of 'mousedown' to allow button clicks to complete
    const timeoutId = setTimeout(() => {
      document.addEventListener('mouseup', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed z-[70]",
        inSidebar ? "right-0 top-[56px] bottom-0 w-[360px]" : "inset-0 flex items-center justify-center"
      )}
    >
      {/* Backdrop (centered modal only) */}
      {!inSidebar && <div className="absolute inset-0 bg-black/50" onClick={onClose} />}

      {/* Panel */}
      <div
        ref={panelRef}
        data-panel="conversation-visuals"
        className={cn(
          inSidebar
            ? "relative w-full h-full bg-black/90 backdrop-blur-2xl backdrop-saturate-150 border-l border-white/20 rounded-none shadow-2xl"
            : "relative w-full max-w-[428px] max-h-[80vh] bg-black/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 rounded-3xl shadow-2xl mx-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Conversation Visuals</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </motion.button>
        </div>

        {/* Content */}
        <div className={cn(
          "px-6 py-6 space-y-6 overflow-y-auto scrollbar-drawer",
          inSidebar ? "h-[calc(100vh-56px-56px)]" : "max-h-[calc(80vh-88px)]"
        )}>
          {/* Waveform Placement */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-white/80">Waveform Placement</div>
            <div className="text-xs text-white/60 -mt-1">Choose where the voice waveform appears</div>
            <div className="grid grid-cols-2 gap-2">
              {(['over-input', 'bottom-left', 'bottom-right', 'off'] as const).map(placement => (
                <motion.button
                  key={placement}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUpdateSettings({ 
                    visuals: { ...(settings.visuals || {}), waveformPlacement: placement } 
                  })}
                  className={cn(
                    "px-3 py-3 rounded-lg text-sm transition-all duration-200",
                    settings.visuals?.waveformPlacement === placement 
                      ? "bg-white/20 text-white border border-white/30" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                  )}
                >
                  {placement === 'over-input' ? 'Over Input' : 
                   placement === 'bottom-left' ? 'Bottom Left' :
                   placement === 'bottom-right' ? 'Bottom Right' : 'Off'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Waveforms Visibility */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-white/80">Waveforms Visibility</div>
            <div className="text-xs text-white/60 -mt-1">Control when waveforms are shown</div>
            <div className="grid grid-cols-2 gap-2">
              {(['active', 'always'] as const).map(v => (
                <motion.button
                  key={v}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUpdateSettings({
                    visuals: { ...(settings.visuals || {}), waveformsVisibility: v }
                  })}
                  className={cn(
                    "px-3 py-3 rounded-lg text-sm transition-all duration-200",
                    (settings.visuals?.waveformsVisibility ?? 'active') === v
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                  )}
                >
                  {v === 'always' ? 'Always' : 'On Call'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Visual Effects */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-white/80">Visual Effects</div>
            <div className="space-y-3">
              {/* Side Gradients */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onUpdateSettings({ 
                  visuals: { ...(settings.visuals || {}), showSideGradients: !(settings.visuals?.showSideGradients ?? true) } 
                })}
                className={cn(
                  "w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200",
                  (settings.visuals?.showSideGradients ?? true) 
                    ? "bg-white/15 border border-white/20" 
                    : "bg-white/5 border border-white/10"
                )}
              >
                <div>
                  <div className="text-sm text-white">Side Gradients</div>
                  <div className="text-xs text-white/50 mt-0.5">Animated left & right glows</div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  (settings.visuals?.showSideGradients ?? true) ? "bg-blue-400" : "bg-white/30"
                )} />
              </motion.button>

              {/* Center Bar */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onUpdateSettings({ 
                  visuals: { ...(settings.visuals || {}), showCenterGradient: !(settings.visuals?.showCenterGradient ?? false) } 
                })}
                className={cn(
                  "w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200",
                  (settings.visuals?.showCenterGradient ?? false) 
                    ? "bg-white/15 border border-white/20" 
                    : "bg-white/5 border border-white/10"
                )}
              >
                <div>
                  <div className="text-sm text-white">Center Bar</div>
                  <div className="text-xs text-white/50 mt-0.5">Animated link connection</div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  (settings.visuals?.showCenterGradient ?? false) ? "bg-blue-400" : "bg-white/30"
                )} />
              </motion.button>

              {/* Header Strip */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onUpdateSettings({ 
                  visuals: { ...(settings.visuals || {}), showHeaderStrip: !(settings.visuals?.showHeaderStrip ?? false) } 
                })}
                className={cn(
                  "w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200",
                  (settings.visuals?.showHeaderStrip ?? false) 
                    ? "bg-white/15 border border-white/20" 
                    : "bg-white/5 border border-white/10"
                )}
              >
                <div>
                  <div className="text-sm text-white">Header Strip</div>
                  <div className="text-xs text-white/50 mt-0.5">Animated top bar indicator</div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  (settings.visuals?.showHeaderStrip ?? false) ? "bg-blue-400" : "bg-white/30"
                )} />
              </motion.button>
            </div>
          </div>

          {/* Style Variants */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-white/80">Style Variants</div>
            
            {/* Gradient Variant */}
            <div className="space-y-2">
              <div className="text-xs text-white/60">Gradient Style</div>
              <div className="flex gap-2">
                {(['default', 'alt'] as const).map(v => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdateSettings({ 
                      visuals: { ...(settings.visuals || {}), gradientVariant: v } 
                    })}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-lg text-sm capitalize transition-all duration-200",
                      settings.visuals?.gradientVariant === v 
                        ? "bg-white/20 text-white border border-white/30" 
                        : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {v === 'default' ? 'Classic' : 'Alternative'}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Waveform Variant */}
            <div className="space-y-2">
              <div className="text-xs text-white/60">Waveform Style</div>
              <div className="flex gap-2">
                {(['default', 'compact'] as const).map(v => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdateSettings({ 
                      visuals: { ...(settings.visuals || {}), waveformVariant: v } 
                    })}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-lg text-sm capitalize transition-all duration-200",
                      settings.visuals?.waveformVariant === v 
                        ? "bg-white/20 text-white border border-white/30" 
                        : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {v === 'default' ? 'Standard' : 'Compact'}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}