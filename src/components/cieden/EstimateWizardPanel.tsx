"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  FileText,
  ListChecks,
  Sparkles,
  Clock3,
  Search,
  LayoutTemplate,
  Palette,
  Component,
  Wand2,
  FlaskConical,
  PackageCheck,
  MessagesSquare,
} from "lucide-react";
import { getEstimationRange, getGenericEstimationRange, type EstimationEntry } from "@/src/data/estimateRanges";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import estimatesCatalog from "@/src/data/estimates/catalog.example.json";
import { getGuestIdentityFromCookie } from "@/src/utils/guestIdentity";

type CatalogEntry = {
  id: string;
  title: string;
  domain: string | null;
  clientType: string | null;
  platform: string[];
  priceMin: number | null;
  priceMax: number | null;
  durationWeeks: number | null;
  hoursBreakdown?: Record<string, unknown>;
};

const ESTIMATE_PHASE_LABELS = [
  "Discovery",
  "UX / IA",
  "UI design",
  "Design system",
  "Prototyping",
  "Testing & iteration",
  "Handoff & support",
  "PM / communication",
] as const;
const ESTIMATE_REQUIRED_INPUTS = 8;

type PhaseLabel = (typeof ESTIMATE_PHASE_LABELS)[number];

const PHASE_DEFAULT_SPLIT: Record<PhaseLabel, number> = {
  "Discovery": 0.08,
  "UX / IA": 0.16,
  "UI design": 0.34,
  "Design system": 0.12,
  "Prototyping": 0.08,
  "Testing & iteration": 0.10,
  "Handoff & support": 0.06,
  "PM / communication": 0.06,
};

type WizardPlatform = "website" | "mobile-app" | "web-mobile" | "dashboard" | "saas" | "other";
type WizardStage   = "new" | "redesign" | "mvp" | "improvements";
type WizardGoal    = "mvp-pitch" | "launchpad" | "full-product" | "improvements";
type WizardSpecs   = "need-research" | "have-idea" | "have-specs";
type Complexity    = "essential" | "advanced" | "enterprise";
type Scope         = "1-5" | "6-15" | "16-30" | "30+" | "not_sure";
type Timeline      = "asap" | "1-3" | "3-6" | "flexible";

type EstimateMode = "chooser" | "assistant" | "wizard";
type AssistantInputKind = "file" | "text" | "chat";

const PLATFORM_OPTIONS: { id: WizardPlatform; label: string; desc: string }[] = [
  { id: "website",    label: "Website",         desc: "Marketing site, landing, blog" },
  { id: "mobile-app", label: "Mobile app",       desc: "iOS, Android or cross-platform" },
  { id: "web-mobile", label: "Web + mobile",     desc: "Both web and mobile versions" },
  { id: "dashboard",  label: "Dashboard / SaaS", desc: "Admin panel, analytics, B2B tool" },
  { id: "saas",       label: "B2C / B2B product",desc: "SaaS, marketplace, platform" },
  { id: "other",      label: "Other",            desc: "Design system, audit, or other" },
];

const STAGE_OPTIONS: { id: WizardStage; label: string; desc: string }[] = [
  { id: "new",          label: "New product from scratch", desc: "Building something brand new" },
  { id: "mvp",          label: "MVP",                      desc: "Fast first version for validation" },
  { id: "redesign",     label: "Redesign",                 desc: "Improving an existing product" },
  { id: "improvements", label: "UX / UI improvements",     desc: "Specific features or flows" },
];

const GOAL_OPTIONS: { id: WizardGoal; label: string; desc: string }[] = [
  { id: "mvp-pitch",    label: "Design MVP + pitch deck",   desc: "Validate idea, impress investors" },
  { id: "launchpad",    label: "Build launchpad version",    desc: "Ship fast, gather data, optimize" },
  { id: "full-product", label: "Full product design",        desc: "Complete, polished final product" },
  { id: "improvements", label: "UX / UI improvements",       desc: "Fix pain points in existing product" },
];

const SPECS_OPTIONS: { id: WizardSpecs; label: string; desc: string }[] = [
  { id: "need-research", label: "I need research first",           desc: "I want to explore users & market" },
  { id: "have-idea",     label: "I have a clear idea, no specs",   desc: "I know what to build but no docs yet" },
  { id: "have-specs",    label: "I have wireframes / specs",       desc: "Ready to go straight into design" },
];

const COMPLEXITY_OPTIONS: { id: Complexity; label: string; desc: string }[] = [
  { id: "essential",   label: "Essential",   desc: "Simple UI, no complex integrations. Static site, basic forms, to-do app" },
  { id: "advanced",    label: "Advanced",    desc: "Multiple features, API integrations, real-time data. AI tools, eCommerce" },
  { id: "enterprise",  label: "Enterprise",  desc: "Large-scale systems, AI, IoT, real-time. Banking, ERP, social platforms" },
];

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: "1-5",      label: "1–5 screens / pages" },
  { id: "6-15",     label: "6–15 screens" },
  { id: "16-30",    label: "16–30 screens" },
  { id: "30+",      label: "30+ screens" },
  { id: "not_sure", label: "Not sure yet" },
];

const TIMELINE_OPTIONS: { id: Timeline; label: string }[] = [
  { id: "asap",     label: "ASAP" },
  { id: "1-3",      label: "1–3 months" },
  { id: "3-6",      label: "3–6 months" },
  { id: "flexible", label: "Flexible" },
];

const CUSTOM_PLACEHOLDER = "Or write your own (optional)";

interface EstimateWizardPanelProps {
  onClose: () => void;
  conversationId?: Id<"conversations"> | null;
  variant?: "panel" | "inline" | "hidden";
  estimateThreadId?: string | null;
  onEstimateFinal?: (result: EstimateFinalResult) => void;
  onEstimateInlineActiveChange?: (active: boolean) => void;
  initialMode?: EstimateMode;
  initialStep?: number;
}

export type EstimateFinalResult = {
  minPrice: number;
  maxPrice: number;
  weeks?: number;
  timeline?: string;
  projectSummary?: string;
  // Wizard mode provides a range.
  minHours?: number;
  maxHours?: number;
  // Assistant mode provides a single computed number.
  totalHours?: number;
  phaseHours?: Record<string, number>;
};

export function EstimateWizardPanel({
  onClose,
  conversationId,
  variant = "panel",
  estimateThreadId = null,
  onEstimateFinal,
  onEstimateInlineActiveChange,
  initialMode,
  initialStep,
}: EstimateWizardPanelProps) {
  const [mode, setMode] = useState<EstimateMode>(initialMode ?? "chooser");
  const [step, setStep] = useState(initialStep ?? 0);
  const isInline = variant === "inline";
  const isHidden = variant === "hidden";
  // Wizard answers
  const [platform, setPlatform]   = useState<WizardPlatform | null>(null);
  const [stage, setStage]         = useState<WizardStage | null>(null);
  const [goal, setGoal]           = useState<WizardGoal | null>(null);
  const [specs, setSpecs]         = useState<WizardSpecs | null>(null);
  const [scope, setScope]         = useState<Scope | null>(null);
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [timeline, setTimeline]   = useState<Timeline | null>(null);
  const [extraNotes, setExtraNotes] = useState("");
  const [customByStep, setCustomByStep] = useState<Record<string, string>>({});
  const [assistantInputKind, setAssistantInputKind] = useState<AssistantInputKind>("file");
  const [estimateSessionStartedAt, setEstimateSessionStartedAt] = useState<number | null>(null);
  /** Must be a ref — if this lived in useEffect deps as state, cleanup fired EXIT right after kickoff. */
  const assistantKickoffSentRef = useRef(false);
  const lastUserMsgIdRef = useRef<string | null>(null);
  const assistantProgressSnapshotRef = useRef<string>("");
  const lastDraftEstimateSentRef = useRef<string>("");
  const lastEstimateStateSentRef = useRef<string>("");

  // Local message tracking for guest mode (when conversationId is null and Convex is skipped)
  const [localMessages, setLocalMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: number }>
  >([]);

  const guestId = getGuestIdentityFromCookie()?.guestId;
  const allMessages = useQuery(
    api.messages.list,
    conversationId
      ? {
          conversationId,
          guestId: guestId ?? undefined,
          includeEstimateThread: true,
          estimateThreadId:
            mode === "assistant" && estimateThreadId ? estimateThreadId : undefined,
        }
      : "skip",
  );

  // Capture user messages forwarded from page.tsx when estimate panel is open.
  // We keep this for BOTH guest and authenticated flows so the estimate card
  // can update immediately even if Convex persistence is delayed.
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{
        content: string;
        role?: "user" | "assistant";
        createdAt?: number;
        threadId?: string | null;
      }>;
      if (!ev.detail?.content) return;
      if (estimateThreadId && ev.detail?.threadId && ev.detail.threadId !== estimateThreadId) return;
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-${Math.random()}`,
          role: ev.detail.role ?? "user",
          content: ev.detail.content,
          createdAt: ev.detail.createdAt ?? Date.now(),
        },
      ]);
    };
    window.addEventListener("estimate-local-user-message", handler as EventListener);
    return () => window.removeEventListener("estimate-local-user-message", handler as EventListener);
  }, [estimateThreadId]);

  const estimateSessionMessages = useMemo(() => {
    const fallbackStart = Date.now() - 2 * 60 * 60 * 1000; // 2h
    const effectiveStart =
      typeof estimateSessionStartedAt === "number" ? estimateSessionStartedAt : fallbackStart;

    // Guest mode: local stream only.
    if (!conversationId) {
      return localMessages
        .filter((m) => m.createdAt >= effectiveStart)
        .sort((a, b) => a.createdAt - b.createdAt);
    }

    // Auth mode: merge Convex + local forwarded stream for immediate UI updates.
    // If Convex query is still loading, we can still work from local messages.
    const convexPart =
      allMessages?.map((m) => {
        const createdAt =
          typeof (m as any).createdAt === "number"
            ? (m as any).createdAt
            : typeof (m as any)._creationTime === "number"
              ? (m as any)._creationTime
              : 0;
        return {
          id: String((m as any)._id ?? `convex-${createdAt}-${String((m as any).role ?? "assistant")}`),
          role: (m as any).role as "user" | "assistant" | "system",
          content: String((m as any).content ?? ""),
          createdAt,
        };
      }) ?? [];

    const merged = [...convexPart, ...localMessages];
    const seen = new Set<string>();
    const deduped = merged.filter((m) => {
      const key = `${m.role}|${m.createdAt}|${m.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped
      .filter((m) => m.createdAt >= effectiveStart)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [allMessages, estimateSessionStartedAt, conversationId, localMessages]);

  const isKickoffMessage = useCallback((content: string) => {
    return (
      /i want a preliminary design estimate/i.test(content) ||
      /i chose\s+"work with the assistant"\s+for my estimate/i.test(content) ||
      /please start with one question at a time/i.test(content) ||
      /work with the assistant/i.test(content) ||
      /ask me one question at a time/i.test(content) ||
      /enter estimate mode/i.test(content) ||
      /\[estimate mode]/i.test(content)
    );
  }, []);

  // In production users often provide project details BEFORE opening the side panel.
  // If the current estimate session has no real user content yet, fall back to recent
  // conversation user messages so the draft card can still start calculating.
  const estimateAnalysisMessages = useMemo(() => {
    if (!estimateSessionMessages) return estimateSessionMessages;

    const hasSessionUserContent = estimateSessionMessages.some(
      (m) =>
        m.role === "user" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        !isKickoffMessage(m.content),
    );
    if (hasSessionUserContent) return estimateSessionMessages;

    const pool = !conversationId ? localMessages : (allMessages ?? []);
    if (!pool || pool.length === 0) return estimateSessionMessages;

    const lowerBound =
      typeof estimateSessionStartedAt === "number"
        ? Math.max(0, estimateSessionStartedAt - 2 * 60 * 60 * 1000) // 2h lookback
        : 0;

    const recent = pool.filter((m) => {
      const createdAt =
        typeof (m as any).createdAt === "number"
          ? (m as any).createdAt
          : typeof (m as any)._creationTime === "number"
            ? (m as any)._creationTime
            : 0;
      return createdAt >= lowerBound;
    });

    return recent.slice(-40);
  }, [
    estimateSessionMessages,
    conversationId,
    localMessages,
    allMessages,
    estimateSessionStartedAt,
    isKickoffMessage,
  ]);

  const extractedEstimateContext = useMemo(() => {
    if (!estimateAnalysisMessages) return null;
    const MAX_ANALYSIS_CHARS = 12000;
    // In assistant-mode we intentionally have a "kickoff" user-visible message.
    // That message MUST NOT be treated as real client answers.
    const rawUserText = estimateAnalysisMessages
      .filter((m) => m.role === "user")
      .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
      .filter((m) => !isKickoffMessage(m.content))
      .map((m) => m.content ?? "")
      .join("\n")
      .toLowerCase();

    // Performance: on very large user texts, running many regex checks over the full content
    // can block the main thread and delay UI/dispatch. We keep the start + the end.
    const userText =
      rawUserText.length <= MAX_ANALYSIS_CHARS
        ? rawUserText
        : `${rawUserText.slice(0, Math.floor(MAX_ANALYSIS_CHARS / 2))}\n...\n${rawUserText.slice(-Math.floor(MAX_ANALYSIS_CHARS / 2))}`;

    const platform =
      /(web\s*\+\s*mobile|web\s*and\s*mobile|website\s*\+\s*app|web\s*app\s*\+\s*mobile)/.test(userText) || (/(веб|web)/.test(userText) && /(моб|mobile|app)/.test(userText))
        ? "web+mobile"
        : /(mobile|ios|android|app|application|webapp|web app)/.test(userText) || /(мобіль|мобиль|додаток|апка|приложен|ios|android)/.test(userText)
          ? "mobile"
          : /(web|website|site|landing|dashboard|admin|portal|saas|crm|erp)/.test(userText) || /(веб|вебсайт|сайт|лендінг|лендинг|дашборд|кабінет|кабинет|адмін|админ|портал|саас|crm|erp)/.test(userText)
            ? "web"
            : null;

    const productStage =
      /(redesign|revamp|rebuild)/.test(userText) || /(редизайн|перероб|переработ)/.test(userText)
        ? "redesign"
        : /(from scratch|new product|new project|mvp|start from)/.test(userText) || /(з нуля|знуля|новий продукт|новий проєкт|новий проект|новый продукт|новый проект|mvp|мвп)/.test(userText)
          ? "from_scratch"
          : null;

    const audience =
      /(b2b|бізнес|бизнес|компан|business|corporate|enterprise)/.test(userText)
        ? "b2b"
        : /(b2c|покупц|покупател|клієнт|клиент|споживач|потребител|customer|consumer|individual|кінцев)/.test(userText)
          ? "b2c"
          : /(internal|внутрішн|внутренн)/.test(userText)
            ? "internal"
            : null;

    const hasGoal =
      /(goal|objective|want to|need to|problem|sell|buy|shop|store|market|ecommerce|e-commerce)/.test(userText) ||
      /(ціль|мета|хочу|потрібно|проблем|продаж|продавати|купувати|магазин|маркетплейс|інтернет-магазин|інтернет магазин|торгов)/.test(userText);

    const hasScope =
      /(screen|screens|page|pages|flow|flows|feature|features|catalog|filter|profile|checkout|order|map)/.test(userText) ||
      /(екран|екрани|сторінк|страниц|флоу|сценар|функц|фіча|фича|каталог|фільтр|фильтр|профіль|профиль|оплат|замовлен|заказ|мап|карта)/.test(userText);

    const hasScreensCount =
      /(\d+)\s*(screens|screen|pages|page)/.test(userText) ||
      /(\d+)\s*(екра|сторін)/.test(userText);

    const hasSpecs =
      /(specs|wireframes|wireframe|figma|prototype|prototypes|deck|brief|requirements|documentation|doc(s)?)/.test(userText) ||
      /(бріф|бриф|тз|тзшка|вимог|специфікац|спецификац|документац|документаци|фигма|прототип|прототипы|презентац|презентац|макети|макет)/.test(userText);

    const hasTimeline =
      /(week|weeks|month|months|deadline|asap|timeline|\d+\s*m(onth|o))/.test(userText) ||
      /(тиж|недел|місяц|месяц|дедлайн|термін|срок|asap|\d+\s*міс)/.test(userText);

    const hasIntegrations =
      /(integration|integrations|api|payment|stripe|paypal|apple pay|google pay|map|maps)/.test(userText) ||
      /(інтеграц|интеграц|апі|api|оплат|платіж|платеж|stripe|paypal|apple pay|google pay|карта|мапа)/.test(userText);

    const hasPayments =
      /(payment|payments|stripe|paypal|apple pay|google pay|checkout)/.test(userText) ||
      /(оплат|платіж|платеж|stripe|paypal|apple pay|google pay)/.test(userText);

    const hasAdmin =
      /(admin|backoffice|dashboard|cms|moderation|roles|permissions)/.test(userText) ||
      /(адмін|админ|бекофіс|бекофис|дашборд|адмінка|cms|модерац|ролі|роли|права)/.test(userText);

    const hasComplexitySignals =
      /(roles|permissions|multi|integration|payments|analytics|chat|notifications|realtime)/.test(userText) ||
      /(ролі|роли|права|інтеграц|интеграц|оплат|платіж|платеж|аналітик|аналитик|чат|нотиф|сповіщ)/.test(userText) ||
      /(essential|simple|basic|low|mvp|easy)/.test(userText) ||
      /(прост|простий|низк|низкий|низкий|низко|low|essential|мвп|mvp)/.test(userText);

    const filled = {
      platform: !!platform,
      productStage: !!productStage,
      audience: !!audience,
      goal: hasGoal,
      specs: hasSpecs,
      scope: hasScope,
      screensCount: hasScreensCount,
      timeline: hasTimeline,
      integrations: hasIntegrations,
      payments: hasPayments,
      admin: hasAdmin,
      complexity: hasComplexitySignals,
    };

    // Finalization must depend only on wizard-required fields.
    // Optional signals (integrations/payments/admin) must NOT block completion.
    const requiredKeys = [
      "platform",
      "productStage",
      "audience",
      "goal",
      "specs",
      "scope",
      "screensCount",
      "timeline",
      "complexity",
    ] as const;

    const missing = Object.entries(filled)
      .filter(([k, ok]) => (requiredKeys as readonly string[]).includes(k) && !ok)
      .map(([k]) => k);

    return {
      platform,
      productStage,
      audience,
      filled,
      missing,
    };
  }, [estimateAnalysisMessages]);

  const projectSummaryForBookCall = useMemo(() => {
    const lookupLabel = <T extends string>(
      options: ReadonlyArray<{ id: T; label: string }>,
      id: T | null,
      customValue?: string,
    ) => {
      if (customValue && customValue.trim().length > 0) return customValue.trim();
      if (!id) return "";
      return options.find((o) => o.id === id)?.label ?? String(id);
    };

    const wizardSummaryParts = [
      `Platform: ${lookupLabel(PLATFORM_OPTIONS, platform, customByStep["platform"])}`,
      `Stage: ${lookupLabel(STAGE_OPTIONS, stage, customByStep["stage"])}`,
      `Goal: ${lookupLabel(GOAL_OPTIONS, goal, customByStep["goal"])}`,
      `Specs: ${lookupLabel(SPECS_OPTIONS, specs, customByStep["specs"])}`,
      `Scope: ${lookupLabel(SCOPE_OPTIONS, scope, customByStep["scope"])}`,
      `Complexity: ${lookupLabel(COMPLEXITY_OPTIONS, complexity, customByStep["complexity"])}`,
      `Timeline: ${lookupLabel(TIMELINE_OPTIONS, timeline, customByStep["timeline"])}`,
      extraNotes.trim().length > 0 ? `Extra notes: ${extraNotes.trim()}` : "",
    ].filter((line) => {
      const value = line.split(":")[1]?.trim() ?? "";
      return value.length > 0;
    });

    const wizardSummary = wizardSummaryParts.join("\n");
    if (wizardSummary.length > 0) {
      return wizardSummary.length > 1400 ? `${wizardSummary.slice(0, 1400).trim()}...` : wizardSummary;
    }

    if (!estimateAnalysisMessages) return "";
    const userLines = estimateAnalysisMessages
      .filter((m) => m.role === "user")
      .map((m) => (m.content ?? "").trim())
      .filter((content) => content.length > 0 && !isKickoffMessage(content))
      .slice(-6);
    if (userLines.length === 0) return "";
    const text = userLines.join("\n");
    return text.length > 1400 ? `${text.slice(0, 1400).trim()}...` : text;
  }, [
    estimateAnalysisMessages,
    isKickoffMessage,
    platform,
    stage,
    goal,
    specs,
    scope,
    complexity,
    timeline,
    extraNotes,
    customByStep,
  ]);

  // Smart progress: count how many TOPICS the assistant has covered in questions.
  // Each topic the assistant mentions in a question counts as one "covered" topic.
  // This is better than counting user answers — if user says "I don't know", the topic
  // was still asked, so progress should advance.
  const ESTIMATE_TOPICS = ESTIMATE_REQUIRED_INPUTS;
  const { topicsCovered, assistantQuestionCount } = useMemo(() => {
    if (!estimateSessionMessages || estimateSessionMessages.length === 0)
      return { topicsCovered: 0, assistantQuestionCount: 0 };

    const assistantTexts = estimateSessionMessages
      .filter((m) => m.role === "assistant")
      .map((m) => (m.content ?? "").toLowerCase());

    // Count assistant messages that contain a question mark (actual questions)
    const questionCount = assistantTexts.filter((t) => t.includes("?")).length;

    // Combine all assistant text to detect which topics have been asked about
    const allText = assistantTexts.join("\n");
    const topics = [
      // 1. platform type
      /(тип|type|web|mobile|app|сайт|додат|мобіль|веб|платформ|website|dashboard)/.test(allText),
      // 2. new vs redesign
      /(новий|нов[иа]|redesign|нуля|існуюч|existing|rebuild|редизайн|mvp|мвп)/.test(allText),
      // 3. audience / users
      /(аудитор|цільов|користувач|клієнт|b2b|b2c|audience|user|customer|target)/.test(allText),
      // 4. goal / purpose
      /(мет[аи]|ціль|функціонал|feature|функц|можлив|goal|purpose|what.*do|що.*робити|призначен)/.test(allText),
      // 5. scope / screens / features
      /(екран|screen|page|сторінк|функц|розділ|section|обсяг|scope|feature|flow|компонент)/.test(allText),
      // 6. specs / materials ready
      /(специфік|тз|бриф|figma|прототип|макет|матеріал|specs|wireframe|brief|document|готов)/.test(allText),
      // 7. complexity
      /(складніст|складність|complex|простий|simple|basic|інтеграц|integrat|складн)/.test(allText),
      // 8. timeline / deadline
      /(термін|строк|дедлайн|timeline|deadline|місяц|month|тижн|week|коли|when|час)/.test(allText),
    ].filter(Boolean).length;

    return { topicsCovered: topics, assistantQuestionCount: questionCount };
  }, [estimateSessionMessages]);

  // Detect when assistant writes a FINAL estimate (not just another question)
  const assistantGaveFinalEstimate = useMemo(() => {
    if (!estimateSessionMessages || estimateSessionMessages.length === 0) return false;
    const assistantMsgs = estimateSessionMessages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content ?? "");
    if (assistantMsgs.length === 0) return false;
    const last = assistantMsgs[assistantMsgs.length - 1];
    // Always trust explicit marker
    if (/ESTIMATE_PANEL_RESULT:\s*\{/i.test(last)) return true;
    // Need at least 4 assistant questions before final can trigger
    if (assistantQuestionCount < 4) return false;
    // Must be a substantial message (real summary, not a short question)
    if (last.length < 150) return false;
    // Must NOT end with a question (final estimate doesn't ask anything)
    if (last.trim().endsWith("?")) return false;
    const lower = last.toLowerCase();
    // Must contain estimate-related language + numbers
    const hasEstimateLanguage =
      /(попередн|preliminary|оцінк|estimate|вартіст|cost|бюджет|budget|підсум|summar|результат|result)/i.test(lower);
    const hasNumbers = /\d/.test(last);
    if (hasEstimateLanguage && hasNumbers) return true;
    // Some model replies end estimate mode with a handoff summary
    // (book call / estimate card mention) without explicit numeric block.
    const hasWrapUpHandoff =
      /(estimate card|preliminary estimate.*available|ballpark|book a call|schedule( a)? call|relevant case stud|for a precise quote)/i.test(
        lower,
      );
    return hasWrapUpHandoff && assistantQuestionCount >= 4;
  }, [estimateSessionMessages, assistantQuestionCount]);

  const estimateProgress = useMemo(() => {
    const requiredTotal = ESTIMATE_REQUIRED_INPUTS;
    const filled = extractedEstimateContext
      ? [
          !!extractedEstimateContext.filled.platform,
          !!extractedEstimateContext.filled.productStage,
          !!extractedEstimateContext.filled.audience,
          !!extractedEstimateContext.filled.goal,
          !!extractedEstimateContext.filled.specs,
          // Keep UX simple: scope + screens count represented as one requirement.
          !!extractedEstimateContext.filled.scope || !!extractedEstimateContext.filled.screensCount,
          !!extractedEstimateContext.filled.timeline,
          !!extractedEstimateContext.filled.complexity,
        ].filter(Boolean).length
      : 0;

    // 100% only when assistant gave the actual final estimate
    if (assistantGaveFinalEstimate) return { percent: 100, checks: requiredTotal };

    // Primary signal: required details extracted from user inputs.
    // Cap at 90% until the assistant emits the final estimate.
    const detailsPercent = Math.round((filled / requiredTotal) * 90);
    // Secondary fallback: assistant asked-question count, for very early turns
    // before detail extraction catches up.
    const questionPercent = Math.round((assistantQuestionCount / (ESTIMATE_TOPICS + 1)) * 90);
    const percent = Math.min(90, Math.max(detailsPercent, questionPercent));
    return { percent, checks: filled };
  }, [assistantQuestionCount, assistantGaveFinalEstimate, extractedEstimateContext]);

  /** Chat input dock: progress while “Work with the assistant” (hidden runner only). */
  useEffect(() => {
    if (!isHidden || mode !== "assistant") {
      if (assistantProgressSnapshotRef.current !== "__off") {
        assistantProgressSnapshotRef.current = "__off";
        window.dispatchEvent(
          new CustomEvent("estimate-assistant-progress", { detail: { active: false } }),
        );
      }
      return;
    }

    // Done = assistant gave the final estimate
    if (assistantGaveFinalEstimate) {
      if (assistantProgressSnapshotRef.current !== "__done") {
        assistantProgressSnapshotRef.current = "__done";
        window.dispatchEvent(
          new CustomEvent("estimate-assistant-progress", { detail: { active: false } }),
        );
      }
      return;
    }

    // Use the same smart progress from estimateProgress
    const payload = {
      active: true as const,
      title: "Preliminary estimate",
      subtitle: "Work with the assistant",
      // Progress is based on required details collected from user answers.
      asked: estimateProgress.checks,
      answered: estimateProgress.checks,
      total: ESTIMATE_REQUIRED_INPUTS,
      percent: estimateProgress.percent,
    };
    const snap = JSON.stringify(payload);
    if (snap === assistantProgressSnapshotRef.current) return;
    assistantProgressSnapshotRef.current = snap;
    window.dispatchEvent(new CustomEvent("estimate-assistant-progress", { detail: payload }));
  }, [isHidden, mode, estimateProgress, assistantGaveFinalEstimate]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("estimate-assistant-progress", { detail: { active: false } }));
    };
  }, []);

  useEffect(() => {
    if (mode !== "assistant") return;
    if (!estimateSessionMessages || estimateSessionMessages.length === 0) return;
    if (!extractedEstimateContext) return;

    // Only trigger when a NEW user message arrives (avoid spam)
    const lastUser = [...estimateSessionMessages].reverse().find((m) => m.role === "user");
    const lastUserKey = lastUser
      ? `${(lastUser as { createdAt?: number }).createdAt ?? 0}:${String((lastUser as { _id?: unknown })._id ?? "")}:${String(lastUser.content ?? "")}`
      : null;
    if (!lastUserKey || lastUserKey === lastUserMsgIdRef.current) return;
    lastUserMsgIdRef.current = lastUserKey;

    // Disabled: sending state updates after every user message overloads the
    // ElevenLabs agent context and causes it to freeze. The agent already has
    // full instructions from the kickoff prompt.
  }, [mode, estimateSessionMessages, extractedEstimateContext, assistantInputKind]);

  const catalogDraftResult = useMemo(() => {
    if (!estimateAnalysisMessages || estimateAnalysisMessages.length === 0) return null;

    // Show draft numbers only when the user provided at least one real project signal.
    // If the user only starts the flow ("I want an estimate...") we keep $0/$0.
    // If the user provided platform/type (web/app) we show an approximate range
    // and tighten it as more answers arrive.
    // 1) Ignore kickoff phrases like "I want a preliminary design estimate..."
    const nonKickoffUserMessages = estimateAnalysisMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content ?? "")
      .filter((c) => c.trim().length > 0 && !isKickoffMessage(c));

    if (nonKickoffUserMessages.length === 0) return null;

    // IMPORTANT: inference should use only what user said (not assistant questions).
    // For performance on very large inputs, analyze only a trimmed view of the text.
    const rawText = nonKickoffUserMessages.join("\n").toLowerCase();
    const MAX_ANALYSIS_CHARS = 12000;
    const text =
      rawText.length <= MAX_ANALYSIS_CHARS
        ? rawText
        : `${rawText.slice(0, Math.floor(MAX_ANALYSIS_CHARS / 2))}\n...\n${rawText.slice(-Math.floor(MAX_ANALYSIS_CHARS / 2))}`;

    // Start draft as soon as we have any meaningful project signal.
    // Previously we hard-required platform, which kept the card at $0 even with rich context.
    const hasAnyProjectSignal =
      extractedEstimateContext
        ? Object.values(extractedEstimateContext.filled).some(Boolean)
        : false;
    if (!hasAnyProjectSignal) return null;

    const inferPlatform = () => {
      const hasWeb =
        /(web|website|site|landing|dashboard|admin|portal|saas|crm|erp)/.test(text) ||
        /(веб|вебсайт|сайт|лендінг|лендинг|дашборд|кабінет|кабинет|адмін|админ|портал|саас|crm|erp)/.test(text);
      const hasMobile =
        /(mobile|ios|android|app|application|webapp|web app)/.test(text) ||
        /(мобіль|мобиль|додаток|апка|приложен|ios|android)/.test(text);
      if (hasWeb && hasMobile) return ["web", "mobile"] as const;
      if (hasMobile) return ["mobile"] as const;
      if (hasWeb) return ["web"] as const;
      return null;
    };

    const inferClientType = () => {
      if (/(b2b)/.test(text) || /(b2b)/.test(text)) return "b2b";
      if (/(b2c)/.test(text) || /(b2c)/.test(text)) return "b2c";
      if (/(internal|внутрішн|внутренн)/.test(text)) return "internal";
      return null;
    };

    const inferDomain = () => {
      if (/(payment|payments|bank|banking|fintech|wallet|card|invoice)/.test(text) || /(платіж|платеж|оплат|банк|фінтех|финтех|картк)/.test(text)) {
        return "fintech";
      }
      if (/(health|healthcare|medical|clinic|doctor)/.test(text) || /(мед|клінік|клиник|лікар|врач|здоров)/.test(text)) {
        return "digital-health";
      }
      if (/(logistics|shipment|delivery|fleet|rental|leasing|car)/.test(text) || /(логіст|логист|достав|оренда|аренда|лізинг|лизинг|авто|машин)/.test(text)) {
        return "logistics";
      }
      return null;
    };

    const platforms = inferPlatform();
    const domain = inferDomain();
    const clientType = inferClientType();

    const catalog = (estimatesCatalog as unknown as CatalogEntry[]).filter(
      (e) => typeof e.priceMin === "number" && typeof e.priceMax === "number",
    );

    let candidates = catalog;
    if (platforms) {
      candidates = candidates.filter((e) => platforms.every((p) => e.platform.includes(p)));
    }
    if (domain) {
      const byDomain = candidates.filter((e) => e.domain === domain);
      if (byDomain.length >= 1) candidates = byDomain;
    }
    if (clientType) {
      const byClient = candidates.filter((e) => e.clientType === clientType);
      if (byClient.length >= 1) candidates = byClient;
    }
    if (candidates.length === 0) candidates = catalog;

    const coreFields: Array<keyof NonNullable<typeof extractedEstimateContext>["filled"]> = [
      "platform",
      "productStage",
      "specs",
      "scope",
      "screensCount",
      "timeline",
    ];
    const filledCoreCount = extractedEstimateContext
      ? coreFields.filter((k) => !!extractedEstimateContext.filled[k]).length
      : 0;
    const completeness = Math.max(0, Math.min(1, filledCoreCount / coreFields.length));

    const calcFrom = (sourceCandidates: typeof candidates) => {
      const mins = sourceCandidates.map((e) => e.priceMin as number).sort((a, b) => a - b);
      const maxs = sourceCandidates.map((e) => e.priceMax as number).sort((a, b) => a - b);

      const trim = (arr: number[]) => {
        if (arr.length < 5) return arr;
        const cut = Math.floor(arr.length * 0.15);
        return arr.slice(cut, arr.length - cut);
      };
      const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
      const quantile = (arr: number[], q: number) => {
        if (arr.length === 0) return 0;
        const pos = (arr.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        const a = arr[base] ?? arr[arr.length - 1]!;
        const b = arr[base + 1] ?? arr[arr.length - 1]!;
        return a + (b - a) * rest;
      };

      const tMins = trim(mins);
      const tMaxs = trim(maxs);
      const p25Min = quantile(tMins, 0.25);
      const p50Min = quantile(tMins, 0.5);
      const p75Max = quantile(tMaxs, 0.75);
      const p50Max = quantile(tMaxs, 0.5);

      const minBase = p50Min || mean(tMins);
      const maxBase = p50Max || mean(tMaxs);
      const wideMin = p25Min || minBase * 0.9;
      const wideMax = p75Max || maxBase * 1.1;

      const minPriceRaw = wideMin * (0.85 + completeness * 0.15);
      const maxPriceRaw = wideMax * (1.15 - completeness * 0.15);

      const minPrice = Math.round(minPriceRaw);
      let maxPrice = Math.round(Math.max(maxPriceRaw, minPrice * 1.15));

      const maxRatio = completeness >= 0.8 ? 1.6 : completeness >= 0.4 ? 1.9 : 2.2;
      maxPrice = Math.min(maxPrice, Math.round(minPrice * maxRatio));

      // Hours: derive from catalog hoursBreakdown
      const catalogHours = sourceCandidates
        .map((e) => {
          const hb = (e.hoursBreakdown ?? {}) as Record<string, any>;
          const toNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
          const uxTotal =
            toNum(hb?.total?.uxui) ||
            toNum(hb?.totalProjectHours?.uxui) ||
            toNum(hb?.totalProductDesign?.uxui) ||
            0;
          const pmTotal =
            toNum(hb?.total?.pm) ||
            toNum(hb?.totalProjectHours?.pm) ||
            toNum(hb?.totalPm?.pm) ||
            toNum(hb?.totalBaPm?.pm) ||
            toNum(hb?.totalBa?.pm) ||
            0;
          const total = uxTotal + pmTotal;
          return typeof total === "number" && Number.isFinite(total) ? total : null;
        })
        .filter((v): v is number => typeof v === "number");

      const baseHours =
        catalogHours.length > 0
          ? Math.round(mean(trim(catalogHours)))
          : Math.round(((minPrice + maxPrice) / 2) / 70);
      const totalHours = Math.max(10, Math.round(baseHours * (0.85 + completeness * 0.15)));
      const weeks = Math.max(
        1,
        Math.round(
          (sourceCandidates
            .map((c) => c.durationWeeks)
            .filter((w): w is number => typeof w === "number")
            .reduce((s, w) => s + w, 0) /
            Math.max(1, sourceCandidates.length)) || 6,
        ),
      );

      const phaseHours: Record<string, number> = {};
      for (const phase of ESTIMATE_PHASE_LABELS) {
        phaseHours[phase] = Math.max(0, Math.round(totalHours * PHASE_DEFAULT_SPLIT[phase]));
      }

      const sum = Object.values(phaseHours).reduce((s, v) => s + v, 0);
      if (sum !== totalHours) {
        phaseHours["UI design"] = Math.max(0, (phaseHours["UI design"] ?? 0) + (totalHours - sum));
      }

      return { minPrice, maxPrice, weeks, totalHours, phaseHours };
    };

    const primary = calcFrom(candidates);
    // If anything produces absurdly small prices, fallback to the whole catalog.
    if (!Number.isFinite(primary.minPrice) || primary.minPrice < 300 || !Number.isFinite(primary.maxPrice) || primary.maxPrice < 300) {
       
      console.warn("[EstimateWizardPanel] Draft fallback to full catalog due to anomaly:", {
        primary,
        completeness,
      });
      return calcFrom(catalog);
    }

    return primary;
  }, [estimateAnalysisMessages, extractedEstimateContext, estimateProgress.checks, isKickoffMessage]);

  // IMPORTANT: Always show numbers driven by our local catalog calculations.
  // Assistant ESTIMATE_PANEL_RESULT is treated as contextual guidance only.
  const displayedEstimate = catalogDraftResult;

  // Let the page know that estimate inline UI is mounted (used for message forwarding + sales-tool gating).
  useEffect(() => {
    if (!isInline && !isHidden) return;
    onEstimateInlineActiveChange?.(true);
    return () => onEstimateInlineActiveChange?.(false);
  }, [isInline, isHidden, onEstimateInlineActiveChange]);

  // Typing indicator is handled globally in the main chat UI.

  // Draft estimate updates disabled — sending frequent contextual updates
  // overloads the ElevenLabs agent and causes it to stop responding.
  // The agent calculates its own estimate from the conversation.

  useEffect(() => {
    if (mode !== "assistant") {
      if (assistantKickoffSentRef.current) {
        assistantKickoffSentRef.current = false;
        window.dispatchEvent(
          new CustomEvent("estimate-assistant-message", {
            detail: {
              text:
                "EXIT ESTIMATE MODE.\n" +
                "If the user continues chatting, respond normally (not in estimate-only mode).",
              inputKind: assistantInputKind,
              visibility: "contextual",
            },
          }),
        );
      }
      lastDraftEstimateSentRef.current = "";
      lastEstimateStateSentRef.current = "";
      if (estimateSessionStartedAt !== null) setEstimateSessionStartedAt(null);
      if (localMessages.length > 0) setLocalMessages([]);
      return;
    }

    if (assistantKickoffSentRef.current) return;
    assistantKickoffSentRef.current = true;

    // Start a new "estimate session" so UI shows 0 until user provides fresh info.
    // Use current timestamp exactly to avoid including stale assistant/user
    // messages from earlier parts of the conversation in progress counters.
    const sessionStart = Date.now();
    setEstimateSessionStartedAt(sessionStart);
    lastUserMsgIdRef.current = null;

    // 1) Hidden (contextual) guidance — kept SHORT to avoid overloading the agent
    const contextual =
      "ESTIMATE MODE. Ask ONE question at a time about the project to produce a cost estimate.\n" +
      "Language policy: English user -> English response. Ukrainian OR Russian user -> Ukrainian response. Never use Russian.\n" +
      "Do NOT send onboarding, chooser instructions, or manager/booking suggestions while estimate mode is active.\n" +
      "Topics: 1) type (web/mobile/both) 2) new or redesign 3) audience & goal 4) specs ready? 5) scope (screens/features) 6) complexity 7) timeline 8) extra notes.\n" +
      "Do NOT show prices until ALL questions answered. No tool calls in estimate mode.\n" +
      "Start NOW with your first question about project type.\n" +
      "When done, include: ESTIMATE_PANEL_RESULT:{\"minPrice\":0,\"maxPrice\":0,\"weeks\":0,\"totalHours\":0,\"phaseHours\":{}}";

    window.dispatchEvent(
      new CustomEvent("estimate-assistant-message", {
        detail: {
          text: contextual,
          inputKind: assistantInputKind,
          visibility: "contextual",
        },
      }),
    );

    // 2) Visible kickoff — simple, user-friendly
    const kickoff =
      "I chose \"Work with the assistant\" for my estimate. Please start with one question at a time, beginning with what kind of product this is (website, mobile app, or both).";
    window.dispatchEvent(
      new CustomEvent("estimate-assistant-message", {
        detail: {
          text: kickoff,
          inputKind: assistantInputKind,
          visibility: "user",
        },
      }),
    );
  }, [mode, assistantInputKind]);

  const stepIds = useMemo(
    () => ["platform", "stage", "goal", "specs", "scope", "complexity", "timeline", "extra", "result"],
    [],
  );

  const currentStepId = stepIds[step];
  const totalSteps = stepIds.length - 1; // exclude result
  const isResultStep = currentStepId === "result";

  // Map new wizard complexity to estimateRanges keys
  const complexityMapped = useMemo((): "low" | "medium" | "high" | null => {
    if (complexity === "essential") return "low";
    if (complexity === "advanced") return "medium";
    if (complexity === "enterprise") return "high";

    const custom = (customByStep["complexity"] ?? "").toLowerCase().trim();
    if (custom.length > 0) {
      if (/(enterprise|advanced|complex|складн|висок|high|admin|roles|permissions|integrations|payments|real[-\s]?time)/.test(custom)) {
        return "high";
      }
      if (/(medium|mid|moderate|середн|medium|mvp\+|growth)/.test(custom)) {
        return "medium";
      }
      if (/(essential|simple|basic|прост|low|mvp)/.test(custom)) {
        return "low";
      }
      // If user wrote any custom complexity text, default to medium (safe midpoint).
      return "medium";
    }

    // Fallback by selected scope/specs when complexity is not explicitly chosen.
    if (scope === "30+" || specs === "have-specs") return "high";
    if (scope === "16-30" || specs === "have-idea") return "medium";
    if (scope === "1-5" || scope === "6-15" || specs === "need-research") return "low";

    return null;
  }, [complexity, customByStep, scope, specs]);

  const result = useMemo((): EstimationEntry | null => {
    if (!complexityMapped) return null;
    if (stage === "redesign") return getEstimationRange("redesign", complexityMapped);
    if (platform === "other") return getGenericEstimationRange(complexityMapped);
    if (platform) {
      const typeMap: Record<WizardPlatform, string> = {
        "website":    "website",
        "mobile-app": "mobile-app",
        "web-mobile": "mobile-app",
        "dashboard":  "dashboard",
        "saas":       "website",
        "other":      "other",
      };
      const mapped = typeMap[platform];
      if (mapped === "other") return getGenericEstimationRange(complexityMapped);
      return getEstimationRange(mapped, complexityMapped);
    }
    return null;
  }, [stage, platform, complexityMapped]);

  // Notify parent exactly once when the estimate is finalized (wizard result step or assistant final draft).
  const hasReportedFinalRef = useRef(false);
  useEffect(() => {
    if (!onEstimateFinal) return;
    if (hasReportedFinalRef.current) return;

    if (mode === "wizard" && isResultStep && result) {
      hasReportedFinalRef.current = true;

      // Wizard result step gives min/max hours, but we still want phase split in the final card.
      // We approximate with the midpoint totalHours and then split using the same default ratios.
      const totalHoursForSplit = Math.max(0, Math.round((result.minHours + result.maxHours) / 2));
      const phaseHours: Record<string, number> = {};
      let sum = 0;
      for (const phase of ESTIMATE_PHASE_LABELS) {
        const v = Math.max(0, Math.round(totalHoursForSplit * PHASE_DEFAULT_SPLIT[phase]));
        phaseHours[phase] = v;
        sum += v;
      }
      if (sum !== totalHoursForSplit) {
        phaseHours["UI design"] = Math.max(0, (phaseHours["UI design"] ?? 0) + (totalHoursForSplit - sum));
      }

      onEstimateFinal({
        minPrice: result.minPrice,
        maxPrice: result.maxPrice,
        timeline: result.timeline,
        projectSummary: projectSummaryForBookCall,
        minHours: result.minHours,
        maxHours: result.maxHours,
        weeks: Math.max(1, Math.round(result.minHours / 40)),
        phaseHours,
      });
      return;
    }

    if (mode === "assistant") {
      // Safe fallback: once all required estimate inputs are collected (8/8),
      // finalize estimate even if the agent did not emit explicit final marker text yet.
      const isProgressComplete =
        estimateProgress.percent === 100 || estimateProgress.checks >= ESTIMATE_REQUIRED_INPUTS;
      const hasWrapUpHandoffMessage =
        !!estimateSessionMessages?.some(
          (m) =>
            m.role === "assistant" &&
            /(estimate card|preliminary estimate.*available|ballpark|book a call|schedule( a)? call|relevant case stud|for a precise quote)/i.test(
              (m.content ?? "").toLowerCase(),
            ),
        );
      const hasAgentFinalResult =
        assistantGaveFinalEstimate ||
        hasWrapUpHandoffMessage ||
        estimateSessionMessages?.some(
          (m) => m.role === "assistant" && /ESTIMATE_PANEL_RESULT:\s*\{/.test(m.content ?? "")
        );

      if (isProgressComplete || hasAgentFinalResult) {
        hasReportedFinalRef.current = true;

        // Try to parse ESTIMATE_PANEL_RESULT from agent
        if (hasAgentFinalResult) {
          const lastAgentResult = [...(estimateSessionMessages ?? [])].reverse()
            .find((m) => m.role === "assistant" && /ESTIMATE_PANEL_RESULT:\s*\{/.test(m.content ?? ""));
          const match = lastAgentResult?.content?.match(/ESTIMATE_PANEL_RESULT:\s*(\{[\s\S]*?\})/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              onEstimateFinal({
                minPrice: parsed.minPrice ?? displayedEstimate?.minPrice ?? 5000,
                maxPrice: parsed.maxPrice ?? displayedEstimate?.maxPrice ?? 15000,
                weeks: parsed.weeks ?? displayedEstimate?.weeks ?? 6,
                projectSummary: projectSummaryForBookCall,
                totalHours: parsed.totalHours ?? displayedEstimate?.totalHours ?? 200,
                phaseHours: parsed.phaseHours ?? displayedEstimate?.phaseHours ?? {},
              });
              return;
            } catch {}
          }
        }

        // Use catalog-based estimate or fallback defaults
        const est = displayedEstimate ?? {
          minPrice: 5000, maxPrice: 15000, weeks: 6, totalHours: 200, phaseHours: {},
        };
        onEstimateFinal({
          minPrice: est.minPrice,
          maxPrice: est.maxPrice,
          weeks: est.weeks,
          projectSummary: projectSummaryForBookCall,
          totalHours: est.totalHours,
          phaseHours: est.phaseHours,
        });
      }
    }
  }, [
    displayedEstimate,
    estimateProgress.percent,
    estimateSessionMessages,
    assistantGaveFinalEstimate,
    isResultStep,
    mode,
    onEstimateFinal,
    projectSummaryForBookCall,
    result,
  ]);

  const progressPercent =
    mode === "wizard"
      ? isResultStep
    ? 100
    : totalSteps > 0
      ? Math.round(((step + 1) / totalSteps) * 100)
          : 0
      : 0;

  const setCustom = (stepId: string, value: string) => {
    setCustomByStep((prev) => ({ ...prev, [stepId]: value }));
  };

  const goNext = () => setStep((s) => Math.min(s + 1, stepIds.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const resetWizard = () => {
    setStep(0);
    setPlatform(null);
    setStage(null);
    setGoal(null);
    setSpecs(null);
    setScope(null);
    setComplexity(null);
    setTimeline(null);
    setExtraNotes("");
    setCustomByStep({});
  };

  const handleBackFromPanel = () => {
    if (mode === "wizard") {
      if (step > 0) {
        goBack();
      } else {
        resetWizard();
        setMode("chooser");
      }
    } else {
      setMode("chooser");
    }
  };

  const renderCustomInput = (stepId: string, placeholder?: string) => (
    <div className="mt-3">
      <label className="block text-xs text-white/50 mb-1">{CUSTOM_PLACEHOLDER}</label>
      <input
        type="text"
        value={customByStep[stepId] ?? ""}
        onChange={(e) => setCustom(stepId, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      />
    </div>
  );

  const renderOptionButtons = <T extends string>(
    options: { id: T; label: string }[],
    value: T | null,
    onChange: (v: T) => void,
    stepId: string,
    showContinue?: boolean
  ) => (
    <>
      <div className="grid gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="flex items-center justify-between w-full rounded-xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-4 py-3.5 text-left hover:bg-white/[0.1] hover:border-white/[0.2] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <span className="text-sm font-medium text-white/90">{opt.label}</span>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        ))}
      </div>
      {renderCustomInput(stepId)}
      {showContinue && (
        <button
          type="button"
          onClick={goNext}
          disabled={!canContinue()}
          className="w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer mt-2 shadow-[0_0_20px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          Continue →
        </button>
      )}
    </>
  );

  const handlePlatform = (v: WizardPlatform) => { setPlatform(v); goNext(); };
  const handleStage    = (v: WizardStage)    => { setStage(v);    goNext(); };
  const handleGoal     = (v: WizardGoal)     => { setGoal(v);     goNext(); };
  const handleSpecs    = (v: WizardSpecs)    => { setSpecs(v);    goNext(); };
  const handleScope    = (v: Scope)          => { setScope(v);    goNext(); };
  const handleComplexity = (v: Complexity)   => { setComplexity(v); goNext(); };
  const handleTimeline = (v: Timeline)       => { setTimeline(v); goNext(); };

  const canContinue = (): boolean => {
    if (currentStepId === "scope")      return scope !== null      || !!customByStep["scope"]?.trim();
    if (currentStepId === "complexity") return complexity !== null  || !!customByStep["complexity"]?.trim();
    if (currentStepId === "timeline")   return timeline !== null    || !!customByStep["timeline"]?.trim();
    return false;
  };

  const handleExtraNext = () => goNext();

  const allCustomNotes = useMemo(() => {
    const parts: string[] = [];
    if (platform)   parts.push(`Platform: ${PLATFORM_OPTIONS.find((p) => p.id === platform)?.label ?? platform}`);
    if (stage)      parts.push(`Stage: ${STAGE_OPTIONS.find((s) => s.id === stage)?.label ?? stage}`);
    if (goal)       parts.push(`Goal: ${GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? goal}`);
    if (specs)      parts.push(`Specs: ${SPECS_OPTIONS.find((s) => s.id === specs)?.label ?? specs}`);
    if (scope)      parts.push(`Scope: ${SCOPE_OPTIONS.find((s) => s.id === scope)?.label ?? scope}`);
    if (customByStep["scope"]) parts.push(`  → ${customByStep["scope"]}`);
    if (complexity) parts.push(`Complexity: ${COMPLEXITY_OPTIONS.find((c) => c.id === complexity)?.label ?? complexity}`);
    if (customByStep["complexity"]) parts.push(`  → ${customByStep["complexity"]}`);
    if (timeline)   parts.push(`Timeline: ${TIMELINE_OPTIONS.find((t) => t.id === timeline)?.label ?? timeline}`);
    if (customByStep["timeline"]) parts.push(`  → ${customByStep["timeline"]}`);
    if (extraNotes) parts.push(`Extra: ${extraNotes}`);
    return parts;
  }, [platform, stage, goal, specs, scope, complexity, timeline, customByStep, extraNotes]);

  return (
    <motion.div
      initial={isInline ? { opacity: 0, y: 8 } : { x: "100%" }}
      animate={isInline ? { opacity: 1, y: 0 } : { x: 0 }}
      exit={isInline ? { opacity: 0, y: 8 } : { x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={
        isHidden
          ? "hidden"
          : isInline
            ? "relative w-full max-w-[900px] mx-auto z-10 flex flex-col rounded-2xl bg-[#0a0a0c]/60 backdrop-blur-2xl border border-white/[0.12] shadow-[0_28px_80px_rgba(0,0,0,0.45)] overflow-hidden"
            : "fixed right-0 top-0 h-full w-full sm:w-1/2 z-50 flex flex-col bg-[#0a0a0c]/60 backdrop-blur-2xl border-l border-white/[0.12] shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
      }
      style={
        isHidden
          ? undefined
          : isInline
            ? { boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06)" }
            : { boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), -8px 0 32px rgba(0,0,0,0.35)" }
      }
    >
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-white/[0.03] backdrop-blur-sm border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white/90">Preliminary estimate</h2>
        </div>
        {!isInline && !isHidden && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        )}
      </div>

      {mode === "wizard" && !isResultStep && (
        <div className="px-5 pt-4 pb-2 shrink-0">
          <p className="text-xs font-medium text-white/70">
            Question {step + 1}/{totalSteps}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/40">{progressPercent}% complete</p>
        </div>
      )}

      <div className={isInline ? "px-5 py-4" : "flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 scrollbar-chat"}>
        <AnimatePresence mode="wait">
          {mode === "chooser" && (
            <motion.div
              key="chooser"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <p className="text-base font-semibold text-white/95 mb-1">
                How would you like to get a preliminary estimate?
              </p>
              <p className="text-xs text-white/55 mb-4">
                Choose the option that matches how ready your project is right now. You can always switch later.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("assistant")}
                  className="w-full h-full rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 text-left hover:bg-white/[0.09] hover:border-white/[0.28] transition-all cursor-pointer shadow-[0_14px_30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] min-h-[130px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-white/[0.08] px-2 py-2 text-violet-200">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/95">Work with the assistant (file or text)</p>
                      <p className="mt-1 text-xs text-white/65">
                        Upload a brief/spec/deck or describe your project in text. The assistant will read it, ask follow-up questions and prepare a preliminary estimate.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("wizard");
                    setStep(0);
                  }}
                  className="w-full h-full rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm px-4 py-4 text-left hover:bg-white/[0.09] hover:border-white/[0.28] transition-all cursor-pointer shadow-[0_14px_30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] min-h-[130px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-white/[0.08] px-2 py-2 text-violet-200">
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/95">Answer a quick questionnaire</p>
                      <p className="mt-1 text-xs text-white/75">
                        7–10 questions about goals, scope, and complexity. Perfect if you&apos;re not sure how to describe the project yet.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {mode === "assistant" && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <p className="text-base font-semibold text-white/95">Work with the assistant</p>
              <div className="rounded-2xl border border-white/[0.14] bg-white/[0.04] backdrop-blur-md p-4 space-y-4 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-xs text-white/70 leading-relaxed">
                  Share your project details in the main chat (left). The assistant will ask follow‑up questions (only what&apos;s needed for estimating) and then
                  produce a preliminary estimate based on Cieden&apos;s internal catalog.
                </p>

                {/* Draft / live estimate card (Cieden-style) */}
                <div className="rounded-3xl p-[1px] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/20 to-sky-400/25 shadow-[0_28px_70px_rgba(0,0,0,0.7)]">
                  <div className="rounded-3xl bg-[#0c0c14]/85 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">

                    {/* Header strip */}
                    <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                          <span className="text-[11px] font-semibold text-violet-200 tracking-wide uppercase">
                            {displayedEstimate ? "Estimate draft" : "Draft estimate"}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/40 tabular-nums">
                          {estimateProgress.checks}/{ESTIMATE_REQUIRED_INPUTS} inputs
                        </span>
                      </div>

                      {/* Price range — large */}
                      <div className="flex items-baseline gap-3">
                        <p className="text-4xl font-bold text-white tracking-tight">
                          ${Math.round(displayedEstimate?.minPrice ?? 0).toLocaleString()}
                        </p>
                        <span className="text-2xl text-white/30 font-light">–</span>
                        <p className="text-4xl font-bold text-white/80 tracking-tight">
                          ${Math.round(displayedEstimate?.maxPrice ?? 0).toLocaleString()}
                        </p>
                      </div>

                      {/* Meta badges */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1.5 text-[12px] font-medium text-white/75">
                          <Clock3 className="w-3.5 h-3.5 text-sky-400" />
                          {displayedEstimate?.weeks ?? 0} weeks
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium ${displayedEstimate ? "bg-violet-500/10 border-violet-400/20 text-violet-300" : "bg-white/[0.04] border-white/[0.08] text-white/40"}`}>
                          <MessagesSquare className="w-3.5 h-3.5" />
                          {displayedEstimate ? "draft ready" : "awaiting details"}
                        </span>
                      </div>
                    </div>

                    {/* Readiness progress */}
                    <div className="px-5 py-4 border-b border-white/[0.07]">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-[12px] font-semibold text-white/80">Estimate readiness</p>
                        <p className="text-[13px] font-bold tabular-nums" style={{
                          color: estimateProgress.percent >= 60 ? "#34d399" : estimateProgress.percent >= 30 ? "#a78bfa" : "rgba(255,255,255,0.45)"
                        }}>
                          {estimateProgress.percent}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${estimateProgress.percent}%`,
                            background: estimateProgress.percent >= 60
                              ? "linear-gradient(90deg, #10b981, #34d399)"
                              : "linear-gradient(90deg, #7c3aed, #c026d3)",
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-white/45">
                        {estimateProgress.checks >= ESTIMATE_REQUIRED_INPUTS
                          ? "All key inputs collected. Ready to finalize."
                          : `${Math.max(0, ESTIMATE_REQUIRED_INPUTS - estimateProgress.checks)} more input${Math.max(0, ESTIMATE_REQUIRED_INPUTS - estimateProgress.checks) !== 1 ? "s" : ""} needed for a precise estimate.`}
                      </p>
                    </div>

                    {/* Phase breakdown — 2-column grid */}
                    <div className="p-5">
                      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3">Work included</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Discovery",           Icon: Search,         desc: "Research, audits & project scope definition" },
                          { label: "UX / IA",             Icon: LayoutTemplate, desc: "User flows, wireframes & information architecture" },
                          { label: "UI design",           Icon: Palette,        desc: "Visual screens, components & final UI" },
                          { label: "Design system",       Icon: Component,      desc: "Token library, component kit & guidelines" },
                          { label: "Prototyping",         Icon: Wand2,          desc: "Interactive clickable prototype for testing" },
                          { label: "Testing & iteration", Icon: FlaskConical,   desc: "Usability tests, feedback & design fixes" },
                          { label: "Handoff & support",   Icon: PackageCheck,   desc: "Dev specs, assets export & QA support" },
                          { label: "PM / communication",  Icon: MessagesSquare, desc: "Planning, syncs, reviews & team coordination" },
                        ].map(({ label, Icon, desc }) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-600/[0.06] p-4 flex flex-col gap-2"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
                              <Icon className="w-4 h-4" />
                            </span>
                            <p className="text-[12px] font-semibold text-white leading-tight">{label}</p>
                            <p className="text-[10px] text-white/40 leading-relaxed">{desc}</p>
                          </div>
                        ))}
                      </div>

                      {/* Hint */}
                      <p className="mt-4 text-[11px] text-white/35 leading-relaxed">
                        Write in the chat on the left what you need (or paste your brief / share a case). The assistant will ask follow-up questions and refine this estimate in real time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* "Contact manager" CTA — appears only when estimate is 60%+ ready */}
                {estimateProgress.percent >= 60 && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3">
                      <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                        Great — we have enough to prepare a real quote! Our manager will review your project and get back to you within 1 business day.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-emerald-200 hover:from-emerald-500/35 hover:to-teal-500/30 transition-all cursor-pointer shadow-[0_0_22px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(255,255,255,0.07)]"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-book-call-panel"));
                        window.dispatchEvent(
                          new CustomEvent("estimate-assistant-message", {
                            detail: {
                              visibility: "contextual",
                              inputKind: assistantInputKind,
                              text: "The client has reviewed the preliminary estimate and clicked 'Contact manager'. Please let them know a manager will follow up shortly, and ask if they have any final questions before connecting them.",
                            },
                          }),
                        );
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Contact our manager
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Platform ── */}
          {mode === "wizard" && currentStepId === "platform" && (
            <motion.div key="platform" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">What are you building?</p>
              <p className="text-xs text-white/50">Choose the primary platform for your product.</p>
              <div className="space-y-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handlePlatform(opt.id)}
                    className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${platform === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/95">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                </button>
              ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Stage ── */}
          {mode === "wizard" && currentStepId === "stage" && (
            <motion.div key="stage" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">New product or redesign?</p>
              <p className="text-xs text-white/50">Tell us about the current stage of your project.</p>
              <div className="space-y-2">
                {STAGE_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleStage(opt.id)}
                    className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${stage === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/95">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Goal ── */}
          {mode === "wizard" && currentStepId === "goal" && (
            <motion.div key="goal" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">What is your main goal?</p>
              <p className="text-xs text-white/50">What outcome matters most for this project?</p>
              <div className="space-y-2">
                {GOAL_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleGoal(opt.id)}
                    className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${goal === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/95">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Specs ── */}
          {mode === "wizard" && currentStepId === "specs" && (
            <motion.div key="specs" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">Do you have specs or wireframes ready?</p>
              <p className="text-xs text-white/50">This helps us understand how much discovery work is needed.</p>
              <div className="space-y-2">
                {SPECS_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleSpecs(opt.id)}
                    className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${specs === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/95">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 5: Scope ── */}
          {mode === "wizard" && currentStepId === "scope" && (
            <motion.div key="scope" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">Approximate number of screens / pages?</p>
              <p className="text-xs text-white/50">A rough estimate helps us size the project quickly.</p>
              <div className="space-y-2">
                {SCOPE_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleScope(opt.id)}
                    className={`flex items-center justify-between w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${scope === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <span className="text-sm font-medium text-white/95">{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>
                ))}
              </div>
              {renderCustomInput("scope", "e.g. 20 screens with 3 key user flows")}
              {canContinue() && (
                <button type="button" onClick={goNext} className="w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 transition-colors cursor-pointer mt-1 shadow-[0_0_20px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  Continue →
                </button>
              )}
            </motion.div>
          )}

          {/* ── Step 6: Complexity ── */}
          {mode === "wizard" && currentStepId === "complexity" && (
            <motion.div key="complexity" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">How complex is your product?</p>
              <p className="text-xs text-white/50">Consider integrations, roles, real-time data and special features.</p>
              <div className="space-y-2">
                {COMPLEXITY_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleComplexity(opt.id)}
                    className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${complexity === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/95">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 7: Timeline ── */}
          {mode === "wizard" && currentStepId === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <p className="text-base font-semibold text-white/95">What is your expected timeline?</p>
              <p className="text-xs text-white/50">When do you need the design ready?</p>
              <div className="space-y-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => handleTimeline(opt.id)}
                    className={`flex items-center justify-between w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${timeline === opt.id ? "border-violet-400/50 bg-violet-500/20" : "border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"}`}>
                    <span className="text-sm font-medium text-white/95">{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>
                ))}
              </div>
              {renderCustomInput("timeline", "e.g. need to launch before December")}
              {canContinue() && (
                <button type="button" onClick={goNext} className="w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 transition-colors cursor-pointer mt-1 shadow-[0_0_20px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  Continue →
                </button>
              )}
            </motion.div>
          )}

          {/* ── Step 8: Extra notes ── */}
          {mode === "wizard" && currentStepId === "extra" && (
            <motion.div key="extra" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">

              <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white/95">Anything to add? <span className="text-white/40 font-normal">(optional)</span></p>
                  <p className="text-xs text-white/45 mt-0.5">Design references, must-have features, constraints or brand materials — this helps us make the estimate more precise.</p>
                </div>
              <textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="e.g. we like Airbnb's clean style, must have dark mode, we have an existing brand guide..."
                rows={3}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm px-3 py-2.5 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleExtraNext}
                disabled={!extraNotes.trim()}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                Add notes & see estimate →
              </button>

              <button
                type="button"
                onClick={handleExtraNext}
                className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm px-4 py-2.5 text-sm text-white/60 hover:text-white/80 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Skip this step — show my estimate
              </button>
            </motion.div>
          )}

          {/* ── Result step ── */}
          {mode === "wizard" && isResultStep && (() => {
            // Phase distribution ratios (must sum to 1)
            const PHASE_ROWS: { label: string; Icon: React.ElementType; desc: string }[] = [
              { label: "Discovery",           Icon: Search,         desc: "Research, audits & project scope definition" },
              { label: "UX / IA",             Icon: LayoutTemplate, desc: "User flows, wireframes & information architecture" },
              { label: "UI design",           Icon: Palette,        desc: "Visual screens, components & final UI" },
              { label: "Design system",       Icon: Component,      desc: "Token library, component kit & guidelines" },
              { label: "Prototyping",         Icon: Wand2,          desc: "Interactive clickable prototype for testing" },
              { label: "Testing & iteration", Icon: FlaskConical,   desc: "Usability tests, feedback & design fixes" },
              { label: "Handoff & support",   Icon: PackageCheck,   desc: "Dev specs, assets export & QA support" },
              { label: "PM / communication",  Icon: MessagesSquare, desc: "Planning, syncs, reviews & team coordination" },
            ];

            const answeredCount = [platform, stage, goal, specs, scope, complexity, timeline].filter(Boolean).length;
            const totalAnswers = 7;
            const readinessPct = Math.round((answeredCount / totalAnswers) * 90) + (extraNotes.trim() ? 10 : 0);

            return (
              <motion.div key="result" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Main estimate card */}
                <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] to-violet-600/[0.08] backdrop-blur-md p-5 shadow-[0_0_32px_rgba(99,102,241,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/20 px-3 py-1">
                      <Sparkles className="w-3 h-3 text-violet-300" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Draft estimate</span>
                    </div>
                    <span className="text-xs text-white/40">{answeredCount}/{totalAnswers} inputs</span>
                  </div>

                  {/* Price */}
              {result ? (
                    <p className="text-4xl font-bold text-white leading-none">
                      ${result.minPrice.toLocaleString()} <span className="text-white/50">–</span> ${result.maxPrice.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-4xl font-bold text-white/30 leading-none">$0 – $0</p>
                  )}

                  {/* Timeline from estimation catalog (not hour-derived) */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                      <Clock3 className="w-3 h-3" />
                      {result?.timeline ?? "—"}
                    </span>
                </div>

                  {/* Readiness */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/60">Estimate readiness</span>
                      <span className="text-xs font-semibold text-white/70">{readinessPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${readinessPct}%`,
                          background: readinessPct >= 60
                            ? "linear-gradient(90deg, #22c55e, #16a34a)"
                            : readinessPct >= 30
                            ? "linear-gradient(90deg, #8b5cf6, #6d28d9)"
                            : "rgba(255,255,255,0.3)",
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-white/40">
                      Based on your questionnaire answers
                    </p>
                  </div>
                </div>

                {/* Work types included (no hour split — illustrative only) */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold px-0.5">Work included</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PHASE_ROWS.map(({ label, Icon, desc }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-600/[0.06] p-4 flex flex-col gap-2"
                      >
                        <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-300 w-fit">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{label}</p>
                          <p className="text-[10px] text-white/45 mt-0.5 leading-snug">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-white/40 leading-relaxed px-0.5">
                  Based on Cieden&apos;s real project catalog. For an accurate quote, our manager will be in touch within 1 business day.
                </p>
                <button type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-book-call-panel"))}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600/30 hover:bg-violet-600/45 backdrop-blur-md border border-violet-400/30 py-3 px-4 text-sm font-medium text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contact our manager
              </button>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* No footer controls for now – header Back button handles navigation */}
    </motion.div>
  );
}
