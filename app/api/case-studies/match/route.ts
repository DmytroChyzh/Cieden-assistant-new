import { NextRequest, NextResponse } from "next/server";
import { hybridMatchCaseStudies } from "@/src/lib/case-studies/hybridCaseMatch";
import { jsonCaseStudyRepository } from "@/src/lib/case-studies/jsonCaseRepository";
import { loadCaseNarrativesMap } from "@/src/lib/case-studies/caseNarrativesServer";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; productDescription?: string };
    const raw =
      typeof body.query === "string"
        ? body.query
        : typeof body.productDescription === "string"
          ? body.productDescription
          : "";
    const query = raw.trim();
    if (!query) {
      return NextResponse.json(
        { error: "Missing query or productDescription" },
        { status: 400 },
      );
    }

    const records = await Promise.resolve(jsonCaseStudyRepository.getAllRecords());
    const narrativeByCaseId = loadCaseNarrativesMap();
    const result = await hybridMatchCaseStudies(query, records, {
      topK: 3,
      narrativeByCaseId,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/case-studies/match]", e);
    return NextResponse.json({ error: "match_failed" }, { status: 500 });
  }
}
