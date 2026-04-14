import type { CaseStudyRecord } from "./types";

/**
 * Abstraction so JSON can swap for Convex `caseStudies` queries later
 * without changing retriever or API contracts.
 */
export interface CaseStudyRepository {
  getAllRecords(): Promise<CaseStudyRecord[]> | CaseStudyRecord[];
}
