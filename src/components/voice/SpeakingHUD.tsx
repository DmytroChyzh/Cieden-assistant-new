"use client";

import { WaveformIndicator } from '@/src/components/unified/WaveformIndicator';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Settings } from '@/src/components/unified/hooks/useSettings';

interface SpeakingHUDProps {
  voiceStatus: 'idle' | 'connecting' | 'listening' | 'speaking';
  isUserSpeaking: boolean;
  isAgentSpeaking: boolean;
  userAudioLevel: number;
  agentAudioLevel: number;
  settings?: Settings;
  // Optional explicit anchor id to increase reliability
  anchorId?: string;
}

export function SpeakingHUD({
  voiceStatus,
  isUserSpeaking,
  isAgentSpeaking,
  userAudioLevel,
  agentAudioLevel,
  settings,
  anchorId
}: SpeakingHUDProps) {
  const isVoiceActive = voiceStatus !== 'idle';
  const visuals = settings?.visuals;
  const placement = visuals?.waveformPlacement ?? 'over-input';
  const showHeaderStrip = visuals?.showHeaderStrip ?? false;
  const variant = visuals?.waveformVariant ?? 'default';
  const visibility = visuals?.waveformsVisibility ?? 'active';
  const useFixedCenterForOverInput = true; // Phase 1: simplified positioning for 'over-input'
  const POSITION_TWEAK = -24; // px: negative moves closer to bottom, positive moves upward

  // Track UnifiedChatInput position for 'over-input' mode
  const [anchor, setAnchor] = useState<{ left: number; right: number; top: number } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const reacquireIntervalRef = useRef<number | null>(null);
  const anchorElementRef = useRef<HTMLElement | null>(null);
  const anchorTypeRef = useRef<'id' | 'marker' | 'container' | null>(null);
  const updateRef = useRef<number | null>(null);
  const didLogAnchorRef = useRef<boolean>(false);
  const [isObscured, setIsObscured] = useState(false);
  const windowListenersAttachedRef = useRef<boolean>(false);

  // Throttled update function for performance
  const updateAnchor = useCallback(() => {
    if (updateRef.current !== null) return;

    updateRef.current = requestAnimationFrame(() => {
      let el = anchorElementRef.current;
      if (!el || !el.isConnected) {
        // Prefer marker if available, otherwise container
        const byId = anchorId ? (document.getElementById(anchorId) as HTMLElement | null) : null;
        const marker = document.querySelector('[data-waveform-anchor]') as HTMLElement | null;
        const container = document.getElementById('unified-chat-input-root') as HTMLElement | null;
        el = byId || marker || container || null;
        if (el && anchorElementRef.current !== el) {
          anchorElementRef.current = el;
          anchorTypeRef.current = byId ? 'id' : (marker ? 'marker' : 'container');
          console.log('SpeakingHUD: anchor reattached in updateAnchor', { type: anchorTypeRef.current });
        }
      }

      if (!el) {
        setAnchor(null);
        updateRef.current = null;
        return;
      }

      const rect = el.getBoundingClientRect();
      setAnchor({ left: rect.left, right: rect.right, top: rect.top });
      updateRef.current = null;
    });
  }, [anchorId, anchor]);

  useEffect(() => {
    // Phase 1: skip anchor observers for 'over-input' and render at fixed center
    if (placement === 'over-input' && useFixedCenterForOverInput) {
      setAnchor(null);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
      anchorElementRef.current = null;
      anchorTypeRef.current = null;
      didLogAnchorRef.current = false;
      return;
    }

    // Only set up observers for 'over-input' placement
    if (placement !== 'over-input') {
      setAnchor(null);
      // Clean up any existing observers if switching away
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
      anchorElementRef.current = null;
      anchorTypeRef.current = null;
      didLogAnchorRef.current = false;
      return;
    }

    const attachObservers = (element: HTMLElement, type: 'id' | 'marker' | 'container') => {
      // Cache element and type
      anchorElementRef.current = element;
      anchorTypeRef.current = type;

      if (!didLogAnchorRef.current) {
        const r = element.getBoundingClientRect();
        console.log('SpeakingHUD: anchor resolved', { type, rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } });
        didLogAnchorRef.current = true;
      }

      // Initial update
      updateAnchor();

      // Set up ResizeObserver
      const ro = new ResizeObserver(() => {
        // Minimal diagnostics to confirm recompute source
        if (didLogAnchorRef.current) {
          console.debug('SpeakingHUD: ResizeObserver -> updateAnchor');
        }
        updateAnchor();
      });
      ro.observe(element);
      resizeObserverRef.current = ro;

      // Listen to scroll and resize events (only attach once)
      if (!windowListenersAttachedRef.current) {
        window.addEventListener('scroll', updateAnchor, { passive: true });
        window.addEventListener('resize', updateAnchor);
        windowListenersAttachedRef.current = true;
      }
    };

    const tryAttach = () => {
      // Prefer explicit anchor id if provided
      const byId = anchorId ? (document.getElementById(anchorId) as HTMLElement | null) : null;
      if (byId) {
        if (anchorElementRef.current !== byId) {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
          }
          attachObservers(byId, 'id');
        }
        return true;
      }
      // Then prefer explicit anchor marker on the input container
      const marker = document.querySelector('[data-waveform-anchor]') as HTMLElement | null;
      if (marker) {
        // If switching from container to marker, reattach
        if (anchorElementRef.current !== marker) {
          // Cleanup previous
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
          }
          attachObservers(marker, 'marker');
        }
        return true;
      }
      const container = document.getElementById('unified-chat-input-root') as HTMLElement | null;
      if (container) {
        if (anchorElementRef.current !== container) {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
          }
          attachObservers(container, 'container');
        }
        return true;
      }
      return false;
    };

    // Attempt to attach immediately
    // Attempt to attach immediately
    tryAttach();

    // Periodically attempt to reacquire anchor in case of transient DOM swaps
    if (reacquireIntervalRef.current == null) {
      reacquireIntervalRef.current = window.setInterval(() => {
        if (placement !== 'over-input') return;
        updateAnchor();
      }, 250);
    }

    // Observe DOM mutations continuously to handle anchors being replaced/removed
    if (!mutationObserverRef.current) {
      let rafScheduled = false;
      const mo = new MutationObserver(() => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
          rafScheduled = false;
          tryAttach();
        });
      });
      if (document.body) {
        mo.observe(document.body, { childList: true, subtree: true });
        mutationObserverRef.current = mo;
      }
    }

    return () => {
      if (updateRef.current !== null) {
        cancelAnimationFrame(updateRef.current);
      }
      if (reacquireIntervalRef.current != null) {
        window.clearInterval(reacquireIntervalRef.current);
        reacquireIntervalRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
      if (windowListenersAttachedRef.current) {
        window.removeEventListener('scroll', updateAnchor);
        window.removeEventListener('resize', updateAnchor);
        windowListenersAttachedRef.current = false;
      }
      anchorElementRef.current = null;
      anchorTypeRef.current = null;
      didLogAnchorRef.current = false;
    };
  }, [placement, updateAnchor]);

  // Detect overlap with settings panels and visuals panel (if present)
  useEffect(() => {
    if (placement === 'off') {
      setIsObscured(false);
      return;
    }

    const computeObscured = () => {
      const settingsEl = document.querySelector('[data-panel="settings-root"]') as HTMLElement | null;
      const visualsEl = document.querySelector('[data-panel="conversation-visuals"]') as HTMLElement | null;

      const blockers: Array<DOMRect> = [];
      if (settingsEl) blockers.push(settingsEl.getBoundingClientRect());
      if (visualsEl) blockers.push(visualsEl.getBoundingClientRect());

      if (blockers.length === 0) {
        setIsObscured(false);
        return;
      }

      // Compute HUD relevant rects based on placement
      if (placement === 'over-input' && useFixedCenterForOverInput) {
        // Fixed center + constant bottom offset (no anchor)
        const safeAreaBottom = 16;
        const INPUT_BOTTOM_OFFSET = 8; // Tailwind bottom-2 on input wrapper
        const INPUT_APPROX_HEIGHT = 66; // px; conservative estimate
        const CHIP_GAP = variant === 'compact' ? 24 : 40;
        const height = variant === 'compact' ? 24 : 32;
        const totalBottom = safeAreaBottom + INPUT_BOTTOM_OFFSET + INPUT_APPROX_HEIGHT + CHIP_GAP + POSITION_TWEAK;
        const y = Math.max(0, window.innerHeight - totalBottom - height);
        const width = 160; // approx total width of both chips
        const x = Math.max(0, (window.innerWidth - width) / 2);
        const bar: DOMRect = new DOMRect(x, y, width, height);
        const intersects = (r1: DOMRect, r2: DOMRect) => (
          r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top
        );
        const blocked = blockers.some(b => intersects(bar, b));
        setIsObscured(blocked);
        return;
      }

      if (placement === 'over-input' && anchor) {
        const top = Math.max(0, anchor.top - (variant === 'compact' ? 32 : 56));
        const leftA = anchor.left + 16;
        const rightB = Math.max(anchor.right - 16 - 80, anchor.left + 96);
        const height = variant === 'compact' ? 24 : 32;
        const width = 80; // approx chip width; conservative box

        const leftChip: DOMRect = new DOMRect(leftA, top, width, height);
        const rightChip: DOMRect = new DOMRect(rightB, top, width, height);

        const intersects = (r1: DOMRect, r2: DOMRect) => (
          r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top
        );

        const blocked = blockers.some(b => intersects(leftChip, b) || intersects(rightChip, b));
        setIsObscured(blocked);
        return;
      }

      if (placement === 'bottom-left' || placement === 'bottom-right') {
        const safeAreaSide = 16;
        const height = variant === 'compact' ? 24 : 32;
        const width = 160; // two chips total width approx
        // Align the chip row vertically with the input's center line
        const INPUT_BOTTOM_OFFSET = 8; // Tailwind bottom-2 on input wrapper
        const INPUT_APPROX_HEIGHT = 66; // px; conservative estimate
        const cornerBottom = INPUT_BOTTOM_OFFSET + (INPUT_APPROX_HEIGHT - height) / 2;
        const y = Math.max(0, window.innerHeight - cornerBottom - height);
        const x = placement === 'bottom-left' ? safeAreaSide : (window.innerWidth - safeAreaSide - width);
        const bar: DOMRect = new DOMRect(x, y, width, height);
        const intersects = (r1: DOMRect, r2: DOMRect) => (
          r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top
        );
        const blocked = blockers.some(b => intersects(bar, b));
        setIsObscured(blocked);
        return;
      }

      setIsObscured(false);
    };

    computeObscured();
    window.addEventListener('resize', computeObscured);
    window.addEventListener('scroll', computeObscured, { passive: true });
    const id = window.setInterval(computeObscured, 250);
    return () => {
      window.removeEventListener('resize', computeObscured);
      window.removeEventListener('scroll', computeObscured);
      window.clearInterval(id);
    };
  }, [placement, anchor, variant]);

  // Only render when placement enabled and visibility allows
  if (placement === 'off') return null;
  const shouldRender = (visibility === 'always' || isVoiceActive) && !isObscured;
  if (!shouldRender) return null;

  const sizeClass = variant === 'compact' ? 'h-6' : 'h-8';

  // Use fixed px offsets for consistent fallback placement across browsers
  const safeAreaBottom = 16;
  const safeAreaLeft = 16;
  const safeAreaRight = 16;

  // Do not fallback to corner when user chose 'over-input'; wait for anchor instead
  const effectivePlacement = placement;

  // Corner placement: align vertically with the input's center
  const chipHeightPx = variant === 'compact' ? 24 : 32;
  const cornerBottomPx = 8 + (66 - chipHeightPx) / 2; // 8px input bottom + half input height minus half chip height

  // Activity derived strictly from speaking flags (avoid level-based lingering)
  const userActive = isUserSpeaking;
  const agentActive = isAgentSpeaking;

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      data-hud="speaking"
      data-placement={effectivePlacement}
      data-has-anchor={anchor ? 'true' : 'false'}
      data-positioning={effectivePlacement === 'over-input' && useFixedCenterForOverInput ? 'fixed-center' : (anchor ? 'anchor' : 'corner')}
    >
      {/* Header strip */}
      {showHeaderStrip && (
        <div className="absolute top-0 left-0 right-0 z-[2]">
          <div
            className={cn(
              'h-1 w-full transition-all duration-300',
              isAgentSpeaking ? 'bg-gradient-to-r from-fuchsia-500/70 to-violet-500/70' :
              isUserSpeaking ? 'bg-gradient-to-r from-blue-500/70 to-cyan-500/70' : 'bg-transparent'
            )}
            style={{ filter: 'blur(4px)' }}
          />
        </div>
      )}

      {/* Waveform indicators based on placement */}
      {effectivePlacement === 'over-input' && (
        <div
          className={cn('absolute flex items-center gap-2', sizeClass)}
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            // bottom: safe-area + input bottom offset + input height + gap + tweak
            bottom: 16 + 8 + 66 + (variant === 'compact' ? 24 : 40) + POSITION_TWEAK
          }}
        >
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && agentActive}
            audioLevel={agentAudioLevel}
            side="left"
          />
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && userActive}
            audioLevel={userAudioLevel}
            side="right"
          />
        </div>
      )}

      {effectivePlacement === 'bottom-left' && (
        <div
          className={cn('absolute flex gap-2', sizeClass)}
          style={{
            left: safeAreaLeft,
            bottom: Math.max(0, cornerBottomPx)
          }}
        >
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && agentActive}
            audioLevel={agentAudioLevel}
            side="left"
          />
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && userActive}
            audioLevel={userAudioLevel}
            side="right"
          />
        </div>
      )}

      {effectivePlacement === 'bottom-right' && (
        <div
          className={cn('absolute flex gap-2', sizeClass)}
          style={{
            right: safeAreaRight,
            bottom: Math.max(0, cornerBottomPx)
          }}
        >
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && agentActive}
            audioLevel={agentAudioLevel}
            side="left"
          />
          <WaveformIndicator
            isVisible={true}
            isActive={isVoiceActive && userActive}
            audioLevel={userAudioLevel}
            side="right"
          />
        </div>
      )}
    </div>
  );
}
