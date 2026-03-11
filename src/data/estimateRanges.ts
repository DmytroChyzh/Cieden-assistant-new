/**
 * Estimation ranges from Cieden data (Estimation file).
 * Source: src/data/Estimation file/real-estimations.json (and company-estimations-database.json).
 * Used by the estimate wizard to show preliminary price ranges.
 * All minPrice/maxPrice/timeline values here are taken from your provided estimation files.
 */
export interface EstimationEntry {
  projectType: string;
  complexity: string;
  minHours: number;
  maxHours: number;
  minPrice: number;
  maxPrice: number;
  timeline: string;
  teamSize: number;
  features: string[];
  description: string;
}

// Inlined from Estimation file/real-estimations.json to avoid path-with-space issues
const ESTIMATIONS: EstimationEntry[] = [
  { projectType: "website", complexity: "low", minHours: 50, maxHours: 100, minPrice: 2500, maxPrice: 5000, timeline: "4-8 тижнів", teamSize: 2, features: [], description: "" },
  { projectType: "website", complexity: "medium", minHours: 100, maxHours: 200, minPrice: 5000, maxPrice: 10000, timeline: "6-12 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "website", complexity: "high", minHours: 200, maxHours: 400, minPrice: 10000, maxPrice: 20000, timeline: "8-16 тижнів", teamSize: 4, features: [], description: "" },
  { projectType: "e-commerce", complexity: "low", minHours: 150, maxHours: 250, minPrice: 7500, maxPrice: 12500, timeline: "8-12 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "e-commerce", complexity: "medium", minHours: 250, maxHours: 400, minPrice: 12500, maxPrice: 20000, timeline: "12-20 тижнів", teamSize: 4, features: [], description: "" },
  { projectType: "e-commerce", complexity: "high", minHours: 400, maxHours: 600, minPrice: 20000, maxPrice: 30000, timeline: "16-28 тижнів", teamSize: 5, features: [], description: "" },
  { projectType: "mobile-app", complexity: "low", minHours: 200, maxHours: 300, minPrice: 10000, maxPrice: 15000, timeline: "10-16 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "mobile-app", complexity: "medium", minHours: 300, maxHours: 500, minPrice: 15000, maxPrice: 25000, timeline: "16-24 тижні", teamSize: 4, features: [], description: "" },
  { projectType: "mobile-app", complexity: "high", minHours: 500, maxHours: 800, minPrice: 25000, maxPrice: 40000, timeline: "24-36 тижнів", teamSize: 5, features: [], description: "" },
  { projectType: "landing", complexity: "low", minHours: 20, maxHours: 40, minPrice: 1000, maxPrice: 2000, timeline: "2-4 тижні", teamSize: 1, features: [], description: "" },
  { projectType: "landing", complexity: "medium", minHours: 40, maxHours: 80, minPrice: 2000, maxPrice: 4000, timeline: "3-6 тижнів", teamSize: 2, features: [], description: "" },
  { projectType: "landing", complexity: "high", minHours: 80, maxHours: 120, minPrice: 4000, maxPrice: 6000, timeline: "4-8 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "redesign", complexity: "low", minHours: 40, maxHours: 80, minPrice: 2000, maxPrice: 4000, timeline: "4-8 тижнів", teamSize: 2, features: [], description: "" },
  { projectType: "redesign", complexity: "medium", minHours: 80, maxHours: 150, minPrice: 4000, maxPrice: 7500, timeline: "6-12 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "redesign", complexity: "high", minHours: 150, maxHours: 250, minPrice: 7500, maxPrice: 12500, timeline: "8-16 тижнів", teamSize: 4, features: [], description: "" },
  { projectType: "dashboard", complexity: "low", minHours: 100, maxHours: 200, minPrice: 5000, maxPrice: 10000, timeline: "6-10 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "dashboard", complexity: "medium", minHours: 200, maxHours: 350, minPrice: 10000, maxPrice: 17500, timeline: "10-18 тижнів", teamSize: 4, features: [], description: "" },
  { projectType: "dashboard", complexity: "high", minHours: 350, maxHours: 500, minPrice: 17500, maxPrice: 25000, timeline: "18-26 тижнів", teamSize: 5, features: [], description: "" },
  { projectType: "admin-panel", complexity: "low", minHours: 80, maxHours: 150, minPrice: 4000, maxPrice: 7500, timeline: "5-10 тижнів", teamSize: 2, features: [], description: "" },
  { projectType: "admin-panel", complexity: "medium", minHours: 150, maxHours: 250, minPrice: 7500, maxPrice: 12500, timeline: "8-16 тижнів", teamSize: 3, features: [], description: "" },
  { projectType: "admin-panel", complexity: "high", minHours: 250, maxHours: 400, minPrice: 12500, maxPrice: 20000, timeline: "12-20 тижнів", teamSize: 4, features: [], description: "" },
];

export function getEstimationRange(
  projectType: string,
  complexity: string
): EstimationEntry | null {
  return (
    ESTIMATIONS.find(
      (e) =>
        e.projectType === projectType && e.complexity === complexity
    ) ?? null
  );
}

/** Fallback when project type is "other" or custom — derived from your data by complexity. */
export function getGenericEstimationRange(complexity: "low" | "medium" | "high"): EstimationEntry {
  const byComplexity = ESTIMATIONS.filter((e) => e.complexity === complexity);
  if (byComplexity.length === 0) {
    return {
      projectType: "other",
      complexity,
      minHours: 150,
      maxHours: 350,
      minPrice: 7500,
      maxPrice: 20000,
      timeline: "6–16 тижнів",
      teamSize: 3,
      features: [],
      description: "",
    };
  }
  const minPrice = Math.min(...byComplexity.map((e) => e.minPrice));
  const maxPrice = Math.max(...byComplexity.map((e) => e.maxPrice));
  const first = byComplexity[0];
  return {
    ...first,
    projectType: "other",
    minPrice,
    maxPrice,
  };
}
