export type CaseId = string;

/** Minimal shape for UI cards and tools. */
export interface CaseSummary {
  id: CaseId;
  title: string;
  domain: string[];
  description: string;
  url: string;
  highlight?: string;
  image?: string;
}

/**
 * Canonical record in JSON (and future Convex).
 * Optional fields can be filled manually over time; enrichCases() also derives defaults.
 */
export interface CaseStudyRecord extends CaseSummary {
  platforms?: string[];
  clientType?: "b2b" | "b2c" | "internal" | "mixed";
  featureTags?: string[];
  stage?: "mvp" | "scale" | "redesign" | "unknown";
}

export interface EnrichedCaseStudy extends CaseStudyRecord {
  platforms: string[];
  clientType: NonNullable<CaseStudyRecord["clientType"]>;
  featureTags: string[];
  /** Normalized text used for lexical scoring */
  searchBlob: string;
}

export interface StructuredMatch {
  score: number;
  reasons: string[];
}

export interface HybridRankedCase {
  case: CaseSummary;
  matchReasons: string[];
  /** 0–1 combined relevance */
  relevanceScore: number;
  structuredScore: number;
  semanticScore: number;
  /** Plain text from cieden.com case article (when narratives JSON is built). */
  narrativeExcerpt?: string;
}

export interface HybridMatchResponse {
  query: string;
  results: HybridRankedCase[];
  overallConfidence: number;
  lowConfidence: boolean;
  semanticAvailable: boolean;
}

/** API + TOOL_CALL payload (serializable). */
export interface FindSimilarCasesToolPayload {
  productDescription: string;
  results: Array<{
    id: string;
    title: string;
    domain: string[];
    description: string;
    url: string;
    highlight?: string;
    image?: string;
    matchReasons: string[];
    relevanceScore: number;
    narrativeExcerpt?: string;
  }>;
  overallConfidence: number;
  lowConfidence: boolean;
  semanticAvailable: boolean;
  mode?: "default" | "update" | "overlay";
}
