/**
 * Client-only: after a full estimate is delivered, suppress redundant open_calculator /
 * generate_estimate tool cards (agent often calls the tool again after the final text).
 * Reset when the user cancels, starts a new path from the chooser, or types a fresh cost intent.
 */

export function markCiedenEstimateSessionCompleted(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __ciedenEstimateSessionCompleted?: boolean }).__ciedenEstimateSessionCompleted =
    true;
}

export function resetCiedenEstimateSessionCompleted(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __ciedenEstimateSessionCompleted?: boolean }).__ciedenEstimateSessionCompleted =
    false;
}

export function isCiedenEstimateSessionCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as unknown as { __ciedenEstimateSessionCompleted?: boolean })
      .__ciedenEstimateSessionCompleted === true
  );
}
