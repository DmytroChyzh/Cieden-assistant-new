/** Normalize assistant text for dedupe keys (strips estimate protocol + light markdown). */
export const normalizeAssistantMessage = (value: string): string =>
  (value || "")
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
    /(project|product|scope|feature|screen|platform|timeline|deadline|budget|team|users|role|integrat|flow|requirements|mvp|complexity)/.test(
      t,
    ) ||
    /(проєкт|проект|обсяг|функц|екран|платформ|термін|дедлайн|бюджет|команд|користувач|рол|інтеграц|флоу|вимог|mvp|складн)/.test(
      t,
    )
  );
}
