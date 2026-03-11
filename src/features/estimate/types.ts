export type ConversationType = "general" | "project" | "estimate";

export interface EstimateMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProjectEstimate {
  currentRange: { min: number; max: number };
  initialRange: { min: number; max: number };
  currency: string;
  confidence: "low" | "medium" | "high";
  estimatedAt: Date;
  timeline: string;
  team: {
    designers: string[];
    contactPerson: string;
    contactEmail: string;
  };
  phases: {
    "ux-research": string;
    "ui-design": string;
    prototyping: string;
    "design-system": string;
    "mobile-adaptive": string;
  };
  phaseDescriptions?: {
    "ux-research": string;
    "ui-design": string;
    prototyping: string;
    "design-system": string;
    "mobile-adaptive": string;
  };
  accuracyPercentage?: number;
}
