// Relative path so bundler always finds the JSON
import companyEstimationsData from "../../data/company-estimations-database.json";

interface CompanyProject {
  id: string;
  name: string;
  type: string;
  complexity: string;
  description: string;
  roles?: string[];
  features: string[];
  phases: Record<string, unknown>;
  totals: {
    total_hours: number;
    total_cost: number;
    timeline_weeks: number;
    team_size: number;
  };
  hourly_rate: number;
}

interface EstimationPatterns {
  hourly_rates: Record<string, number>;
  timeline_multipliers: Record<string, number>;
  team_size_by_complexity: Record<string, number>;
  phase_distribution: Record<string, number>;
}

interface ProjectTypeConfig {
  base_hours: number;
  base_cost: number;
  complexity_multipliers: Record<string, number>;
}

const data = companyEstimationsData as {
  projects: CompanyProject[];
  patterns: EstimationPatterns;
  project_types: Record<string, ProjectTypeConfig>;
};

export function getSimilarProjects(
  projectType: string,
  complexity: string
): CompanyProject[] {
  return data.projects.filter(
    (p) => p.type === projectType && p.complexity === complexity
  );
}

export function getEstimationPatterns(): EstimationPatterns {
  return data.patterns;
}

export function getProjectTypeConfig(
  projectType: string
): ProjectTypeConfig | null {
  return data.project_types[projectType] ?? null;
}

export function calculateRealisticEstimation(
  projectType: string,
  complexity: string,
  additionalFeatures: string[] = [],
  specialRequirements: string[] = []
): {
  minHours: number;
  maxHours: number;
  minPrice: number;
  maxPrice: number;
  timeline: string;
  teamSize: number;
  hourlyRate: number;
} {
  const patterns = getEstimationPatterns();
  const projectConfig = getProjectTypeConfig(projectType);

  if (!projectConfig) {
    return {
      minHours: 100,
      maxHours: 200,
      minPrice: 5000,
      maxPrice: 10000,
      timeline: "6-12 weeks",
      teamSize: 2,
      hourlyRate: 50,
    };
  }

  const rateKey = `${complexity}_complexity` as keyof typeof patterns.hourly_rates;
  const hourlyRate = patterns.hourly_rates[rateKey] ?? 50;

  const multKey = complexity as keyof typeof projectConfig.complexity_multipliers;
  const complexityMultiplier = projectConfig.complexity_multipliers[multKey] ?? 1;
  const baseHours = Math.round(projectConfig.base_hours * complexityMultiplier);
  const baseCost = Math.round(projectConfig.base_cost * complexityMultiplier);

  const featureMultiplier = 1 + additionalFeatures.length * 0.15;
  const requirementMultiplier = 1 + specialRequirements.length * 0.1;
  const adjustedHours = Math.round(
    baseHours * featureMultiplier * requirementMultiplier
  );
  const adjustedCost = Math.round(
    baseCost * featureMultiplier * requirementMultiplier
  );

  const variance = 0.2;
  const minHours = Math.round(adjustedHours * (1 - variance));
  const maxHours = Math.round(adjustedHours * (1 + variance));
  const minPrice = Math.round(adjustedCost * (1 - variance));
  const maxPrice = Math.round(adjustedCost * (1 + variance));

  const teamKey = `${complexity}_complexity` as keyof typeof patterns.team_size_by_complexity;
  const teamSize = patterns.team_size_by_complexity[teamKey] ?? 1.5;
  const timelineMult =
    patterns.timeline_multipliers[
      `${complexity}_complexity` as keyof typeof patterns.timeline_multipliers
    ] ?? 1;
  const baseTimeline = Math.round(
    (adjustedHours / (teamSize * 40)) * timelineMult
  );
  const timeline = `${Math.max(2, baseTimeline - 2)}-${baseTimeline + 2} weeks`;

  return {
    minHours,
    maxHours,
    minPrice,
    maxPrice,
    timeline,
    teamSize,
    hourlyRate,
  };
}
