import type { ConversationType, EstimateMessage } from "./types";

const PROJECT_KEYWORDS = [
  "розробити",
  "створити",
  "зробити",
  "побудувати",
  "замовити",
  "новий проєкт",
  "новий сайт",
  "новий додаток",
  "новий дизайн",
  "інтернет-магазин",
  "лендінг",
  "портал",
  "система",
  "платформа",
  "мобільний додаток",
  "веб-додаток",
  "електронна комерція",
  "редизайн",
  "переробити",
  "покращити",
  "оновлювати",
  "develop",
  "create",
  "build",
  "make",
  "order",
  "new project",
  "new website",
  "new app",
  "new design",
  "e-commerce",
  "landing page",
  "portal",
  "mobile app",
  "web application",
  "online store",
  "redesign",
  "rebuild",
  "improve",
  "update",
];

const ESTIMATE_KEYWORDS = [
  "скільки коштує",
  "вартість",
  "ціна",
  "бюджет",
  "естімейт",
  "розрахунок",
  "оцінка",
  "терміни",
  "скільки часу",
  "how much",
  "cost",
  "price",
  "budget",
  "estimate",
  "calculation",
  "timeline",
  "how long",
  "duration",
  "допоможи з естімейтом",
  "вирахувати вартість",
  "скільки це коштуватиме",
];

const GENERAL_KEYWORDS = [
  "команда",
  "компанія",
  "портфоліо",
  "team",
  "company",
  "portfolio",
  "experience",
  "cases",
];

export function analyzeConversationType(
  messages: EstimateMessage[]
): ConversationType {
  if (!messages?.length) return "general";

  let projectScore = 0;
  let estimateScore = 0;

  messages.forEach((message) => {
    if (message.role !== "user") return;
    const content = message.content.toLowerCase();

    PROJECT_KEYWORDS.forEach((keyword) => {
      if (content.includes(keyword)) projectScore += 3;
    });
    ESTIMATE_KEYWORDS.forEach((keyword) => {
      if (content.includes(keyword)) estimateScore += 2;
    });
    GENERAL_KEYWORDS.forEach((keyword) => {
      if (content.includes(keyword)) projectScore -= 1;
    });
  });

  if (projectScore > 0) {
    return estimateScore > 0 ? "estimate" : "project";
  }
  return "general";
}

export function shouldShowProjectCard(
  conversationType: ConversationType
): boolean {
  return conversationType === "project" || conversationType === "estimate";
}

export function shouldShowEstimate(
  conversationType: ConversationType,
  estimateStep: number
): boolean {
  if (conversationType === "general") return false;
  if (conversationType === "estimate") return true;
  if (conversationType === "project" && estimateStep >= 1) return true;
  return false;
}
