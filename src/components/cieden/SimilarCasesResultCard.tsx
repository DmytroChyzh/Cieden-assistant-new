"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Sparkles } from "lucide-react";
import type { FindSimilarCasesToolPayload } from "@/src/lib/case-studies/types";

interface SimilarCasesResultCardProps {
  payload: FindSimilarCasesToolPayload;
  onUserAction?: ((text: string) => void) | null;
}

const SimilarCasesResultCard = ({
  payload,
  onUserAction,
}: SimilarCasesResultCardProps) => {
  const { results, overallConfidence, lowConfidence, semanticAvailable, productDescription } =
    payload;

  return (
    <div
      className="w-full max-w-[900px] mx-auto font-[Gilroy] space-y-4"
      aria-label="Similar case studies"
    >
      <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-purple-900/20 to-transparent px-4 py-3 text-sm text-white/80">
        <div className="flex items-center gap-2 text-violet-200/95">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span className="font-medium">Matched to your product description</span>
        </div>
        {productDescription ? (
          <p className="mt-2 text-white/65 line-clamp-3">{productDescription}</p>
        ) : null}
        <p className="mt-2 text-xs text-white/50">
          {semanticAvailable ? "Hybrid rank (semantic + keywords)." : "Keyword / industry rank (embeddings unavailable)."}
          {typeof overallConfidence === "number"
            ? ` Confidence: ${Math.round(overallConfidence * 100)}%.`
            : null}
          {lowConfidence
            ? " Suggestion: ask one clarifying question (industry + platform) if these feel off."
            : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {results.map((r) => (
          <Card
            key={r.id}
            className="bg-transparent backdrop-blur-xl border-white/[0.08] overflow-hidden"
          >
            <CardHeader className="pb-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {r.domain.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <CardTitle className="text-base text-white/90 leading-snug">{r.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-white/70 line-clamp-3">{r.description}</p>
              {r.narrativeExcerpt?.trim() ? (
                <details className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left">
                  <summary className="cursor-pointer text-xs font-medium text-violet-200/90 select-none">
                    Story from cieden.com (excerpt)
                  </summary>
                  <p
                    className="mt-2 max-h-[min(28rem,50vh)] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-white/65 pr-1"
                    aria-label={`Case story excerpt: ${r.title}`}
                  >
                    {r.narrativeExcerpt}
                  </p>
                </details>
              ) : null}
              {r.matchReasons.length > 0 ? (
                <ul className="text-xs text-violet-200/80 space-y-1 list-disc pl-4">
                  {r.matchReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 hover:text-violet-200 transition-colors"
                  aria-label={`Open case study: ${r.title}`}
                >
                  Read on cieden.com
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                {onUserAction ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUserAction(
                        `Tell me more about the case "${r.title}" and how it relates to my product.`,
                      )
                    }
                    className="text-xs text-white/50 hover:text-white/75 underline-offset-2 hover:underline"
                    aria-label={`Ask about ${r.title}`}
                  >
                    Ask about this case
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SimilarCasesResultCard;
