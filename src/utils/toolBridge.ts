/**
 * Simple Adapter Bridge: ElevenLabs Tools → CopilotKit Actions
 * 
 * This module provides a type-safe, performant bridge between ElevenLabs tool calls
 * and CopilotKit action handlers, replacing the previous string-parsing approach.
 */

export interface ToolCallEvent {
  name: string;
  parameters: unknown;
  toolCallId?: string;
  timestamp?: number;
}

export interface ActionHandlers {
  show_cases?: (params: ShowCasesParams) => Promise<string> | string;
  show_best_case?: (params: ShowBestCaseParams) => Promise<string> | string;
  show_engagement_models?: (params: ShowEngagementModelsParams) => Promise<string> | string;
  generate_estimate?: (params: GenerateEstimateParams) => Promise<string> | string;
  open_calculator?: (params: OpenCalculatorParams) => Promise<string> | string;
  show_about?: (params: ShowAboutParams) => Promise<string> | string;
  show_process?: (params: ShowProcessParams) => Promise<string> | string;
  show_getting_started?: (params: ShowGettingStartedParams) => Promise<string> | string;
  show_support?: (params: ShowSupportParams) => Promise<string> | string;
  show_project_brief?: (params: ProjectBriefParams) => Promise<string> | string;
  show_next_steps?: (params: NextStepsParams) => Promise<string> | string;
  book_call?: (params: BookCallParams) => Promise<string> | string;
  show_session_summary?: (params: SessionSummaryParams) => Promise<string> | string;
}

export interface BalanceParams {
  balance: number;
  currency?: string;
  previousBalance?: number;
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface SavingsGoalParams {
  goalId?: string;
  currentSavings: number;
  goalAmount: number;
  goalName?: string;
  currency?: string;
  deadline?: string;
  monthlyTarget?: number;
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface ChartParams {
  title: string;
  data: Array<{
    name: string;
    value: number;
    category?: string;
  }>;
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface DocumentIdParams {
  documentId?: string; // Optional - if not provided, shows most recent/default document
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface LoansParams {
  totalLoans: number;
  paidAmount: number;
  currency?: string;
  monthlyData?: Array<{
    month: string;
    amount: number;
    isPaid?: boolean;
  }>;
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface LendingOptionsParams {
  options?: Array<{
    id: string;
    title: string;
    loanAmount: number;
    interestRate: number;
    term: number;
    monthlyPayment: number;
    totalInterest: number;
    features: string[];
    recommended?: boolean;
  }>;
  currency?: string;
  userProfile?: {
    creditScore?: number;
    monthlyIncome?: number;
  };
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface CreditScoreParams {
  score: number;
  range?: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  factors?: Array<{
    name: string;
    impact: 'Positive' | 'Negative' | 'Neutral';
    description: string;
  }>;
  lastUpdated?: string;
  provider?: string;
  tips?: string[];
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface EMIParams {
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  emi: number;
  currency?: string;
  principal?: number;
  interest?: number;
  totalAmount?: number;
  loanType?: string;
  mode?: 'update' | 'overlay';  // Optional, undefined = default
}

export interface StartQuizParams {
  quiz_id?: string;  // Preset quiz identifier (e.g., 'loan_eligibility', 'credit_health')
  quiz_json?: string; // JSON-encoded quiz payload with title and questions
  mode?: 'update' | 'overlay';  // Optional, undefined = default (likely overlay for quiz)
}

export interface UpdateQuizParams {
  question_id: string;    // Stable identifier of the current question
  action: 'selectOption' | 'nextQuestion' | 'prevQuestion' | 'showResults';
  selected_value?: string; // Required when action is 'selectOption'
  mode?: 'update' | 'overlay';  // Optional, likely defaults to 'update'
}

export interface ShowCasesParams {
  filter?: string;
  mode?: 'update' | 'overlay';
}

export interface ShowBestCaseParams {
  mode?: 'update' | 'overlay';
}

export interface ShowEngagementModelsParams {
  mode?: 'update' | 'overlay';
}

export interface GenerateEstimateParams {
  productType?: string;
  complexity?: string;
  scope?: string;
  timeline?: string;
  budgetHint?: number;
  mode?: 'update' | 'overlay';
}

export interface OpenCalculatorParams {
  mode?: 'update' | 'overlay';
}

export interface ShowAboutParams {
  mode?: 'update' | 'overlay';
}

export interface ShowProcessParams {
  mode?: 'update' | 'overlay';
}

export interface ShowGettingStartedParams {
  mode?: 'update' | 'overlay';
}

export interface ShowSupportParams {
  mode?: 'update' | 'overlay';
}

export interface ProjectBriefParams {
  productType?: string;
  platforms?: string[];
  budgetRange?: string;
  timeline?: string;
  primaryGoal?: string;
  secondaryGoals?: string[];
  notes?: string;
  mode?: 'update' | 'overlay';
}

export interface NextStepsParams {
  primaryAction?: 'schedule_call' | 'request_deck' | 'request_estimate';
  preferredTimeframe?: string;
  contactChannel?: 'email' | 'calendar' | 'slack' | 'other';
  mode?: 'update' | 'overlay';
}

export interface BookCallParams {
  // For now we keep it empty; tool exists mainly to render a dedicated card.
  mode?: 'update' | 'overlay';
}

export interface SessionSummaryParams {
  projectName?: string;
  keyPoints?: string[];
  decisions?: string[];
  openQuestions?: string[];
  recommendedNextStep?: string;
  mode?: 'update' | 'overlay';
}

// Helper function for tool-specific default modes (Cieden tools use default)
function getDefaultModeForTool(_toolName: string): undefined | 'update' | 'overlay' {
  return undefined;
}

/**
 * Main bridge function that routes ElevenLabs tool calls to appropriate CopilotKit action handlers
 * 
 * @param toolCall - The tool call event from ElevenLabs
 * @param actionHandlers - Object containing handler functions for each tool
 * @returns Promise resolving to the action result or error message
 */
export async function bridgeElevenLabsToolToCopilot(
  toolCall: ToolCallEvent, 
  actionHandlers: ActionHandlers
): Promise<unknown> {
  // Extract mode from parameters (undefined = default)
  const params = toolCall.parameters as any;
  const mode = params?.mode || getDefaultModeForTool(toolCall.name);
  
  console.log('🔧 Tool Bridge Processing:', {
    toolName: toolCall.name,
    mode: mode || 'default',
    hasExplicitMode: !!params?.mode,
    parameters: toolCall.parameters
  });
  
  console.log('🔧 Tool Bridge ENTRY - Function called with:', {
    toolName: toolCall.name,
    parameters: toolCall.parameters,
    timestamp: new Date().toISOString(),
    actionHandlersKeys: actionHandlers ? Object.keys(actionHandlers) : 'undefined',
    actionHandlersType: typeof actionHandlers
  });
  
  try {
    // Validate tool call structure
    if (!toolCall.name || toolCall.parameters === undefined) {
      throw new Error('Invalid tool call: missing name or parameters');
    }

    // Route to appropriate handler based on tool name (Cieden sales tools only)
    switch(toolCall.name) {
      case 'show_cases':
        if (!actionHandlers.show_cases) {
          throw new Error('show_cases handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_cases(toolCall.parameters as ShowCasesParams)
        );

      case 'show_best_case':
        if (!actionHandlers.show_best_case) {
          throw new Error('show_best_case handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_best_case(toolCall.parameters as ShowBestCaseParams)
        );

      case 'show_engagement_models':
        if (!actionHandlers.show_engagement_models) {
          throw new Error('show_engagement_models handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_engagement_models(toolCall.parameters as ShowEngagementModelsParams)
        );

      case 'generate_estimate':
        if (!actionHandlers.generate_estimate) {
          throw new Error('generate_estimate handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.generate_estimate(toolCall.parameters as GenerateEstimateParams)
        );

      case 'open_calculator':
        if (!actionHandlers.open_calculator) {
          throw new Error('open_calculator handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.open_calculator(toolCall.parameters as OpenCalculatorParams)
        );

      case 'show_about':
        if (!actionHandlers.show_about) {
          throw new Error('show_about handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_about(toolCall.parameters as ShowAboutParams)
        );

      case 'show_process':
        if (!actionHandlers.show_process) {
          throw new Error('show_process handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_process(toolCall.parameters as ShowProcessParams)
        );

      case 'show_getting_started':
        if (!actionHandlers.show_getting_started) {
          throw new Error('show_getting_started handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_getting_started(toolCall.parameters as ShowGettingStartedParams)
        );

      case 'show_support':
        if (!actionHandlers.show_support) {
          throw new Error('show_support handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_support(toolCall.parameters as ShowSupportParams)
        );

      case 'show_project_brief':
        if (!actionHandlers.show_project_brief) {
          throw new Error('show_project_brief handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_project_brief(toolCall.parameters as ProjectBriefParams)
        );

      case 'show_next_steps':
        if (!actionHandlers.show_next_steps) {
          throw new Error('show_next_steps handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_next_steps(toolCall.parameters as NextStepsParams)
        );

      case 'book_call':
        if (!actionHandlers.book_call) {
          throw new Error('book_call handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.book_call(toolCall.parameters as BookCallParams)
        );

      case 'show_session_summary':
        if (!actionHandlers.show_session_summary) {
          throw new Error('show_session_summary handler not registered');
        }
        return await Promise.resolve(
          actionHandlers.show_session_summary(toolCall.parameters as SessionSummaryParams)
        );

      default:
        console.warn(`⚠️ Unknown tool: ${toolCall.name}`);
        return `I don't know how to handle the "${toolCall.name}" tool. Available tools: ${Object.keys(actionHandlers).join(', ')}`;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Bridge execution error:', {
      toolName: toolCall.name,
      error: errorMessage,
      stack: errorStack
    });
    
    // Return user-friendly error message that ElevenLabs agent can communicate
    return `I encountered an error executing ${toolCall.name}: ${errorMessage}`;
  }
}

/**
 * Utility function to validate tool parameters against expected schema
 * This can be extended for more sophisticated validation in the future
 */
export function validateToolParameters(toolName: string, parameters: unknown): boolean {
  switch(toolName) {
    case 'show_cases':
    case 'show_best_case':
    case 'show_case_details':
    case 'show_engagement_models':
    case 'open_calculator':
    case 'show_about':
    case 'show_process':
    case 'show_getting_started':
    case 'show_support':
    case 'book_call':
      return true;

    case 'generate_estimate': {
      const params = parameters as { budgetHint?: unknown };
      if (params.budgetHint !== undefined && typeof params.budgetHint !== 'number') return false;
      return true;
    }

    default:
      return true;
  }
}

/**
 * Development helper: Log tool call statistics for debugging and monitoring
 */
export function logToolCallStats(toolCall: ToolCallEvent, executionTime: number, success: boolean): void {
  console.log('📊 Tool Call Stats:', {
    tool: toolCall.name,
    executionTime: `${executionTime}ms`,
    success,
    parameters: Object.keys(toolCall.parameters || {}),
    timestamp: new Date().toISOString()
  });
}