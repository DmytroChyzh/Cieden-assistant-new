/*
 * Minimal audio-only MediaStream tracker for MVP.
 * - Monkey-patches navigator.mediaDevices.getUserMedia to track created streams
 * - Exposes stopAllAudioStreams() to stop all tracked audio tracks
 * - Auto-prunes streams when tracks end or stream becomes inactive
 * - Idempotent initialization
 */

declare global {
  interface Window {
    __audioMediaTrackerInstalled?: boolean;
  }
}

const trackedStreams = new Set<MediaStream>();

function pruneEndedStreams(): void {
  for (const stream of Array.from(trackedStreams)) {
    const hasActiveAudio = stream.getAudioTracks().some(t => t.readyState !== 'ended');
    if (!hasActiveAudio) {
      trackedStreams.delete(stream);
    }
  }
}

export function initMediaStreamTracker(): void {
  if (typeof window === 'undefined') return;
  if (window.__audioMediaTrackerInstalled) return;
  const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') return;

  const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  mediaDevices.getUserMedia = async function patchedGetUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    // Call the original API
    const stream = await originalGetUserMedia(constraints);

    // Track stream (audio-only focus)
    trackedStreams.add(stream);

    // Remove when all audio tracks have ended or stream becomes inactive
    const maybePrune = () => {
      pruneEndedStreams();
    };

    // Track per-audio-track ended
    for (const track of stream.getAudioTracks()) {
      // Some browsers may reuse track listeners after clone; keep it simple for MVP
      const onEnded = () => {
        track.removeEventListener('ended', onEnded);
        maybePrune();
      };
      track.addEventListener('ended', onEnded);
    }

    // Stream becomes inactive when last track stops
    const onInactive = () => {
      stream.removeEventListener('inactive', onInactive as EventListener);
      trackedStreams.delete(stream);
    };
    stream.addEventListener('inactive', onInactive as EventListener);

    return stream;
  } as typeof mediaDevices.getUserMedia;

  window.__audioMediaTrackerInstalled = true;
}

export function stopAllAudioStreams(): void {
  for (const stream of trackedStreams) {
    for (const track of stream.getAudioTracks()) {
      if (track.readyState !== 'ended') {
        try {
          track.stop();
        } catch (_) {}
      }
    }
  }
  pruneEndedStreams();
}

export function getTrackedStreamCount(): number {
  return trackedStreams.size;
}


