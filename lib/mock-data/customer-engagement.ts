import { 
  Topic, 
  Conversation, 
  Customer, 
  Message, 
  ToolCall,
  UserPermission,
  TopicCategory,
  getCategoryGradient 
} from '../types/customer-engagement';

// Mock customers for ApexBank context (with original names for anonymization)
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Rajesh Sharma', // Will be anonymized to consistent animal name
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '2', 
    name: 'Priya Patel',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '3',
    name: 'Amit Kumar',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '4',
    name: 'Sneha Gupta',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '5',
    name: 'Vikram Singh',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '6',
    name: 'Meera Joshi',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '7',
    name: 'Arjun Rao',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  },
  {
    id: '8',
    name: 'Kavya Reddy',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]'
  }
];

// Helper function to generate conversation messages
const generateConversationMessages = (customerId: string, scenario: string): Message[] => {
  const scenarios = {
    'loan_application': [
      {
        id: '1',
        sender: 'customer' as const,
        content: 'Hi, I\'m looking for a $5,000 personal loan to expand my studio. What rates do you offer?',
        timestamp: new Date('2024-02-10T09:30:00'),
        cxRating: 4
      },
      {
        id: '2',
        sender: 'agent' as const,
        content: 'Hello! Our credit union offers competitive personal loan rates starting around 9.9% APR. We also have business term loans if you need additional flexibility. Could I confirm your FICO score and monthly income?',
        timestamp: new Date('2024-02-10T09:32:00')
      },
      {
        id: '3',
        sender: 'customer' as const,
        content: 'My FICO is 750 and my monthly income is around $4,800. I\'m self-employed. Which documents do you need?',
        timestamp: new Date('2024-02-10T09:35:00')
      },
      {
        id: '4',
        sender: 'agent' as const,
        content: 'Excellent score! For self-employed applicants we usually need: 1) Driver\'s license, 2) Last two years of tax returns, 3) Three months of business bank statements, 4) Proof of business registration. With your profile you\'re pre-qualified for $15,000 at 9.9% APR.',
        timestamp: new Date('2024-02-10T09:37:00')
      },
      {
        id: '5',
        sender: 'customer' as const,
        content: 'That\'s great! How quickly can I get the funds? I need it urgently.',
        timestamp: new Date('2024-02-10T09:40:00'),
        cxRating: 5
      },
      {
        id: '6',
        sender: 'agent' as const,
        content: 'We offer same-day approval for pre-qualified customers. Once documents are verified digitally, funds can be disbursed within 24 hours. Shall I initiate your application?',
        timestamp: new Date('2024-02-10T09:42:00')
      }
    ],
    'card_activation': [
      {
        id: '1',
        sender: 'customer' as const,
        content: 'I activated my new card yesterday, but it\'s still not working',
        timestamp: new Date('2024-02-11T14:20:00'),
        cxRating: 2
      },
      {
        id: '2',
        sender: 'agent' as const,
        content: 'I understand your concern. Let me check the activation status. Can you please provide the last 4 digits of your card?',
        timestamp: new Date('2024-02-11T14:22:00')
      },
      {
        id: '3',
        sender: 'customer' as const,
        content: 'The last 4 digits are 4523. My contact is +91 9876543210 and email is customer@email.com',
        timestamp: new Date('2024-02-11T14:25:00')
      },
      {
        id: '4',
        sender: 'agent' as const,
        content: 'I can see the card was activated successfully. Sometimes it takes 24-48 hours for the system to update. Please try using it now. If it still doesn\'t work, there might be a technical issue.',
        timestamp: new Date('2024-02-11T14:27:00')
      },
      {
        id: '5',
        sender: 'customer' as const,
        content: 'I just tried again and it worked! Thank you for your help.',
        timestamp: new Date('2024-02-11T14:30:00'),
        cxRating: 4
      }
    ],
    'emi_query': [
      {
        id: '1',
        sender: 'customer' as const,
        content: 'Can I prepay part of my personal loan? What are the charges?',
        timestamp: new Date('2024-02-12T11:15:00')
      },
      {
        id: '2',
        sender: 'agent' as const,
        content: 'Yes, you can make partial prepayments. For loans older than 12 months, there are no prepayment charges. For newer loans, there\'s a 2% charge on the prepaid amount.',
        timestamp: new Date('2024-02-12T11:17:00')
      },
      {
        id: '3',
        sender: 'customer' as const,
        content: 'My loan is 8 months old. If I prepay $1,000, what will the charge be?',
        timestamp: new Date('2024-02-12T11:20:00')
      },
      {
        id: '4',
        sender: 'agent' as const,
        content: 'For a $1,000 prepayment, the charge would be $40. This will reduce your principal and save on future interest. Would you like me to calculate your new payment?',
        timestamp: new Date('2024-02-12T11:22:00')
      },
      {
        id: '5',
        sender: 'customer' as const,
        content: 'Yes please, and also tell me how to make the prepayment.',
        timestamp: new Date('2024-02-12T11:25:00'),
        cxRating: 5
      }
    ],
    'insurance_claim': [
      {
        id: '1',
        sender: 'customer' as const,
        content: 'I need to file a claim for my health insurance. My policy number is BF123456789.',
        timestamp: new Date('2024-02-13T10:00:00')
      },
      {
        id: '2',
        sender: 'agent' as const,
        content: 'I can help you with the claim process. Is this for hospitalization or OPD expenses? Also, do you have all the medical bills and discharge summary?',
        timestamp: new Date('2024-02-13T10:02:00')
      },
      {
        id: '3',
        sender: 'customer' as const,
        content: 'It\'s for hospitalization. I have all documents including bills totaling $8,500.',
        timestamp: new Date('2024-02-13T10:05:00')
      },
      {
        id: '4',
        sender: 'agent' as const,
        content: 'Perfect. I\'ll initiate the claim process. Please upload the documents through our mobile app or email them to claims@apexbank.com with your policy number in the subject.',
        timestamp: new Date('2024-02-13T10:07:00')
      },
      {
        id: '5',
        sender: 'customer' as const,
        content: 'How long will the claim settlement take?',
        timestamp: new Date('2024-02-13T10:10:00'),
        cxRating: 4
      },
      {
        id: '6',
        sender: 'agent' as const,
        content: 'Claim settlement typically takes 7-15 working days after document verification. You\'ll receive regular updates via SMS and email.',
        timestamp: new Date('2024-02-13T10:12:00')
      }
    ]
  };

  return scenarios[scenario as keyof typeof scenarios] || scenarios['loan_application'];
};

// Generate mock tool calls for a conversation based on scenario
const generateToolCalls = (conversationId: string, scenario: string): ToolCall[] => {
  const scenarioToolCalls = {
    'loan_application': [
      {
        name: 'getCreditScore',
        description: 'Check customer credit score for loan eligibility',
        parameters: { customerType: 'existing', includeHistory: true },
        result: 'Credit score retrieved: 742 (Good)',
        status: 'success' as const,
        relatedToMessage: 3 // After customer asks about loan amount
      },
      {
        name: 'calculateEMI',
        description: 'Calculate monthly payment for loan amount and tenure',
        parameters: { amount: 5000, tenure: 12, interestRate: 9.9 },
        result: 'Payment calculated: $430 per month for $5,000',
        status: 'success' as const,
        relatedToMessage: 4 // After agent mentions loan amount
      }
    ],
    'card_activation': [
      {
        name: 'checkCardStatus',
        description: 'Verify card activation status in system',
        parameters: { cardNumber: '****4523', verificationType: 'activation' },
        result: 'Card status: Activated, but merchant network sync pending',
        status: 'success' as const,
        relatedToMessage: 3 // After customer provides card details
      }
    ],
    'emi_query': [
      {
        name: 'getLoanDetails',
        description: 'Retrieve current loan details and payment history',
        parameters: { loanId: 'PL789456', includePaymentHistory: true },
        result: 'Loan details: $8.5k outstanding, 28 payments remaining',
        status: 'success' as const,
        relatedToMessage: 1 // After initial query
      },
      {
        name: 'calculatePrepayment',
        description: 'Calculate prepayment impact and new EMI',
        parameters: { currentOutstanding: 8500, prepayAmount: 1000 },
        result: 'New payment: $425 (reduced from $480), interest saved: $320',
        status: 'success' as const,
        relatedToMessage: 4 // After agent explains charges
      }
    ],
    'insurance_claim': [
      {
        name: 'validatePolicy',
        description: 'Verify policy status and claim eligibility',
        parameters: { policyNumber: 'BF123456789', claimType: 'hospitalization' },
        result: 'Policy active, hospitalization coverage: $50k, no waiting period',
        status: 'success' as const,
        relatedToMessage: 2 // After agent asks about claim type
      },
      {
        name: 'initiateClaim',
        description: 'Create claim request in system',
        parameters: { policyNumber: 'BF123456789', claimAmount: 85000, hospitalId: 'HSP001' },
        result: 'Claim created: CLM2024078901, Reference ID sent to customer',
        status: 'success' as const,
        relatedToMessage: 4 // After document upload instruction
      }
    ]
  };

  const toolCalls = scenarioToolCalls[scenario as keyof typeof scenarioToolCalls] || [];
  
  return toolCalls.map((toolCall, index) => ({
    ...toolCall,
    id: `tool_${conversationId}_${index + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000) // Within last day
  }));
};

// Generate mock user permissions for a conversation based on scenario
const generateUserPermissions = (conversationId: string, scenario: string): UserPermission[] => {
  const scenarioPermissions = {
    'loan_application': [
      {
        action: 'Check Credit Score',
        description: 'User granted permission to check credit score by clicking "Allow Credit Check" button',
        granted: true,
        duration: 'one-time' as const,
        grantedAt: new Date(Date.now() - Math.random() * 3600000)
      },
      {
        action: 'Access Financial History',
        description: 'Permission to view 12-month financial transaction history for loan assessment',
        granted: true,
        duration: 'session' as const,
        grantedAt: new Date(Date.now() - Math.random() * 1800000)
      }
    ],
    'card_activation': [
      {
        action: 'Card Status Verification',
        description: 'Permission to verify card details and activation status',
        granted: true,
        duration: 'one-time' as const,
        grantedAt: new Date(Date.now() - Math.random() * 1800000)
      }
    ],
    'emi_query': [
      {
        action: 'Access Loan Details',
        description: 'Permission to view detailed loan information and payment history',
        granted: true,
        duration: 'session' as const,
        grantedAt: new Date(Date.now() - Math.random() * 2400000)
      },
      {
        action: 'EMI Modification Authorization',
        description: 'User authorized EMI schedule changes by clicking "Approve Changes"',
        granted: true,
        duration: 'permanent' as const,
        grantedAt: new Date(Date.now() - Math.random() * 1800000)
      }
    ],
    'insurance_claim': [
      {
        action: 'Policy Verification',
        description: 'Permission to access policy details and coverage information',
        granted: true,
        duration: 'session' as const,
        grantedAt: new Date(Date.now() - Math.random() * 3600000)
      },
      {
        action: 'Process Insurance Claim',
        description: 'Authorization to initiate claim processing and access medical records',
        granted: true,
        duration: 'one-time' as const,
        grantedAt: new Date(Date.now() - Math.random() * 1800000),
        expiresAt: new Date(Date.now() + 7200000) // Expires in 2 hours
      }
    ]
  };

  const permissions = scenarioPermissions[scenario as keyof typeof scenarioPermissions] || [];
  
  return permissions.map((permission, index) => ({
    ...permission,
    id: `perm_${conversationId}_${index + 1}`
  }));
};

// Generate conversations for each topic
const generateTopicConversations = (topicName: string, category: TopicCategory, count: number): Conversation[] => {
  const conversations: Conversation[] = [];
  
  for (let i = 0; i < count; i++) {
    const customer = mockCustomers[i % mockCustomers.length];
    const scenarios = ['loan_application', 'card_activation', 'emi_query', 'insurance_claim'];
    const scenario = scenarios[i % scenarios.length];
    
    const messages = generateConversationMessages(customer.id, scenario);
    const lastMessage = messages[messages.length - 1];
    
    const conversationId = `conv_${topicName}_${i + 1}`;
    
    conversations.push({
      id: conversationId,
      customer,
      messages,
      cxRating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
      status: ['resolved', 'pending', 'escalated'][Math.floor(Math.random() * 3)] as any,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      updatedAt: lastMessage.timestamp,
      preview: messages[0]?.content.substring(0, 80) + '...' || '',
      toolCalls: generateToolCalls(conversationId, scenario),
      permissions: generateUserPermissions(conversationId, scenario)
    });
  }
  
  return conversations;
};

// Generate sparkline data (7 days trend)
const generateSparklineData = (): number[] => {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 50);
};

// Mock topics data
export const mockTopics: Topic[] = [
  {
    id: 'personal_loans',
    name: 'Personal Loans',
    description: 'Credit union personal loan applications, instant approvals, documentation verification, credit assessment, and EMI restructuring for salaried and self-employed customers.',
    conversationCount: 2840,
    cxScore: 78,
    cxScoreChange: 5.4,
    trend: 'up',
    category: 'loans',
    conversations: generateTopicConversations('personal_loans', 'loans', 15),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('loans')
  },
  {
    id: 'emi_financing',
    name: 'EMI & Financing Solutions',
    description: 'Credit union EMI calculations, flexible repayment options, prepayment benefits, loan tenure modifications, and structured financing for consumer durables.',
    conversationCount: 1850,
    cxScore: 85,
    cxScoreChange: 3.7,
    trend: 'up',
    category: 'emi',
    conversations: generateTopicConversations('emi_financing', 'emi', 12),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('emi')
  },
  {
    id: 'investment_products',
    name: 'Investment & Wealth Products',
    description: 'Wealth management services, portfolio reviews, SIP consultations, risk assessments, and advisory support for high-net-worth members.',
    conversationCount: 1200,
    cxScore: 89,
    cxScoreChange: 6.2,
    trend: 'up',
    category: 'investments',
    conversations: generateTopicConversations('investment_products', 'investments', 10),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('investments')
  },
  {
    id: 'insurance_services',
    name: 'Insurance & Protection Plans',
    description: 'Insurance products, health coverage, life insurance, claim assistance, premium payment support, and policy renewals.',
    conversationCount: 980,
    cxScore: 82,
    cxScoreChange: 2.8,
    trend: 'up',
    category: 'insurance',
    conversations: generateTopicConversations('insurance_services', 'insurance', 8),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('insurance')
  },
  {
    id: 'digital_payments',
    name: 'Digital Payments & UPI',
    description: 'Payment gateway solutions, card network integrations, transaction troubleshooting, refund processing, and merchant settlement support.',
    conversationCount: 720,
    cxScore: 74,
    cxScoreChange: 1.8,
    trend: 'up',
    category: 'payments',
    conversations: generateTopicConversations('digital_payments', 'payments', 8),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('payments')
  },
  {
    id: 'account_management',
    name: 'Customer Account Services',
    description: 'Customer onboarding, KYC compliance, account maintenance, profile updates, and service request management.',
    conversationCount: 650,
    cxScore: 79,
    cxScoreChange: 2.4,
    trend: 'up',
    category: 'account',
    conversations: generateTopicConversations('account_management', 'account', 7),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('account')
  },
  {
    id: 'fraud_security',
    name: 'Security & Fraud Prevention',
    description: 'Security protocols, fraud detection alerts, identity verification, suspicious transaction monitoring, and cyber security measures.',
    conversationCount: 580,
    cxScore: 88,
    cxScoreChange: 4.1,
    trend: 'up',
    category: 'security',
    conversations: generateTopicConversations('fraud_security', 'security', 6),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('security')
  },
  {
    id: 'financial_planning',
    name: 'Financial Planning & Advisory',
    description: 'Financial advisory services, goal-based planning, tax optimization strategies, retirement planning, and personalized financial guidance.',
    conversationCount: 480,
    cxScore: 86,
    cxScoreChange: 3.5,
    trend: 'up',
    category: 'budgeting',
    conversations: generateTopicConversations('financial_planning', 'budgeting', 6),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('budgeting')
  },
  {
    id: 'card_services',
    name: 'Card Services & Management',
    description: 'Co-branded credit cards, card activation, limit enhancement, reward point redemption, and card replacement services.',
    conversationCount: 420,
    cxScore: 72,
    cxScoreChange: -1.2,
    trend: 'down',
    category: 'cards',
    conversations: generateTopicConversations('card_services', 'cards', 5),
    sparklineData: generateSparklineData(),
    gradient: getCategoryGradient('cards')
  }
];

// Helper functions for filtering and searching
export const filterTopicsByDateRange = (topics: Topic[], startDate: Date, endDate: Date): Topic[] => {
  return topics.map(topic => ({
    ...topic,
    conversations: topic.conversations.filter(conv => 
      conv.createdAt >= startDate && conv.createdAt <= endDate
    )
  })).filter(topic => topic.conversations.length > 0);
};

export const filterTopicsByCXScore = (topics: Topic[], minScore: number, maxScore: number): Topic[] => {
  return topics.filter(topic => topic.cxScore >= minScore && topic.cxScore <= maxScore);
};

export const searchTopics = (topics: Topic[], query: string): Topic[] => {
  if (!query.trim()) return topics;
  
  const lowercaseQuery = query.toLowerCase();
  return topics.filter(topic => 
    topic.name.toLowerCase().includes(lowercaseQuery) ||
    topic.description.toLowerCase().includes(lowercaseQuery) ||
    topic.conversations.some(conv => 
      conv.customer.name.toLowerCase().includes(lowercaseQuery) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(lowercaseQuery))
    )
  );
};

// Default filter state
export const defaultFilters = {
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  },
  cxScoreRange: {
    min: 0,
    max: 100
  },
  searchQuery: '',
  categories: [] as TopicCategory[],
  status: [] as any[]
};