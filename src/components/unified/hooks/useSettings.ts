"use client";

import { useState, useEffect, useCallback } from 'react';

export type WaveformPlacement = 'over-input' | 'bottom-left' | 'bottom-right' | 'off';

export interface Settings {
  voice: string;
  language: string;
  speed: number | null;
  speedPreset: number;
  captions: boolean;
  goMode: boolean;
  visuals?: {
    waveformPlacement: WaveformPlacement;
    waveformsVisibility?: 'always' | 'active';
    showSideGradients: boolean;
    showCenterGradient: boolean;
    showHeaderStrip: boolean;
    gradientVariant: 'default' | 'alt';
    waveformVariant: 'default' | 'compact';
    // Legacy fields for migration
    showWaveformsHUD?: boolean;
    showWaveformsInInput?: boolean;
  };
}

const LEGACY_VOICE_MAP: Record<string, string> = {
  'young-female': 'kdmDKE6EkgrWrrykO9Qt',
  'mature-female': 'PT4nqlKZfc06VW1BuClj',
  'young-male': 'L0Dsvb3SLTyegXwtm47J',
  'mature-male': '1SM7GgM6IMuvQlz2BwM3'
};

const SPEED_PRESET_VALUES: Record<number, number | null> = {
  1: 0.85,
  2: 1.0,
  3: 1.15,
  4: null
};

// Whitelist of supported voice IDs; empty string denotes "no override" (agent default)
const ALLOWED_VOICE_IDS = new Set<string>([
  '',
  'zubqz6JC54rePKNCKZLG', // Jess
  'ys3XeJJA4ArWMhRpcX1D', // Sue
  'bu5eKETbFKC8G702EAU4', // Liam
  'wSO34DbFKBGmeCNpJL5K'  // JW
]);

const DEFAULT_SETTINGS: Settings = {
  voice: '', // Jessica (Default) - no override
  language: 'hi-IN',
  speed: 1.0,
  speedPreset: 2,
  captions: true,
  goMode: false,
  visuals: {
    waveformPlacement: 'over-input',
    waveformsVisibility: 'active',
    showSideGradients: true,
    showCenterGradient: false,
    showHeaderStrip: false,
    gradientVariant: 'default',
    waveformVariant: 'default'
  }
};

const SETTINGS_KEY = 'finpilot-voice-settings';

const mapSpeedFromPreset = (
  preset: number | undefined,
  fallback: number | null | undefined
): number | null => {
  if (typeof preset === 'number' && Object.prototype.hasOwnProperty.call(SPEED_PRESET_VALUES, preset)) {
    return SPEED_PRESET_VALUES[preset];
  }

  if (typeof fallback === 'number') {
    return fallback;
  }

  if (fallback === null) {
    return null;
  }

  return DEFAULT_SETTINGS.speed;
};

const normalizeLegacySettings = (stored: any): Partial<Settings> => {
  if (!stored || typeof stored !== 'object') {
    return {};
  }

  const rawVoice = typeof stored.voice === 'string' ? stored.voice : DEFAULT_SETTINGS.voice;
  let normalizedVoice = LEGACY_VOICE_MAP[rawVoice] ?? rawVoice;
  // If stored voice is not in the new allowlist, fall back to no override
  if (!ALLOWED_VOICE_IDS.has(normalizedVoice)) {
    normalizedVoice = '';
  }

  const rawSpeedPreset = typeof stored.speedPreset === 'number' ? stored.speedPreset : DEFAULT_SETTINGS.speedPreset;
  const rawSpeed = typeof stored.speed === 'number' ? stored.speed : null;

  return {
    ...stored,
    voice: normalizedVoice,
    speedPreset: rawSpeedPreset,
    speed: mapSpeedFromPreset(rawSpeedPreset, rawSpeed)
  };
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    visuals: DEFAULT_SETTINGS.visuals ? { ...DEFAULT_SETTINGS.visuals } : undefined
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  // Migration helper: convert legacy boolean fields to placement enum
  const migrateLegacySettings = (visuals: any): Settings['visuals'] => {
    if (!visuals) return DEFAULT_SETTINGS.visuals;
    
    // If already has waveformPlacement, no migration needed
    if (visuals.waveformPlacement) {
      // Remove legacy fields
      const { showWaveformsHUD, showWaveformsInInput, ...rest } = visuals;
      return { ...DEFAULT_SETTINGS.visuals, ...rest };
    }
    
    // Migrate from legacy booleans
    let placement: WaveformPlacement = 'over-input';
    if (visuals.showWaveformsHUD === false && visuals.showWaveformsInInput === false) {
      placement = 'off';
    } else if (visuals.showWaveformsInInput === true) {
      placement = 'over-input'; // Input waveforms become over-input in new system
    } else if (visuals.showWaveformsHUD === true) {
      placement = 'over-input'; // HUD default was over-input
    }
    
    // Return migrated settings without legacy fields
    const { showWaveformsHUD, showWaveformsInInput, ...rest } = visuals;
    return {
      ...DEFAULT_SETTINGS.visuals,
      ...rest,
      waveformPlacement: placement
    };
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const raw = JSON.parse(stored);
        const normalized = normalizeLegacySettings(raw);
        const merged: Settings = {
          ...DEFAULT_SETTINGS,
          ...normalized,
          visuals: migrateLegacySettings(normalized.visuals)
        };
        setSettings(merged);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings, isLoaded]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const nextSpeedPreset = updates.speedPreset ?? prev.speedPreset;
      const providedSpeed = updates.speed;
      const nextSpeed = providedSpeed !== undefined ? providedSpeed : mapSpeedFromPreset(nextSpeedPreset, prev.speed);

      return {
        ...prev,
        ...updates,
        speedPreset: nextSpeedPreset,
        speed: nextSpeed,
        visuals: updates.visuals ? { ...(prev.visuals || {} as any), ...updates.visuals } : prev.visuals
      } as Settings;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      visuals: DEFAULT_SETTINGS.visuals ? { ...DEFAULT_SETTINGS.visuals } : undefined
    });
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded
  };
}