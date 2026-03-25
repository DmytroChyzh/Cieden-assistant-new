export type ToolCallMode = 'default' | 'update' | 'overlay';

function normalizeToolName(name: string): string {
  const map: Record<string, string> = {
    showAccountBalance: 'show_balance',
    showSavingsGoal: 'show_savings_goal',
    showDocumentId: 'show_document_id',
    showLoans: 'show_loans',
    showLendingOptions: 'show_lending_options',
    showCreditScore: 'show_credit_score',
    showEMIInfo: 'show_emi_info',
    startQuiz: 'start_quiz',
    updateQuiz: 'update_quiz',
  };
  const cleaned = name.replace(/[\s-]/g, '_');
  return map[name] || cleaned.toLowerCase();
}

const KNOWN_TOOL_NAMES = new Set([
  // Sales/info tools rendered as cards in chat
  'show_cases',
  'show_best_case',
  'show_engagement_models',
  'generate_estimate',
  'open_calculator',
  'show_about',
  'show_process',
  'show_getting_started',
  'show_support',
  'show_project_brief',
  'show_next_steps',
  'book_call',
  'show_session_summary',
]);

export function parseToolCall(content: string):
  | { toolName: string; data: any; mode: ToolCallMode }
  | null {
  const raw = content?.trim();
  if (!raw || typeof raw !== 'string') return null;

  // Fallback: sometimes the agent returns just the tool name (e.g. "show_about")
  // without our strict TOOL_CALL protocol. Support that so cards still render.
  if (!raw.startsWith('TOOL_CALL:') && KNOWN_TOOL_NAMES.has(raw.toLowerCase())) {
    return {
      toolName: normalizeToolName(raw),
      data: {},
      mode: 'default',
    };
  }

  if (!raw.startsWith('TOOL_CALL:')) return null;
  try {
    const match = raw.match(/^TOOL_CALL:([^:]+):(.+)$/);
    if (!match) return null;
    const [, rawName, jsonData] = match;
    const data = JSON.parse(jsonData);
    return { toolName: normalizeToolName(rawName), data, mode: (data.mode as ToolCallMode) || 'default' };
  } catch {
    return null;
  }
}


