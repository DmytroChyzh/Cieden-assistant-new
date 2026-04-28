const stripTrailingSuggestionArray = (value: string): string => {
  const input = value || "";
  const match = input.match(/\[([\s\S]*?)\]\s*$/);
  if (!match) return input;
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      parsed = JSON.parse(match[0].replace(/'/g, '"'));
    }
    if (!Array.isArray(parsed)) return input;
    const allStrings = parsed.every((item) => typeof item === "string" && item.trim().length > 0);
    if (!allStrings) return input;
    return input.slice(0, input.length - match[0].length).trimEnd();
  } catch {
    return input;
  }
};

/** Normalize assistant text for dedupe keys (strips estimate protocol + light markdown). */
export const normalizeAssistantMessage = (value: string): string =>
  stripTrailingSuggestionArray(value || "")
    .replace(/^\s*\[[^\]]+\]\s*/g, "")
    .replace(/\[ESTIMATE\s+(?:MODE|PANEL)\][^\n]*\n?/gi, "")
    .replace(/ESTIMATE_PANEL_RESULT:\s*\{[\s\S]*?\}/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`+/g, "")
    .replace(/#{1,6}\s?/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .trim()
    .replace(/[.,!?;:]+$/g, "");

export const normalizeIntroText = (value: string): string =>
  (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .trim();

export const isEstimateFlowUiActive = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    __ciedenEstimatePanelOpen?: boolean;
    __ciedenEstimateProgressActive?: boolean;
  };
  return w.__ciedenEstimatePanelOpen === true || w.__ciedenEstimateProgressActive === true;
};

export const shouldShowIntroQuickPath = ({
  conversationId,
  convexMessagesLoading,
  welcomeHubDismissed,
}: {
  conversationId: unknown;
  convexMessagesLoading: boolean;
  welcomeHubDismissed: boolean;
}): boolean => Boolean(conversationId && !convexMessagesLoading && !welcomeHubDismissed);

export function isLikelyDefaultCiedenGreeting(content: string): boolean {
  const t = content.trim().toLowerCase();
  if (t.length > 700) return false;
  if (!t.includes("cieden")) return false;
  const hints = [
    "design assistant",
    "ai design assistant",
    "how can i help",
    "how can i help you today",
    "welcome to cieden",
    "i'm the cieden",
    "i am the cieden",
    "i can explain who cieden",
    "how would you like me to address you",
    "cieden ai assistant",
    "your guide to our ui/ux",
    "we can chat by voice or text",
    "before we begin",
  ];
  return hints.some((h) => t.includes(h));
}

export function isEstimateRelevantAssistantQuestion(content: string): boolean {
  const t = (content || "").trim().toLowerCase();
  if (!t || !t.includes("?")) return false;

  // Hard-stop onboarding/welcome questions during estimate flow.
  if (
    t.includes("how should i address you") ||
    t.includes("what would you like to explore") ||
    t.includes("how can i help you today") ||
    t.includes("before we begin") ||
    t.includes("continue by voice") ||
    t.includes("continue by text")
  ) {
    return false;
  }

  // Allow project/estimate-scoping questions.
  return (
    /(project|product|scope|feature|screen|platform|timeline|deadline|budget|team|users|user|audience|goal|business|role|integrat|flow|requirements|mvp|complexity|redesign|website|app)/.test(
      t,
    ) ||
    /(проєкт|проект|обсяг|функц|екран|платформ|термін|дедлайн|бюджет|команд|користувач|аудитор|ціл|бізнес|рол|інтеграц|флоу|вимог|mvp|складн|редизайн|сайт|додат)/.test(
      t,
    )
  );
}

/** In estimate mode keep only one concise, relevant question from noisy AI text. */
export function extractPrimaryEstimateQuestion(content: string): string | null {
  const raw = (content || "").trim();
  if (!raw) return null;

  // Prefer explicit question chunks first. This also handles malformed
  // AI output like "?Understood..." (no whitespace after "?").
  const questionChunks = (raw.match(/[^?]*\?/g) || [])
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((chunk) => {
      const nextQuestionIdx = chunk.toLowerCase().indexOf("next question:");
      return nextQuestionIdx >= 0 ? chunk.slice(nextQuestionIdx).trim() : chunk;
    });
  const relevantQuestion = questionChunks.find((s) =>
    isEstimateRelevantAssistantQuestion(s),
  );
  if (relevantQuestion) return relevantQuestion;

  // Fallback to sentence split for non-question punctuation layouts.
  const sentences = raw
    .split(/(?<=[.!?])(?:\s+|(?=[A-ZА-ЯІЇЄ]))/)
    .map((s) => s.trim())
    .filter(Boolean);
  const relevantSentence = sentences.find(
    (s) => s.includes("?") && isEstimateRelevantAssistantQuestion(s),
  );
  if (relevantSentence) return relevantSentence;

  // Fallback: if text contains a question mark, take the first question chunk.
  const firstQuestionMark = raw.indexOf("?");
  if (firstQuestionMark > 0) {
    const chunkStart = Math.max(raw.lastIndexOf("\n", firstQuestionMark), raw.lastIndexOf(". ", firstQuestionMark - 1), raw.lastIndexOf("! ", firstQuestionMark - 1)) + 1;
    const fallback = raw.slice(chunkStart, firstQuestionMark + 1).trim();
    if (fallback && isEstimateRelevantAssistantQuestion(fallback)) {
      return fallback;
    }
  }

  return null;
}
