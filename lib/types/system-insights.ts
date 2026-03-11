export type SystemMetricTrend = 'up' | 'down' | 'stable';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type GapType = 'knowledge' | 'documentation' | 'data' | 'tool';
export type RequestTrend = 'growing' | 'declining' | 'stable';

export interface SystemMetric {
  id: string;
  name: string;
  description: string;
  value: number;
  previousValue: number;
  change: number; // percentage change
  trend: SystemMetricTrend;
  unit: string; // 'count', 'percentage', 'minutes'
  target?: number; // optional target value
  icon: string; // lucide icon name
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: string;
  count: number;
  trend: SystemMetricTrend;
  actionRequired: boolean;
  timestamp: Date;
}

export interface RequestTag {
  id: string;
  name: string;
  count: number;
  percentage: number; // percentage of total requests
  previousCount: number;
  growth: number; // percentage growth
  trend: RequestTrend;
  category: string;
  examples: string[]; // sample customer requests
  relatedTopics: string[]; // related topic IDs
}

export interface GapAnalysisItem {
  id: string;
  type: GapType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  frequency: number; // how often this gap occurs
  affectedTopics: string[]; // topic IDs where this gap appears
  rootCause: string;
  recommendedActions: {
    action: string;
    effort: 'low' | 'medium' | 'high';
    priority: number; // 1-5
    owner: string; // team responsible
  }[];
  examples: {
    query: string;
    response: string;
    outcome: string;
  }[];
}

export interface ToolFailure {
  id: string;
  toolName: string;
  errorType: string;
  frequency: number;
  lastOccurrence: Date;
  impact: string;
  resolution: string;
  status: 'active' | 'resolved' | 'investigating';
}

export interface SystemInsights {
  metrics: SystemMetric[];
  alerts: AlertItem[];
  popularRequests: RequestTag[];
  growingRequests: RequestTag[];
  gaps: GapAnalysisItem[];
  toolFailures: ToolFailure[];
  summary: {
    totalConversations: number;
    escalationRate: number;
    resolutionRate: number;
    avgResponseTime: number;
    knowledgeGapScore: number; // 0-100
    systemHealthScore: number; // 0-100
  };
  lastUpdated: Date;
}

// Color scheme for different metric types
export const METRIC_COLORS = {
  escalations: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    accent: 'from-red-500 to-red-600'
  },
  knowledge: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    accent: 'from-orange-500 to-orange-600'
  },
  documentation: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    accent: 'from-amber-500 to-amber-600'
  },
  tools: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    accent: 'from-purple-500 to-purple-600'
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    accent: 'from-green-500 to-green-600'
  }
} as const;

// Request categories for tag organization
export const REQUEST_CATEGORIES = {
  PRODUCT: 'Product Information',
  PROCESS: 'Process & Procedures',
  TECHNICAL: 'Technical Issues',
  POLICY: 'Policies & Regulations',
  BILLING: 'Billing & Payments',
  ACCOUNT: 'Account Management'
} as const;

// Gap severity scoring
export const getGapSeverityColor = (impact: string) => {
  switch (impact) {
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Alert severity colors
export const getAlertSeverityColor = (severity: AlertSeverity) => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    case 'warning': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};