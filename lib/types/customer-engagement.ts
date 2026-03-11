export type TopicCategory = 
  | 'loans' 
  | 'insurance' 
  | 'investments' 
  | 'cards' 
  | 'emi' 
  | 'account'
  | 'payments'
  | 'security'
  | 'budgeting';

export type ConversationStatus = 'resolved' | 'pending' | 'escalated';
export type MessageSender = 'customer' | 'agent';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface Customer {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  result?: string;
  status: 'success' | 'error' | 'pending';
  timestamp: Date;
}

export interface UserPermission {
  id: string;
  action: string;
  description: string;
  granted: boolean;
  grantedAt?: Date;
  duration: 'one-time' | 'permanent' | 'session';
  expiresAt?: Date;
}

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  cxRating?: number; // 1-5 rating, only for customer messages
  toolCalls?: ToolCall[];
}

export interface Conversation {
  id: string;
  customer: Customer;
  messages: Message[];
  cxRating: number; // 1-5 average rating
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
  preview: string; // First 2 lines of conversation
  toolCalls?: ToolCall[];
  permissions?: UserPermission[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  conversationCount: number;
  cxScore: number; // 0-100 percentage
  cxScoreChange: number; // percentage change from previous period
  trend: TrendDirection;
  category: TopicCategory;
  conversations: Conversation[];
  sparklineData: number[]; // For trend visualization
  gradient: {
    from: string;
    to: string;
  };
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Filters {
  dateRange: DateRange;
  cxScoreRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
  categories: TopicCategory[];
  status: ConversationStatus[];
}

export interface CustomerEngagementState {
  topics: Topic[];
  selectedTopic: Topic | null;
  selectedConversation: Conversation | null;
  filters: Filters;
  loading: boolean;
  error: string | null;
}

// Filter presets for CX score
export const CX_SCORE_PRESETS = {
  ALL: { label: 'All Scores', min: 0, max: 100 },
  EXCELLENT: { label: 'Excellent (90%+)', min: 90, max: 100 },
  GOOD: { label: 'Good (70-89%)', min: 70, max: 89 },
  NEEDS_IMPROVEMENT: { label: 'Needs Improvement (<70%)', min: 0, max: 69 }
} as const;

// Color mappings for CX scores
export const getCXScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

// Category colors for topic cards - Enhanced for better contrast
export const getCategoryGradient = (category: TopicCategory) => {
  const gradients = {
    loans: { from: '#2563EB', to: '#1D4ED8' },        // Darker blue
    insurance: { from: '#7C3AED', to: '#6B21A8' },     // Deeper purple
    investments: { from: '#059669', to: '#047857' },    // Deeper green
    cards: { from: '#D97706', to: '#B45309' },         // Deeper orange
    emi: { from: '#DC2626', to: '#B91C1C' },           // Deeper red
    account: { from: '#4B5563', to: '#374151' },       // Darker gray
    payments: { from: '#DB2777', to: '#BE185D' },      // Deeper pink
    security: { from: '#EA580C', to: '#C2410C' },      // Deeper orange-red
    budgeting: { from: '#65A30D', to: '#4D7C0F' },     // Deeper lime
  };
  return gradients[category] || gradients.account;
};