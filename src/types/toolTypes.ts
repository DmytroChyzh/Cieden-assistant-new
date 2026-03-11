/**
 * Shared TypeScript interfaces for ElevenLabs tool integration
 * 
 * This module defines the data structures used across the tool bridge system,
 * ensuring type safety between ElevenLabs tool calls and CopilotKit actions.
 */

/**
 * Parameters for balance display tools
 */
export interface BalanceParams {
  /** Current account balance amount */
  balance: number;
  /** Currency code (e.g. USD, EUR), defaults to USD */
  currency?: string;
  /** Previous balance for comparison (optional) */
  previousBalance?: number;
  /** Account type or name (optional) */
  accountType?: string;
}

/**
 * Parameters for chart creation tools (pie charts, bar charts, etc.)
 */
export interface ChartParams {
  /** Chart title displayed to user */
  title: string;
  /** Array of data points for the chart */
  data: ChartDataPoint[];
  /** Chart color scheme (optional) */
  colorScheme?: 'default' | 'green' | 'blue' | 'purple';
  /** Whether to show values on chart (optional) */
  showValues?: boolean;
}

/**
 * Individual data point for charts
 */
export interface ChartDataPoint {
  /** Label/name for this data point */
  name: string;
  /** Numeric value for this data point */
  value: number;
  /** Optional category for grouping */
  category?: string;
  /** Optional color override for this point */
  color?: string;
}

/**
 * Parameters for transaction-related tools (future extension)
 */
export interface TransactionParams {
  /** Transaction amount */
  amount: number;
  /** Transaction description */
  description: string;
  /** Transaction category */
  category: string;
  /** Transaction date (ISO string) */
  date: string;
  /** Currency code */
  currency?: string;
}

/**
 * Parameters for budget-related tools (future extension)
 */
export interface BudgetParams {
  /** Budget category */
  category: string;
  /** Budget limit amount */
  limit: number;
  /** Budget period (monthly, weekly, etc.) */
  period: 'monthly' | 'weekly' | 'yearly';
  /** Currency code */
  currency?: string;
}

/**
 * Generic tool result interface
 */
export interface ToolResult {
  /** Whether the tool execution was successful */
  success: boolean;
  /** Result message to return to the agent */
  message: string;
  /** Optional data payload for complex results */
  data?: unknown;
  /** Execution time in milliseconds */
  executionTime?: number;
}

/**
 * Tool execution context (for advanced use cases)
 */
export interface ToolContext {
  /** Convex conversation ID */
  conversationId?: string;
  /** User ID (if available) */
  userId?: string;
  /** Tool call timestamp */
  timestamp: number;
  /** Whether this is a test execution */
  testMode?: boolean;
}