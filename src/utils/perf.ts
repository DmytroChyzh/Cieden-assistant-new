// Minimal performance logging helper for client code
// Logs are gated by NEXT_PUBLIC_VOICE_DIAGNOSTICS=true or NODE_ENV=development

export function isDiagnosticsEnabled(): boolean {
  try {
    // Next.js replaces process.env at build time
    const envEnabled =
      typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_VOICE_DIAGNOSTICS === 'true' ||
        process.env.NODE_ENV === 'development');
    return !!envEnabled;
  } catch {
    return false;
  }
}

type Context = Record<string, unknown>;

export type PerfTimer = {
  label: string;
  context: Context;
  mark: (phase: string, extra?: Context) => number;
  getStart: () => number;
};

export function startPerfTimer(label: string, context: Context = {}): PerfTimer {
  const hasPerf = typeof performance !== 'undefined' && typeof performance.now === 'function';
  const t0 = hasPerf ? performance.now() : Date.now();
  const wallT0 = Date.now();

  const mark = (phase: string, extra: Context = {}): number => {
    const now = hasPerf ? performance.now() : Date.now();
    const dtMs = now - t0;
    if (isDiagnosticsEnabled()) {
      // eslint-disable-next-line no-console
      console.log('[perf]', {
        label,
        phase,
        dtMs,
        t0: wallT0,
        t: Date.now(),
        ...context,
        ...extra,
      });
    }
    return dtMs;
  };

  return {
    label,
    context,
    mark,
    getStart: () => t0,
  };
}

// Simple one-off gated log for events that don't need a timer
export function perfLog(label: string, data: Context = {}): void {
  if (!isDiagnosticsEnabled()) return;
  // eslint-disable-next-line no-console
  console.log('[perf]', { label, t: Date.now(), ...data });
}





