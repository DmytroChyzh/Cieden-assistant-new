import type {
  CaseStudyRecord,
  CaseSummary,
  EnrichedCaseStudy,
  HybridMatchResponse,
  HybridRankedCase,
} from "./types";
import { enrichAllRecords } from "./enrichCases";
import { scoreStructuredMatch } from "./structuredScore";
import { cosineSimilarity, cosineToUnit } from "./cosine";
import {
  embedTextsOpenRouter,
  embeddingTextForCase,
} from "./openRouterEmbeddings";

function toSummary(c: EnrichedCaseStudy): CaseSummary {
  return {
    id: c.id,
    title: c.title,
    domain: c.domain,
    description: c.description,
    url: c.url,
    highlight: c.highlight,
    image: c.image,
  };
}

const NARRATIVE_FOR_EMBEDDING = 7000;
const NARRATIVE_EXCERPT_UI = 14000;

export async function hybridMatchCaseStudies(
  query: string,
  records: CaseStudyRecord[],
  options?: {
    topK?: number;
    trySemantic?: boolean;
    /** Full-page plain text per case id from cieden.com (optional). */
    narrativeByCaseId?: Record<string, string>;
  },
): Promise<HybridMatchResponse> {
  const topK = options?.topK ?? 3;
  const trySemantic = options?.trySemantic ?? true;
  const narrMap = options?.narrativeByCaseId ?? {};
  const q = query.trim();
  const enriched = enrichAllRecords(records);

  const structuredScores = enriched.map((study) => {
    const m = scoreStructuredMatch(q, study);
    return { study, structuredScore: m.score, structuredReasons: m.reasons };
  });

  let semanticAvailable = false;
  const semanticById: Record<string, number> = {};

  if (trySemantic && q.length > 3 && process.env.OPENROUTER_API_KEY) {
    try {
      const caseTexts = enriched.map((c) => {
        const extra = narrMap[c.id]?.trim().slice(0, NARRATIVE_FOR_EMBEDDING) ?? "";
        const body = extra ? `${c.description}\n\n${extra}` : c.description;
        return embeddingTextForCase(c.title, body, c.domain);
      });
      const vectors = await embedTextsOpenRouter([q, ...caseTexts]);
      const qVec = vectors[0];
      for (let i = 0; i < enriched.length; i++) {
        const cos = cosineSimilarity(qVec, vectors[i + 1]!);
        semanticById[enriched[i]!.id] = cosineToUnit(cos);
      }
      semanticAvailable = true;
    } catch (e) {
      console.warn("[case-studies] Embeddings unavailable, using structured fallback:", e);
      semanticAvailable = false;
    }
  }

  const ranked: HybridRankedCase[] = structuredScores.map(
    ({ study, structuredScore, structuredReasons }) => {
      const sem = semanticById[study.id] ?? 0;
      const relevanceScore = semanticAvailable
        ? Math.min(1, 0.58 * sem + 0.42 * structuredScore)
        : Math.min(1, structuredScore);

      const matchReasons = [...structuredReasons];
      if (semanticAvailable && sem >= 0.62) {
        matchReasons.push("Strong semantic similarity to your product description");
      } else if (semanticAvailable && sem >= 0.52) {
        matchReasons.push("Moderate semantic similarity to your product description");
      }

      const rawNarr = narrMap[study.id]?.trim() ?? "";
      const narrativeExcerpt =
        rawNarr.length > 0
          ? rawNarr.length <= NARRATIVE_EXCERPT_UI
            ? rawNarr
            : `${rawNarr.slice(0, NARRATIVE_EXCERPT_UI).trim()}\n…`
          : undefined;

      return {
        case: toSummary(study),
        matchReasons: [...new Set(matchReasons)].slice(0, 5),
        relevanceScore,
        structuredScore,
        semanticScore: semanticAvailable ? sem : 0,
        narrativeExcerpt,
      };
    },
  );

  ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const results = ranked.slice(0, topK);

  const top = results[0]?.relevanceScore ?? 0;
  const second = results[1]?.relevanceScore ?? 0;
  let overallConfidence = top > 0 ? (top - second) / top : 0;
  if (!Number.isFinite(overallConfidence)) overallConfidence = 0;
  overallConfidence = Math.max(0, Math.min(1, overallConfidence));
  const lowConfidence = top < 0.32 || overallConfidence < 0.12;

  return {
    query: q,
    results,
    overallConfidence,
    lowConfidence,
    semanticAvailable,
  };
}
