import raw from "@/src/data/cieden-case-studies.json";
import type { CaseStudyRecord } from "./types";
import type { CaseStudyRepository } from "./caseRepository";

export const jsonCaseStudyRepository: CaseStudyRepository = {
  getAllRecords(): CaseStudyRecord[] {
    return raw as CaseStudyRecord[];
  },
};
