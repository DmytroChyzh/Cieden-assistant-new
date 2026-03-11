import { 
  SystemInsights, 
  SystemMetric, 
  AlertItem, 
  RequestTag, 
  GapAnalysisItem, 
  ToolFailure,
  METRIC_COLORS,
  REQUEST_CATEGORIES 
} from '@/lib/types/system-insights';

// Generate system metrics with realistic financial services data
const generateSystemMetrics = (): SystemMetric[] => {
  return [
    {
      id: 'escalations',
      name: 'Human Escalations',
      description: 'Queries escalated to human agents when AI couldn\'t provide adequate resolution',
      value: 247,
      previousValue: 220,
      change: 12.3,
      trend: 'up',
      unit: 'count',
      target: 180,
      icon: 'AlertTriangle',
      color: METRIC_COLORS.escalations
    },
    {
      id: 'knowledge_gaps',
      name: 'Knowledge Gaps',
      description: 'Questions where the AI agent lacked sufficient information to provide accurate answers',
      value: 156,
      previousValue: 164,
      change: -4.9,
      trend: 'down',
      unit: 'count',
      target: 120,
      icon: 'HelpCircle',
      color: METRIC_COLORS.knowledge
    },
    {
      id: 'doc_gaps',
      name: 'Documentation Gaps',
      description: 'Instances where policies, procedures, or product information was outdated or missing',
      value: 89,
      previousValue: 72,
      change: 23.6,
      trend: 'up',
      unit: 'count',
      target: 50,
      icon: 'FileX',
      color: METRIC_COLORS.documentation
    },
    {
      id: 'tool_failures',
      name: 'Tool Failures',
      description: 'Retrieval tool errors, API timeouts, and integration failures affecting agent performance',
      value: 34,
      previousValue: 41,
      change: -17.1,
      trend: 'down',
      unit: 'count',
      target: 20,
      icon: 'Wrench',
      color: METRIC_COLORS.tools
    }
  ];
};

// Generate critical alerts requiring immediate attention
const generateAlerts = (): AlertItem[] => {
  return [
    {
      id: 'crypto_investment_surge',
      title: 'Cryptocurrency Investment Queries Surging',
      description: 'New crypto investment requests increased 300% this week. Agent has limited crypto product knowledge.',
      severity: 'critical',
      category: 'Product Knowledge',
      count: 127,
      trend: 'up',
      actionRequired: true,
      timestamp: new Date('2024-02-15T09:30:00')
    },
    {
      id: 'loan_policy_outdated',
      title: 'Personal Loan Policy Documentation Outdated',
      description: 'Interest rate information is 3 months old. Agent providing incorrect loan terms to customers.',
      severity: 'critical',
      category: 'Documentation',
      count: 89,
      trend: 'up',
      actionRequired: true,
      timestamp: new Date('2024-02-14T14:22:00')
    },
    {
      id: 'payment_gateway_issues',
      title: 'Payment Gateway API Frequent Timeouts',
      description: 'UPI payment status checks failing 40% of the time. Manual escalations required.',
      severity: 'warning',
      category: 'Technical',
      count: 45,
      trend: 'stable',
      actionRequired: true,
      timestamp: new Date('2024-02-13T11:15:00')
    }
  ];
};

// Generate popular request tags
const generatePopularRequests = (): RequestTag[] => {
  return [
    {
      id: 'loan_application',
      name: 'Loan Application Process',
      count: 1834,
      percentage: 18.4,
      previousCount: 1756,
      growth: 4.4,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PROCESS,
      examples: [
        'What documents do I need for a personal loan?',
        'How long does loan approval take?',
        'What is the minimum salary requirement for a loan?'
      ],
      relatedTopics: ['personal_loans', 'emi_financing']
    },
    {
      id: 'card_activation',
      name: 'Card Activation & Issues',
      count: 1567,
      percentage: 15.7,
      previousCount: 1623,
      growth: -3.5,
      trend: 'declining',
      category: REQUEST_CATEGORIES.TECHNICAL,
      examples: [
        'My new card is not working after activation',
        'How to activate my credit card?',
        'Card transaction is being declined'
      ],
      relatedTopics: ['card_management']
    },
    {
      id: 'investment_advice',
      name: 'Investment Guidance',
      count: 1245,
      percentage: 12.5,
      previousCount: 987,
      growth: 26.1,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PRODUCT,
      examples: [
        'Best mutual funds for retirement planning',
        'How to start SIP investment?',
        'Tax saving investment options'
      ],
      relatedTopics: ['investment_products']
    },
    {
      id: 'payment_failures',
      name: 'Payment Processing Issues',
      count: 1123,
      percentage: 11.2,
      previousCount: 1178,
      growth: -4.7,
      trend: 'declining',
      category: REQUEST_CATEGORIES.TECHNICAL,
      examples: [
        'UPI payment failed but money debited',
        'EMI auto-debit not working',
        'Cannot make online payment'
      ],
      relatedTopics: ['payments_transfers', 'emi_financing']
    },
    {
      id: 'account_access',
      name: 'Account Login Problems',
      count: 967,
      percentage: 9.7,
      previousCount: 1034,
      growth: -6.5,
      trend: 'declining',
      category: REQUEST_CATEGORIES.TECHNICAL,
      examples: [
        'Forgot my net banking password',
        'Mobile app not loading',
        'Account locked after wrong attempts'
      ],
      relatedTopics: ['account_access', 'account_management']
    }
  ];
};

// Generate growing/trending requests
const generateGrowingRequests = (): RequestTag[] => {
  return [
    {
      id: 'crypto_investment',
      name: 'Cryptocurrency Investments',
      count: 234,
      percentage: 2.3,
      previousCount: 67,
      growth: 249.3,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PRODUCT,
      examples: [
        'Does ApexBank offer cryptocurrency investment?',
        'How to buy Bitcoin through your platform?',
        'Crypto mutual fund options available?'
      ],
      relatedTopics: ['investment_products']
    },
    {
      id: 'esg_investing',
      name: 'ESG & Sustainable Investing',
      count: 189,
      percentage: 1.9,
      previousCount: 98,
      growth: 92.9,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PRODUCT,
      examples: [
        'Green bonds investment options',
        'ESG mutual funds performance',
        'Sustainable investment portfolio'
      ],
      relatedTopics: ['investment_products']
    },
    {
      id: 'tax_planning',
      name: 'Tax Planning Services',
      count: 167,
      percentage: 1.7,
      previousCount: 89,
      growth: 87.6,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PRODUCT,
      examples: [
        'Tax saving schemes for salaried employees',
        'ELSS vs PPF comparison',
        'How to save tax on capital gains?'
      ],
      relatedTopics: ['investment_products', 'budgeting_tools']
    },
    {
      id: 'digital_gold',
      name: 'Digital Gold Investment',
      count: 143,
      percentage: 1.4,
      previousCount: 78,
      growth: 83.3,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PRODUCT,
      examples: [
        'How to buy digital gold?',
        'Digital gold vs physical gold',
        'Minimum investment in gold'
      ],
      relatedTopics: ['investment_products']
    },
    {
      id: 'health_insurance_claims',
      name: 'Health Insurance Claims',
      count: 134,
      percentage: 1.3,
      previousCount: 76,
      growth: 76.3,
      trend: 'growing',
      category: REQUEST_CATEGORIES.PROCESS,
      examples: [
        'How to file health insurance claim online?',
        'Cashless hospital treatment process',
        'Pre-authorization requirements for surgery'
      ],
      relatedTopics: ['insurance_services']
    }
  ];
};

// Generate gap analysis with detailed breakdowns
const generateGapAnalysis = (): GapAnalysisItem[] => {
  return [
    {
      id: 'crypto_knowledge_gap',
      type: 'knowledge',
      title: 'Cryptocurrency Product Knowledge Deficit',
      description: 'Agent lacks comprehensive information about cryptocurrency investment options, regulatory framework, and risk disclosures.',
      impact: 'high',
      frequency: 234,
      affectedTopics: ['investment_products'],
      rootCause: 'ApexBank recently launched crypto investment products but knowledge base was not updated with product details, compliance requirements, and risk factors.',
      recommendedActions: [
        {
          action: 'Update knowledge base with crypto product documentation',
          effort: 'medium',
          priority: 1,
          owner: 'Product Team'
        },
        {
          action: 'Add crypto regulatory compliance training content',
          effort: 'high',
          priority: 2,
          owner: 'Compliance Team'
        },
        {
          action: 'Create crypto risk assessment workflows',
          effort: 'medium',
          priority: 3,
          owner: 'Risk Team'
        }
      ],
      examples: [
        {
          query: 'Can I invest in Bitcoin through ApexBank?',
          response: 'I don\'t have current information about cryptocurrency investment options. Let me connect you with a specialist.',
          outcome: 'Escalated to human agent - customer frustration'
        },
        {
          query: 'What are the tax implications of crypto investing?',
          response: 'I cannot provide specific tax advice on cryptocurrency. Please consult our tax advisory team.',
          outcome: 'Escalated - missed cross-sell opportunity'
        }
      ]
    },
    {
      id: 'loan_policy_documentation',
      type: 'documentation',
      title: 'Outdated Personal Loan Interest Rates',
      description: 'Personal loan interest rate information is 3 months outdated, leading to incorrect rate quotes and customer disappointment.',
      impact: 'high',
      frequency: 89,
      affectedTopics: ['personal_loans', 'emi_financing'],
      rootCause: 'Interest rate policy document last updated in November 2023. Recent RBI rate changes not reflected in agent knowledge base.',
      recommendedActions: [
        {
          action: 'Establish automated rate update pipeline from policy team',
          effort: 'high',
          priority: 1,
          owner: 'IT Operations'
        },
        {
          action: 'Implement weekly policy document review process',
          effort: 'low',
          priority: 2,
          owner: 'Operations Team'
        },
        {
          action: 'Add rate disclaimer for all loan quotations',
          effort: 'low',
          priority: 3,
          owner: 'Product Team'
        }
      ],
      examples: [
        {
          query: 'What is the current interest rate for a 5 lakh personal loan?',
          response: 'Current rates start from 10.99% per annum based on your profile.',
          outcome: 'Actual rate was 12.5% - customer complained about misrepresentation'
        }
      ]
    },
    {
      id: 'upi_payment_integration',
      type: 'data',
      title: 'UPI Payment Status Data Unavailable',
      description: 'Real-time UPI transaction status cannot be retrieved due to payment gateway API limitations, requiring manual verification.',
      impact: 'medium',
      frequency: 67,
      affectedTopics: ['payments_transfers', 'emi_financing'],
      rootCause: 'Payment gateway API does not provide real-time transaction status. 15-minute delay in status updates creates customer anxiety.',
      recommendedActions: [
        {
          action: 'Negotiate real-time API access with payment provider',
          effort: 'high',
          priority: 1,
          owner: 'Business Development'
        },
        {
          action: 'Implement payment status notification system',
          effort: 'medium',
          priority: 2,
          owner: 'Tech Team'
        },
        {
          action: 'Add payment delay messaging to customer communications',
          effort: 'low',
          priority: 3,
          owner: 'Customer Experience'
        }
      ],
      examples: [
        {
          query: 'My UPI payment shows failed but money was deducted. Where is my money?',
          response: 'I cannot check your real-time payment status. Let me connect you with our payment support team.',
          outcome: 'Escalation required - customer anxiety and trust impact'
        }
      ]
    }
  ];
};

// Generate tool failure tracking
const generateToolFailures = (): ToolFailure[] => {
  return [
    {
      id: 'payment_api_timeout',
      toolName: 'Payment Gateway Status API',
      errorType: 'Timeout Error',
      frequency: 45,
      lastOccurrence: new Date('2024-02-15T10:45:00'),
      impact: 'Unable to verify payment status, causing customer escalations',
      resolution: 'Increase timeout limit to 30 seconds and add retry logic',
      status: 'investigating'
    },
    {
      id: 'loan_eligibility_calc',
      toolName: 'Loan Eligibility Calculator',
      errorType: 'Data Validation Error',
      frequency: 23,
      lastOccurrence: new Date('2024-02-14T16:20:00'),
      impact: 'Cannot calculate accurate loan amounts for customers with multiple income sources',
      resolution: 'Update validation rules to handle complex income scenarios',
      status: 'resolved'
    },
    {
      id: 'document_classifier',
      toolName: 'Document Classification Service',
      errorType: 'Model Inference Error',
      frequency: 12,
      lastOccurrence: new Date('2024-02-13T09:15:00'),
      impact: 'Cannot automatically process uploaded documents, requires manual review',
      resolution: 'Retrain model with recent document samples',
      status: 'active'
    }
  ];
};

// Main mock data generation
export const mockSystemInsights: SystemInsights = {
  metrics: generateSystemMetrics(),
  alerts: generateAlerts(),
  popularRequests: generatePopularRequests(),
  growingRequests: generateGrowingRequests(),
  gaps: generateGapAnalysis(),
  toolFailures: generateToolFailures(),
  summary: {
    totalConversations: 9987,
    escalationRate: 2.47, // percentage
    resolutionRate: 94.2, // percentage
    avgResponseTime: 2.3, // seconds
    knowledgeGapScore: 67, // 0-100 (lower is better)
    systemHealthScore: 82 // 0-100 (higher is better)
  },
  lastUpdated: new Date()
};

// Helper functions for data analysis
export const getTopGrowingRequests = (requests: RequestTag[], limit: number = 5): RequestTag[] => {
  return requests
    .filter(r => r.trend === 'growing')
    .sort((a, b) => b.growth - a.growth)
    .slice(0, limit);
};

export const getCriticalGaps = (gaps: GapAnalysisItem[]): GapAnalysisItem[] => {
  return gaps.filter(gap => gap.impact === 'high');
};

export const getActiveToolFailures = (failures: ToolFailure[]): ToolFailure[] => {
  return failures.filter(f => f.status === 'active' || f.status === 'investigating');
};

// Utility functions for trend calculations
export const calculateTrend = (current: number, previous: number): { change: number; trend: 'up' | 'down' | 'stable' } => {
  const change = ((current - previous) / previous) * 100;
  
  if (Math.abs(change) < 5) {
    return { change, trend: 'stable' };
  }
  
  return { 
    change, 
    trend: change > 0 ? 'up' : 'down' 
  };
};