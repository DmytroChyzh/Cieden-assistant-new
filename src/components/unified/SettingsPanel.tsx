"use client";

import { motion, PanInfo, useDragControls } from 'framer-motion';
import { X, Car, Mic, Globe, Zap, Subtitles, ChevronDown, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed unused Switch and Slider imports
import { useEffect, useRef, useState } from 'react';
import type { Settings } from './hooks/useSettings';
import { ConversationVisualsPanel } from './ConversationVisualsPanel';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onClose: () => void;
  onToggleGoMode: () => void;
  isDesktop?: boolean;
  isVisible?: boolean;
}

const VOICES = [
  { id: '', name: 'Jessica (Default)', type: 'Agent default (no override)' },
  { id: 'zubqz6JC54rePKNCKZLG', name: 'Jess', type: 'Custom voice' },
  { id: 'ys3XeJJA4ArWMhRpcX1D', name: 'Sue', type: 'Custom voice' },
  { id: 'bu5eKETbFKC8G702EAU4', name: 'Liam', type: 'Custom voice' },
  { id: 'wSO34DbFKBGmeCNpJL5K', name: 'JW', type: 'Custom voice' }
];

const LANGUAGES = [
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { id: 'en-US', name: 'English', flag: '🇺🇸' },
  { id: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
  { id: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
  { id: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
];

const SPEED_PRESETS = [
  { id: 1, name: 'Slow', speed: 0.85, description: 'Clear & deliberate' },
  { id: 2, name: 'Normal', speed: 1.0, description: 'Natural pace' },
  { id: 3, name: 'Fast', speed: 1.15, description: 'Quick & efficient' },
  { id: 4, name: 'Auto-Adapt', speed: null, description: 'Use agent default' }
];

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
  onToggleGoMode,
  isDesktop = false,
  isVisible = true
}: SettingsPanelProps) {
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const voiceScrollRef = useRef<HTMLDivElement>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showVisualsPanel, setShowVisualsPanel] = useState(false);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is on the settings panel or the visuals panel
      const target = event.target as Node;
      const isInsideSettingsPanel = panelRef.current && panelRef.current.contains(target);
      const visualsPanel = document.querySelector('[data-panel="conversation-visuals"]');
      const isInsideVisualsPanel = visualsPanel && visualsPanel.contains(target);
      
      if (!isInsideSettingsPanel && !isInsideVisualsPanel) {
        onClose();
      }
    };

    // Use 'mouseup' instead of 'mousedown' to allow button clicks to complete
    // Add a small delay to ensure the event is added after the component mounts
    const timeoutId = setTimeout(() => {
      document.addEventListener('mouseup', handleClickOutside);
    }, 100);
    
    // Cleanup event listener
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, [onClose]);

  // Scroll selected voice into view
  const scrollToVoice = (voiceId: string) => {
    const container = voiceScrollRef.current;
    if (!container) return;

    const voiceIndex = VOICES.findIndex(v => v.id === voiceId);
    if (voiceIndex === -1) return;

    // Calculate scroll position to center the selected voice
    const voiceButtons = container.children;
    if (voiceIndex < voiceButtons.length) {
      const targetButton = voiceButtons[voiceIndex] as HTMLElement;
      const containerWidth = container.offsetWidth;
      const buttonWidth = targetButton.offsetWidth;
      const buttonLeft = targetButton.offsetLeft;
      
      // Calculate the scroll position to center the button
      const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll to selected voice when panel opens
  useEffect(() => {
    if (settings.voice) {
      // Small delay to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        scrollToVoice(settings.voice);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [settings.voice]); // Run when voice selection changes

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -100) {
      onClose();
    }
  };

  // Handle voice selection with auto-scroll
  const handleVoiceSelect = (voiceId: string) => {
    onUpdateSettings({ voice: voiceId });
    scrollToVoice(voiceId);
  };

  const handleSpeedPresetSelect = (presetId: number) => {
    const preset = SPEED_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    onUpdateSettings({
      speedPreset: preset.id,
      speed: preset.speed ?? null
    });
  };

  if (isDesktop && !isVisible) return null;

  return (
    <>
    <motion.div
      initial={isDesktop ? { x: '100%' } : { y: '100%' }}
      animate={isDesktop ? { x: 0 } : { y: 0 }}
      exit={isDesktop ? { x: '100%' } : { y: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      drag={isDesktop ? undefined : "y"}
      dragControls={isDesktop ? undefined : dragControls}
      dragConstraints={isDesktop ? undefined : { top: 0, bottom: 0 }}
      dragElastic={isDesktop ? undefined : 0.2}
      onDragEnd={isDesktop ? undefined : handleDragEnd}
      ref={panelRef}
      data-panel="settings-root"
      className={cn(
        isDesktop
          ? "fixed right-0 top-[56px] bottom-0 z-[60] w-[360px]"
          : "fixed inset-x-0 bottom-0 top-[20%] z-[60] max-w-[428px] mx-auto",
        "bg-black/90 backdrop-blur-2xl backdrop-saturate-150",
        isDesktop ? "border-l border-t border-white/20 rounded-tl-3xl rounded-tr-3xl" : "border-t border-white/20 rounded-t-3xl",
        "shadow-2xl"
      )}
    >
      {/* Drag handle (mobile only) */}
      {!isDesktop && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>
      )}

      {/* Header */}
      <div className={cn("flex items-center justify-between px-6 pb-4", isDesktop && "pt-4")}>
        <h2 className="text-xl font-semibold text-white">Voice Settings</h2>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white/70" />
        </motion.button>
      </div>

      {/* Settings content */}
      <div className={cn(
        "px-6 space-y-6 overflow-y-auto scrollbar-drawer pb-8",
        isDesktop ? "h-[calc(100vh-56px-56px)]" : "max-h-[70vh]"
      )}>
        
        {/* Voice Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/70">
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Voice</span>
          </div>
          <div ref={voiceScrollRef} className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {VOICES.map((voice) => (
              <motion.button
                key={voice.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVoiceSelect(voice.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-3",
                  "rounded-xl border",
                  "transition-all duration-200",
                  settings.voice === voice.id ? (
                    "bg-white/20 border-white/40 text-white"
                  ) : (
                    "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                  )
                )}
              >
                <div className="text-sm font-medium">{voice.name}</div>
                <div className="text-xs opacity-60">{voice.type}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Conversation visuals button */}
        <div className="pt-4 border-t border-white/10">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowVisualsPanel(true)}
            className={cn(
              "w-full flex items-center justify-between py-4 px-4 rounded-xl transition-all duration-200",
              "bg-white/5 hover:bg-white/10",
              "border border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-white/70" />
              <div className="text-left">
                <div className="text-white font-medium">Conversation Visuals</div>
                <div className="text-xs text-white/50">Customize waveforms & effects</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 -rotate-90" />
          </motion.button>
        </div>

        {/* Language Selection */}
        <div className="space-y-3 relative">
          <div className="flex items-center gap-2 text-white/70">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Language</span>
          </div>
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className={cn(
                "w-full px-4 py-3 pr-10",
                "bg-white/10 border border-white/20",
                "rounded-xl",
                "text-white text-left",
                "transition-colors",
                "hover:bg-white/15 focus:border-white/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {LANGUAGES.find(lang => lang.id === settings.language)?.flag}
                </span>
                <span>{LANGUAGES.find(lang => lang.id === settings.language)?.name}</span>
              </div>
              <ChevronDown className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 transition-transform",
                showLanguageDropdown && "rotate-180"
              )} />
            </motion.button>
            
            {showLanguageDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "absolute top-full left-0 right-0 mt-2 z-10",
                  "bg-black/95 backdrop-blur-xl",
                  "border border-white/20",
                  "rounded-xl",
                  "shadow-xl shadow-black/50",
                  "overflow-hidden"
                )}
              >
                {LANGUAGES.map((lang) => (
                  <motion.button
                    key={lang.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onUpdateSettings({ language: lang.id });
                      setShowLanguageDropdown(false);
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left",
                      "flex items-center gap-3",
                      "text-white hover:bg-white/10",
                      "transition-colors",
                      settings.language === lang.id && "bg-white/15"
                    )}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Speech Speed Control */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/70">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Speech Speed</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SPEED_PRESETS.map((preset) => (
              <motion.button
                key={preset.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSpeedPresetSelect(preset.id)}
                className={cn(
                  "px-4 py-3",
                  "rounded-xl border",
                  "transition-all duration-200",
                  "text-left",
                  settings.speedPreset === preset.id ? (
                    "bg-white/20 border-white/40 text-white"
                  ) : (
                    "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                  )
                )}
              >
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs opacity-60">{preset.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Live Captions */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpdateSettings({ captions: !settings.captions })}
          className={cn(
            "w-full flex items-center justify-between py-4 px-4 rounded-xl transition-all duration-200",
            "bg-white/5 hover:bg-white/10",
            "border border-transparent",
            settings.captions && "bg-white/15 border-white/20"
          )}
        >
          <div className="flex items-center gap-3">
            <Subtitles className="w-5 h-5 text-white/70" />
            <div className="text-left">
              <div className="text-white font-medium">Live Captions</div>
              <div className="text-xs text-white/50">Show real-time transcripts</div>
            </div>
          </div>
          <motion.div
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              settings.captions ? "bg-blue-500" : "bg-white/20"
            )}
          >
            <motion.div
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              animate={{
                x: settings.captions ? 24 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </motion.div>
        </motion.button>

        {/* On-the-Go Mode */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggleGoMode}
          className={cn(
            "w-full flex items-center justify-between py-4 px-4 rounded-xl transition-all duration-200",
            "bg-white/5 hover:bg-white/10",
            "border border-transparent",
            settings.goMode && "bg-white/15 border-white/20"
          )}
        >
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-white/70" />
            <div className="text-left">
              <div className="text-white font-medium">On-the-Go Mode</div>
              <div className="text-xs text-white/50">Large buttons for driving</div>
            </div>
          </div>
          <motion.div
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              settings.goMode ? "bg-blue-500" : "bg-white/20"
            )}
          >
            <motion.div
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              animate={{
                x: settings.goMode ? 24 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </motion.div>
        </motion.button>

        {/* Quick Actions */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="text-sm font-medium text-white/70">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white/70 transition-colors"
            >
              Personalise
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white/70 transition-colors"
            >
              Go Incognito
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
    
    {/* Conversation Visuals Panel */}
        {showVisualsPanel && (
      <ConversationVisualsPanel
        settings={settings}
        onUpdateSettings={onUpdateSettings}
            onClose={() => setShowVisualsPanel(false)}
            inSidebar={isDesktop}
      />
    )}
    </>
  );
}