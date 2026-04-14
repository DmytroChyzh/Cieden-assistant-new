import raw from "./cieden-case-studies.json";
import type { CaseStudyRecord, CaseSummary } from "@/src/lib/case-studies/types";

export const CASE_STUDY_RECORDS: CaseStudyRecord[] = raw as CaseStudyRecord[];

export const CASES: CaseSummary[] = CASE_STUDY_RECORDS.map((r) => ({
  id: r.id,
  title: r.title,
  domain: r.domain,
  description: r.description,
  url: r.url,
  highlight: r.highlight,
  image: r.image,
}));
