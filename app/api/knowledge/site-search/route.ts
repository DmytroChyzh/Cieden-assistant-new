import { NextRequest, NextResponse } from "next/server";
import { searchSiteKnowledge } from "@/src/lib/knowledge/ciedenSiteKnowledgeServer";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; search_query?: string; limit?: number };
    const raw =
      typeof body.query === "string"
        ? body.query
        : typeof body.search_query === "string"
          ? body.search_query
          : "";
    const query = raw.trim();
    if (!query) {
      return NextResponse.json({ error: "Missing query or search_query" }, { status: 400 });
    }
    const limit =
      typeof body.limit === "number" && body.limit > 0 && body.limit <= 20
        ? Math.floor(body.limit)
        : 8;
    const { results, emptyDataset } = searchSiteKnowledge(query, limit);
    return NextResponse.json({ query, results, emptyDataset });
  } catch (e) {
    console.error("[api/knowledge/site-search]", e);
    return NextResponse.json({ error: "site_search_failed" }, { status: 500 });
  }
}
