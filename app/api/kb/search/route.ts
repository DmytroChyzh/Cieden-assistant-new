import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  formatKbContextBlock,
  type KbSearchHit,
} from "@/src/lib/kb/formatKbContext";
import { embedTextsOpenRouter } from "@/src/lib/case-studies/openRouterEmbeddings";
import { cosineSimilarity } from "@/src/lib/case-studies/cosine";

export const runtime = "nodejs";

type KeywordRow = {
  sourceUrl: string;
  title: string;
  section: string;
  text: string;
  embedding?: number[];
  keywordScore: number;
};

function toHits(rows: KeywordRow[], limit: number): KbSearchHit[] {
  return rows.slice(0, limit).map((c) => ({
    sourceUrl: c.sourceUrl,
    title: c.title,
    section: c.section,
    text: c.text,
  }));
}

export async function POST(req: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL is not set" },
      { status: 500 },
    );
  }

  let body: { query?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  const limit = Math.min(12, Math.max(1, body.limit ?? 8));
  if (query.length < 2) {
    return NextResponse.json({ contextBlock: "", hits: [] satisfies KbSearchHit[] });
  }

  const client = new ConvexHttpClient(convexUrl);
  const candidates = (await client.query(api.kb.searchKbKeyword, {
    query,
    candidateLimit: 80,
  })) as KeywordRow[];

  if (!candidates.length) {
    return NextResponse.json({ contextBlock: "", hits: [] });
  }

  const withEmb = candidates.filter(
    (c) => Array.isArray(c.embedding) && c.embedding.length > 0,
  );

  let hits: KbSearchHit[];

  if (withEmb.length >= 4 && process.env.OPENROUTER_API_KEY) {
    try {
      const [qVec] = await embedTextsOpenRouter([query.slice(0, 8000)]);
      const ranked = [...withEmb]
        .map((c) => ({
          sourceUrl: c.sourceUrl,
          title: c.title,
          section: c.section,
          text: c.text,
          sem: cosineSimilarity(qVec, c.embedding!),
        }))
        .sort((a, b) => b.sem - a.sem)
        .slice(0, limit);
      hits = ranked.map(({ sem: _s, ...h }) => h);
    } catch {
      hits = toHits(candidates, limit);
    }
  } else {
    hits = toHits(candidates, limit);
  }

  return NextResponse.json({
    contextBlock: formatKbContextBlock(hits),
    hits,
  });
}
