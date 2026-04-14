import fs from "fs";
import path from "path";

let cache: Record<string, string> | null = null;

/** Full plain-text narratives from cieden.com case pages (see scripts/build-cieden-case-narratives.mjs). */
export function loadCaseNarrativesMap(): Record<string, string> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "src/data/cieden-case-narratives.json");
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    cache = JSON.parse(raw) as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

export function getNarrativeForCase(caseId: string, maxLen: number): string {
  const full = loadCaseNarrativesMap()[caseId];
  if (!full) return "";
  if (full.length <= maxLen) return full;
  return `${full.slice(0, maxLen).trim()}\n…`;
}
