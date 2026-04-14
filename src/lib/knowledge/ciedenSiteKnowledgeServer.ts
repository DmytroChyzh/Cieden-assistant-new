/**
 * Stub: site knowledge search.
 * Returns empty results until a real knowledge dataset is loaded.
 */

interface SiteKnowledgeResult {
  title: string;
  snippet: string;
  url?: string;
  score: number;
}

export function searchSiteKnowledge(
  _query: string,
  _limit = 8,
): { results: SiteKnowledgeResult[]; emptyDataset: boolean } {
  return { results: [], emptyDataset: true };
}
