import { calculateRealisticEstimation } from "./companyEstimations";
import type { EstimateMessage, ProjectEstimate } from "./types";

const TOTAL_ESTIMATE_STEPS = 5;

function analyzeConversationForEstimate(
  messages: EstimateMessage[]
): {
  projectType: string;
  complexity: string;
  features: string[];
  specialRequirements: string[];
} {
  const conversationText = messages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  let projectType = "website";
  let complexity = "medium";
  const features: string[] = [];
  const specialRequirements: string[] = [];

  if (
    /мобільний|додаток|app|ios|android/i.test(conversationText)
  ) {
    projectType = "web-app";
    features.push("Mobile interface", "Push notifications");
    if (
      /веб|web|сайт|адмін|панель/i.test(conversationText)
    ) {
      features.push("Web interface", "Responsive design", "Admin panel");
      complexity = "high";
    }
  } else if (
    /магазин|e-commerce|продаж|товар|каталог/i.test(conversationText)
  ) {
    projectType = "e-commerce";
    features.push("Product catalog", "Cart", "Payments", "Personal account");
  } else if (
    /дашборд|dashboard|аналітика|звіти/i.test(conversationText)
  ) {
    projectType = "dashboard";
    features.push("Charts", "Widgets", "Analytics", "Reports");
  } else if (/сайт|website|лендінг/i.test(conversationText)) {
    projectType = "website";
  }

  if (
    /простий|базовий|мінімальний/i.test(conversationText)
  )
    complexity = "low";
  else if (
    /складний|enterprise|великий|багато|комплексний/i.test(conversationText)
  )
    complexity = "high";
  else if (/середній|стандартний/i.test(conversationText)) complexity = "medium";

  if (/чат|chat|повідомлення/i.test(conversationText))
    features.push("Chat/Support");
  if (/пошук|search|фільтр/i.test(conversationText))
    features.push("Search and filters");
  if (/авторизація|login|реєстрація/i.test(conversationText))
    features.push("Auth", "Registration");
  if (/ai|аі|штучний інтелект/i.test(conversationText)) {
    features.push("AI features");
    specialRequirements.push("AI/ML");
  }
  if (/інтеграція|api/i.test(conversationText)) {
    features.push("API integrations");
    specialRequirements.push("Integrations");
  }
  if (/багатомовність|локалізація|i18n/i.test(conversationText)) {
    features.push("Multilingual");
    specialRequirements.push("Localization");
  }
  if (/швидко|терміново|urgent/i.test(conversationText))
    specialRequirements.push("Urgent");
  if (/безпека|security|шифрування/i.test(conversationText))
    specialRequirements.push("High security");
  if (/масштабування|scaling/i.test(conversationText))
    specialRequirements.push("Scaling");
  if (/b2b|бізнес|корпоративний/i.test(conversationText)) {
    if (complexity === "low") complexity = "medium";
    features.push("B2B features");
  }
  if (/b2c|споживачі|клієнти/i.test(conversationText))
    features.push("B2C features");

  return {
    projectType,
    complexity,
    features,
    specialRequirements,
  };
}

export function getTotalEstimateSteps(): number {
  return TOTAL_ESTIMATE_STEPS;
}

export function generateProjectEstimate(
  messages: EstimateMessage[],
  estimateStep: number,
  language: "uk" | "en" = "en"
): ProjectEstimate {
  const isUk = language === "uk";

  const emptyEstimate: ProjectEstimate = {
    currentRange: { min: 0, max: 0 },
    initialRange: { min: 0, max: 0 },
    currency: "USD",
    confidence: "low",
    estimatedAt: new Date(),
    timeline: isUk ? "Визначається..." : "Determining...",
    team: {
      designers: ["UI/UX Designer"],
      contactPerson: "Project Manager",
      contactEmail: "hello@example.com",
    },
    phases: {
      "ux-research": isUk ? "🔍 UX Дослідження (0 год, $0)" : "🔍 UX Research (0h, $0)",
      "ui-design": isUk ? "🎨 UI Дизайн (0 год, $0)" : "🎨 UI Design (0h, $0)",
      prototyping: isUk ? "⚡ Прототипування (0 год, $0)" : "⚡ Prototyping (0h, $0)",
      "design-system": isUk ? "📐 Дизайн-система (0 год, $0)" : "📐 Design System (0h, $0)",
      "mobile-adaptive": isUk ? "📱 Мобільна адаптація (0 год, $0)" : "📱 Mobile Adaptive (0h, $0)",
    },
    phaseDescriptions: {
      "ux-research": isUk ? "Очікуємо інформацію про ваш проект..." : "Waiting for project details...",
      "ui-design": isUk ? "Очікуємо інформацію про ваш проект..." : "Waiting for project details...",
      prototyping: isUk ? "Очікуємо інформацію про ваш проект..." : "Waiting for project details...",
      "design-system": isUk ? "Очікуємо інформацію про ваш проект..." : "Waiting for project details...",
      "mobile-adaptive": isUk ? "Очікуємо інформацію про ваш проект..." : "Waiting for project details...",
    },
  };

  if (estimateStep < 1) return emptyEstimate;

  const { projectType, complexity, features, specialRequirements } =
    analyzeConversationForEstimate(messages);
  const companyEstimation = calculateRealisticEstimation(
    projectType,
    complexity,
    features,
    specialRequirements
  );
  const accuracyPercentage = Math.min(95, 20 + estimateStep * 15);

  const designerLabels =
    language === "uk"
      ? ["UI/UX дизайнер", "UX дослідник", "Візуальний дизайнер", "Design Lead"]
      : ["UI/UX Designer", "UX Researcher", "Visual Designer", "Design Lead"];

  const designers = Array(Math.max(1, Math.round(companyEstimation.teamSize)))
    .fill(0)
    .map((_, i) => designerLabels[i] ?? "Designer");

  return {
    currentRange: {
      min: companyEstimation.minPrice,
      max: companyEstimation.maxPrice,
    },
    initialRange: {
      min: companyEstimation.minHours,
      max: companyEstimation.maxHours,
    },
    currency: "USD",
    confidence:
      estimateStep >= 3 ? "high" : estimateStep >= 2 ? "medium" : "low",
    estimatedAt: new Date(),
    timeline: companyEstimation.timeline,
    team: {
      designers,
      contactPerson: "Project Manager",
      contactEmail: "hello@example.com",
    },
    phases: {
      "ux-research": isUk ? "Дослідження користувачів" : "User Research",
      "ui-design": isUk ? "UI дизайн" : "UI Design",
      prototyping: isUk ? "Прототипування" : "Prototyping",
      "design-system": isUk ? "Дизайн-система" : "Design System",
      "mobile-adaptive": isUk ? "Мобільна адаптація" : "Mobile Adaptation",
    },
    phaseDescriptions: {
      "ux-research": isUk ? "Дослідження користувачів" : "User Research",
      "ui-design": isUk ? "UI дизайн" : "UI Design",
      prototyping: isUk ? "Прототипування" : "Prototyping",
      "design-system": isUk ? "Дизайн-система" : "Design System",
      "mobile-adaptive": isUk ? "Мобільна адаптація" : "Mobile Adaptation",
    },
    accuracyPercentage,
  };
}
