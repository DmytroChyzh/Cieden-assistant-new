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

export function parseToolCall(content: string):
  | { toolName: string; data: any; mode: ToolCallMode }
  | null {
  if (!content || typeof content !== 'string' || !content.startsWith('TOOL_CALL:')) return null;
  try {
    const match = content.match(/^TOOL_CALL:([^:]+):(.+)$/);
    if (!match) return null;
    const [, rawName, jsonData] = match;
    const data = JSON.parse(jsonData);
    return { toolName: normalizeToolName(rawName), data, mode: (data.mode as ToolCallMode) || 'default' };
  } catch {
    return null;
  }
}


