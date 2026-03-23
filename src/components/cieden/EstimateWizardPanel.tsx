"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  FileText,
  ListChecks,
  Sparkles,
  Clock3,
  Layers3,
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
}

export function EstimateWizardPanel({ onClose, conversationId }: EstimateWizardPanelProps) {
  const [mode, setMode] = useState<EstimateMode>("chooser");
  const [step, setStep] = useState(0);
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
  const [assistantAutostarted, setAssistantAutostarted] = useState(false);
  const [estimateSessionStartedAt, setEstimateSessionStartedAt] = useState<number | null>(null);
  const lastUserMsgIdRef = useRef<string | null>(null);

  // Local message tracking for guest mode (when conversationId is null and Convex is skipped)
  const [localMessages, setLocalMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: number }>
  >([]);

  const allMessages = useQuery(api.messages.list, conversationId ? { conversationId } : "skip");

  // Capture user messages forwarded from page.tsx when estimate panel is open in guest mode
  useEffect(() => {
    if (conversationId) return; // not needed when Convex is available
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ content: string; role?: "user" | "assistant"; createdAt?: number }>;
      if (!ev.detail?.content) return;
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
  }, [conversationId]);

  const estimateSessionMessages = useMemo(() => {
    // Guest mode (no conversationId): use locally captured messages
    if (!conversationId) {
      if (!estimateSessionStartedAt) return [];
      return localMessages.filter((m) => m.createdAt >= estimateSessionStartedAt);
    }
    // Convex mode: wait for data
    if (!allMessages) return null;
    if (!estimateSessionStartedAt) return [];
    return allMessages.filter((m) => {
      // Convex typically returns `createdAt` (we store it), but `_creationTime` is a safe fallback.
      const createdAt =
        typeof (m as any).createdAt === "number"
          ? (m as any).createdAt
          : typeof (m as any)._creationTime === "number"
            ? (m as any)._creationTime
            : 0;
      return createdAt >= estimateSessionStartedAt;
    });
  }, [allMessages, estimateSessionStartedAt, conversationId, localMessages]);

  const extractedEstimateContext = useMemo(() => {
    if (!estimateSessionMessages) return null;
    const MAX_ANALYSIS_CHARS = 12000;
    const rawUserText = estimateSessionMessages
      .filter((m) => m.role === "user")
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
        : /(from scratch|new product|mvp)/.test(userText) || /(з нуля|знуля|новий продукт|новый продукт|mvp|мвп)/.test(userText)
          ? "from_scratch"
          : null;

    const audience =
      /(b2b)/.test(userText) || /(b2b)/.test(userText)
        ? "b2b"
        : /(b2c)/.test(userText) || /(b2c)/.test(userText)
          ? "b2c"
          : /(internal|внутрішн|внутренн)/.test(userText)
            ? "internal"
            : null;

    const hasGoal =
      /(goal|objective|want to|need to|problem)/.test(userText) ||
      /(ціль|мета|хочу|потрібно|проблем)/.test(userText);

    const hasScope =
      /(screen|screens|page|pages|flow|flows|feature|features|catalog|filter|profile|checkout|order|map)/.test(userText) ||
      /(екран|екрани|сторінк|страниц|флоу|сценар|функц|фіча|фича|каталог|фільтр|фильтр|профіль|профиль|оплат|замовлен|заказ|мап|карта)/.test(userText);

    const hasScreensCount =
      /(\d+)\s*(screens|screen|pages|page)/.test(userText) ||
      /(\d+)\s*(екра|сторін)/.test(userText);

    const hasTimeline =
      /(week|weeks|month|months|deadline|asap|timeline)/.test(userText) ||
      /(тиж|недел|місяц|месяц|дедлайн|термін|срок|asap)/.test(userText);

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
      /(ролі|роли|права|інтеграц|интеграц|оплат|платіж|платеж|аналітик|аналитик|чат|нотиф|сповіщ)/.test(userText);

    const filled = {
      platform: !!platform,
      productStage: !!productStage,
      audience: !!audience,
      goal: hasGoal,
      scope: hasScope,
      screensCount: hasScreensCount,
      timeline: hasTimeline,
      integrations: hasIntegrations,
      payments: hasPayments,
      admin: hasAdmin,
      complexity: hasComplexitySignals,
    };

    const missing = Object.entries(filled)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);

    return {
      platform,
      productStage,
      audience,
      filled,
      missing,
    };
  }, [estimateSessionMessages]);

  const estimateProgress = useMemo(() => {
    if (!estimateSessionMessages || estimateSessionMessages.length === 0) return { percent: 0, checks: 0 };

    const isKickoff = (content: string) =>
      /i want a preliminary design estimate/i.test(content) ||
      /ask me one question at a time/i.test(content) ||
      /enter estimate mode/i.test(content) ||
      /\[estimate mode]/i.test(content);

    const userMessages = estimateSessionMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content ?? "")
      .filter((c) => c.trim().length > 0 && !isKickoff(c));

    if (userMessages.length === 0) return { percent: 0, checks: 0 };

    // IMPORTANT: readiness must be based ONLY on what user said.
    // Assistant questions or hidden contextual payloads must not affect draft confidence.
    const MAX_ANALYSIS_CHARS = 12000;
    const rawText = estimateSessionMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content ?? "")
      .join("\n")
      .toLowerCase();
    const text =
      rawText.length <= MAX_ANALYSIS_CHARS
        ? rawText
        : `${rawText.slice(0, Math.floor(MAX_ANALYSIS_CHARS / 2))}\n...\n${rawText.slice(-Math.floor(MAX_ANALYSIS_CHARS / 2))}`;

    const checks = [
      // platform/type (EN + UA/RU)
      /(web\s*\+\s*mobile|web\s*and\s*mobile|website\s*\+\s*app|mobile|ios|android|website|dashboard|admin|site|app|application|platform|portal|landing|saas|crm|erp)/.test(text) ||
        /(веб|вебсайт|сайт|лендінг|лендинг|додаток|апка|приложен|мобіль|мобиль|ios|android|платформа|портал|адмін|админ|кабінет|личный кабинет|саас|crm|erp)/.test(text),
      // new vs redesign
      /(redesign|from scratch|new product|mvp|rebuild|revamp)/.test(text) ||
        /(редизайн|редesign|з нуля|знуля|новий продукт|новый продукт|мвп|mvp|перероб|переработ|оновлен)/.test(text),
      // target users
      /(b2b|b2c|internal|employees|customers|clients|users)/.test(text) ||
        /(b2b|b2c|внутрішн|внутренн|співробітник|сотрудник|клієнт|клиент|користувач|покупець|покупатель|гості|гости)/.test(text),
      // scope/features
      /(screen|screens|page|pages|flow|flows|feature|features|must-have|authentication|roles|permission|integration|payment|admin|catalog|filter|profile)/.test(text) ||
        /(екран|екрани|сторінк|страниц|флоу|сценар|функц|фіча|фича|авторизац|логін|логин|реєстрац|регистрац|ролі|роли|права|інтеграц|inтеграц|оплат|платіж|платеж|каталог|фільтр|фильтр|профіль|профиль|кабінет|кошик|корзина)/.test(text),
      // timeline
      /(week|weeks|month|months|deadline|asap|timeline)/.test(text) ||
        /(тиж|недел|місяц|месяц|дедлайн|термін|срок|asap)/.test(text),
    ].filter(Boolean).length;

    // Final readiness: only 100% when we have no missing fields left from what the user said.
    // We intentionally DO NOT rely on the assistant's ESTIMATE_PANEL_RESULT values,
    // because UI estimates must be driven by our catalog (catalog.example.json).
    const isFinal = !!extractedEstimateContext && extractedEstimateContext.missing.length === 0;
    if (isFinal) return { percent: 100, checks };

    // Otherwise: compute readiness from filled fields (more granular than 5 keyword checks)
    const filledCount = extractedEstimateContext
      ? Object.values(extractedEstimateContext.filled).filter(Boolean).length
      : checks;
    const totalFields = extractedEstimateContext ? Object.keys(extractedEstimateContext.filled).length : 5;

    // Cap below 100% until final is confirmed
    const cap = 90;
    const percent = Math.round((filledCount / Math.max(1, totalFields)) * cap);
    return { percent, checks };
  }, [estimateSessionMessages, extractedEstimateContext]);

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

    window.dispatchEvent(
      new CustomEvent("estimate-assistant-message", {
        detail: {
          visibility: "contextual",
          inputKind: assistantInputKind,
          text:
            "ESTIMATE STATE UPDATE (hidden):\n" +
            JSON.stringify(extractedEstimateContext) +
            "\nRules:\n" +
            "- Do NOT repeat questions for fields already filled.\n" +
            "- Ask ONE next question about ONE missing field only.\n" +
            "- If missing is empty, finalize the estimate and provide next steps.",
        },
      }),
    );
  }, [mode, estimateSessionMessages, extractedEstimateContext, assistantInputKind]);

  const catalogDraftResult = useMemo(() => {
    if (!estimateSessionMessages || estimateSessionMessages.length === 0) return null;

    // Show draft numbers only when the user provided at least one real project signal.
    // If the user only starts the flow ("I want an estimate...") we keep $0/$0.
    // If the user provided platform/type (web/app) we show an approximate range
    // and tighten it as more answers arrive.
    // 1) Ignore kickoff phrases like "I want a preliminary design estimate..."
    const isKickoff = (content: string) =>
      /i want a preliminary design estimate/i.test(content) ||
      /ask me one question at a time/i.test(content) ||
      /enter estimate mode/i.test(content) ||
      /\[estimate mode]/i.test(content);

    const nonKickoffUserMessages = estimateSessionMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content ?? "")
      .filter((c) => c.trim().length > 0 && !isKickoff(c));

    if (nonKickoffUserMessages.length === 0) return null;

    // Require at least platform/type to start drafting numbers (so we don't guess).
    if (!extractedEstimateContext?.filled.platform) return null;

    // IMPORTANT: inference should use only what user said (not assistant questions).
    // For performance on very large inputs, analyze only a trimmed view of the text.
    const rawText = nonKickoffUserMessages.join("\n").toLowerCase();
    const MAX_ANALYSIS_CHARS = 12000;
    const text =
      rawText.length <= MAX_ANALYSIS_CHARS
        ? rawText
        : `${rawText.slice(0, Math.floor(MAX_ANALYSIS_CHARS / 2))}\n...\n${rawText.slice(-Math.floor(MAX_ANALYSIS_CHARS / 2))}`;

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
      if (byDomain.length >= 2) candidates = byDomain;
    }
    if (clientType) {
      const byClient = candidates.filter((e) => e.clientType === clientType);
      if (byClient.length >= 2) candidates = byClient;
    }
    if (candidates.length === 0) candidates = catalog;

    const coreFields: Array<keyof NonNullable<typeof extractedEstimateContext>["filled"]> = [
      "platform",
      "productStage",
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
          const total =
            hb?.total?.uxui + hb?.total?.pm ||
            hb?.totalProjectHours?.uxui + hb?.totalProjectHours?.pm ||
            hb?.totalProductDesign?.uxui + hb?.totalPm?.pm ||
            hb?.totalProductDesign?.uxui + hb?.totalBaPm?.pm ||
            hb?.totalProductDesign?.uxui + hb?.totalBa?.pm ||
            null;
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
  }, [estimateSessionMessages, extractedEstimateContext, estimateProgress.checks]);

  // IMPORTANT: Always show numbers driven by our local catalog calculations.
  // Assistant ESTIMATE_PANEL_RESULT is treated as contextual guidance only.
  const displayedEstimate = catalogDraftResult;

  // Typing indicator is handled globally in the main chat UI.

  // Provide the assistant with the SAME draft numbers as the UI (prevents mismatch)
  useEffect(() => {
    if (mode !== "assistant") return;
    if (!displayedEstimate) return;
    if (!estimateSessionMessages) return;
    const hasUserProvidedAnything = estimateSessionMessages.some((m) => m.role === "user");
    if (!hasUserProvidedAnything) return;
    // Guard: don't anchor the agent on broken draft numbers.
    if (displayedEstimate.minPrice < 300 || displayedEstimate.maxPrice < displayedEstimate.minPrice) return;

    window.dispatchEvent(
      new CustomEvent("estimate-assistant-message", {
        detail: {
          visibility: "contextual",
          inputKind: assistantInputKind,
          text:
            "UI_DRAFT_ESTIMATE (hidden):\n" +
            JSON.stringify(displayedEstimate) +
            "\nRules:\n" +
            "- If you mention numbers (price/hours/weeks), they MUST match UI_DRAFT_ESTIMATE exactly.\n" +
            "- Prefer asking the next missing question instead of recalculating.",
        },
      }),
    );
  }, [mode, displayedEstimate, estimateSessionMessages, assistantInputKind]);

  useEffect(() => {
    if (mode !== "assistant") {
      if (assistantAutostarted) setAssistantAutostarted(false);
      if (estimateSessionStartedAt) setEstimateSessionStartedAt(null);
      if (localMessages.length > 0) setLocalMessages([]);
      return;
    }

    if (assistantAutostarted) return;

    // Start a new "estimate session" so UI shows 0 until user provides fresh info.
    // We subtract a buffer to avoid race/timestamp ordering issues.
    // NOTE: it must be large enough to include the user's next replies even
    // if the assistant takes time to ask questions.
    // Large enough to include the user's next answers even if the assistant takes time.
    const sessionStart = Math.max(0, Date.now() - 900000); // 15 minutes
    setEstimateSessionStartedAt(sessionStart);
    lastUserMsgIdRef.current = null;

    // 1) Hidden (contextual) guidance - not visible in chat bubbles
    const contextual =
      "You are now in ESTIMATE MODE.\n" +
      "Objective: produce a preliminary estimate RANGE (min-max) with phases + hours.\n\n" +
      "=== LANGUAGE RULE (HIGHEST PRIORITY) ===\n" +
      "Detect the language of the client's messages and ALWAYS reply in that EXACT same language.\n" +
      "- Client writes in English   -> respond 100% in English.\n" +
      "- Client writes in Ukrainian -> respond 100% in Ukrainian.\n" +
      "- Client writes in Russian   -> respond 100% in Russian.\n" +
      "- Never mix languages. Never default to Ukrainian if the client writes in English.\n\n" +
      "=== QUESTION FLOW (ASK ONE AT A TIME) ===\n" +
      "Maintain memory of everything already said - do NOT repeat answered questions.\n" +
      "Only ask for missing info. Skip questions the client already answered.\n\n" +
      "Question topics (always phrase them in the client's detected language):\n" +
      "1. Project type - website, mobile app, web+mobile? New product or redesign?\n" +
      "2. Audience & goal - B2C, B2B or internal? What is the main product goal?\n" +
      "3. Scope - approx number of screens/pages/flows? Key must-have features?\n" +
      "4. Complexity - any of: user roles, admin panel, chat, payments, integrations, real-time?\n" +
      "5. Design references - any products or designs they like? (e.g. Airbnb, Instagram level)\n" +
      "6. Brand / assets - existing brand (logo, colors, guidelines) or designing from scratch?\n" +
      "7. Timeline - expected delivery timeframe? (ASAP / 1-3 months / 3-6 months / flexible)\n\n" +
      "Once enough answers are collected, deliver (in client's language):\n" +
      "* cost estimate (range)\n" +
      "* timeline in weeks\n" +
      "* approximate total hours\n" +
      "* breakdown by phase\n\n" +
      "STRICT RULES:\n" +
      "- Until you know platform/type (web/app), only ask questions.\n" +
      "- As soon as platform/type is known, you MAY show a preliminary price range + hours.\n" +
      "- The range should be wide initially and tighten as more info is provided.\n" +
      "- WHILE IN ESTIMATE MODE you MUST NOT call sales/case tools (show_cases, show_best_case, show_engagement_models).\n" +
      "- When you mention numbers, they MUST match UI_DRAFT_ESTIMATE exactly.\n\n" +
      "After you have all core fields: output the final range, weeks, total hours, and hours by phase.\n\n" +
      "IMPORTANT: When you are ready with the FINAL numbers, include ONE extra line in your reply exactly like this:\n" +
      'ESTIMATE_PANEL_RESULT:{"minPrice":12345,"maxPrice":23456,"weeks":6,"totalHours":240,"phaseHours":{"Discovery":20,"UX / IA":40,"UI design":80,"Design system":30,"Prototyping":20,"Testing & iteration":25,"Handoff & support":15,"PM / communication":10}}';

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
    const kickoff = "I want a preliminary design estimate. Ask me one question at a time, starting from the basics.";
    window.dispatchEvent(
      new CustomEvent("estimate-assistant-message", {
        detail: {
          text: kickoff,
          inputKind: assistantInputKind,
          visibility: "user",
        },
      }),
    );
    setAssistantAutostarted(true);
    return () => {
      // When leaving assistant mode / closing panel, explicitly exit estimate mode (hidden)
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
    };
  }, [mode, assistantAutostarted, assistantInputKind]);

  const stepIds = useMemo(
    () => ["platform", "stage", "goal", "specs", "scope", "complexity", "timeline", "extra", "result"],
    [],
  );

  const currentStepId = stepIds[step];
  const totalSteps = stepIds.length - 1; // exclude result
  const isResultStep = currentStepId === "result";

  // Map new wizard complexity to estimateRanges keys
  const complexityMapped = useMemo((): "low" | "medium" | "high" | null => {
    if (!complexity) return null;
    if (complexity === "essential") return "low";
    if (complexity === "advanced") return "medium";
    if (complexity === "enterprise") return "high";
    return null;
  }, [complexity]);

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
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-full sm:w-1/2 z-50 flex flex-col bg-[#0a0a0c]/60 backdrop-blur-2xl border-l border-white/[0.12] shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
      style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), -8px 0 32px rgba(0,0,0,0.35)" }}
    >
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-white/[0.03] backdrop-blur-sm border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {mode !== "chooser" && (
            <button
              type="button"
              onClick={handleBackFromPanel}
              className="inline-flex items-center gap-1 text-xs text-white/65 hover:text-white/95 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          )}
        <h2 className="text-sm font-semibold text-white/90">Preliminary estimate</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 scrollbar-chat">
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
                          {estimateProgress.checks}/5 inputs
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
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1.5 text-[12px] font-medium text-white/75">
                          <Layers3 className="w-3.5 h-3.5 text-fuchsia-400" />
                          {displayedEstimate ? `${displayedEstimate.totalHours ?? 0} hrs` : "0 hrs"}
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
                        {estimateProgress.checks === 5
                          ? "All key inputs collected. Ready to finalize."
                          : `${5 - estimateProgress.checks} more input${5 - estimateProgress.checks !== 1 ? "s" : ""} needed for a precise estimate.`}
                      </p>
                    </div>

                    {/* Phase breakdown — 2-column grid */}
                    <div className="p-5">
                      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3">Phase breakdown</p>
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
                        ].map(({ label, Icon, desc }) => {
                          const value = displayedEstimate?.phaseHours?.[label] ?? 0;
                          const total = displayedEstimate?.totalHours ?? 0;
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return (
                            <div
                              key={label}
                              className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-600/[0.06] p-4 flex flex-col gap-3"
                            >
                              {/* Icon + hours */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span className="text-[15px] font-bold text-white/90 tabular-nums leading-none pt-1">{value}h</span>
                              </div>
                              {/* Label */}
                              <p className="text-[12px] font-semibold text-white leading-tight">{label}</p>
                              {/* Description */}
                              <p className="text-[10px] text-white/40 leading-relaxed">{desc}</p>
                              {/* Progress bar */}
                              <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-auto">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Hint */}
                      <p className="mt-4 text-[11px] text-white/35 leading-relaxed">
                        Write in the chat on the left what you need (or paste your brief / share a case). The assistant will ask follow-up questions and refine this estimate in real time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* "Contact manager" CTA — appears only when estimate is 60%+ ready */}
                {estimateProgress.checks >= 4 && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3">
                      <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                        Great — we have enough to prepare a real quote! Our manager will review your project and get back to you within 1 business day.
                      </p>
                    </div>
                    <a
                      href="https://cieden.com/contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-emerald-200 hover:from-emerald-500/35 hover:to-teal-500/30 transition-all cursor-pointer shadow-[0_0_22px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(255,255,255,0.07)]"
                      onClick={() => {
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
                    </a>
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
            const PHASE_RATIOS: { label: string; Icon: React.ElementType; desc: string; ratio: number }[] = [
              { label: "Discovery",           Icon: Search,         desc: "Research, audits & project scope definition",      ratio: 0.10 },
              { label: "UX / IA",             Icon: LayoutTemplate, desc: "User flows, wireframes & information architecture", ratio: 0.20 },
              { label: "UI design",           Icon: Palette,        desc: "Visual screens, components & final UI",             ratio: 0.28 },
              { label: "Design system",       Icon: Component,      desc: "Token library, component kit & guidelines",         ratio: 0.10 },
              { label: "Prototyping",         Icon: Wand2,          desc: "Interactive clickable prototype for testing",       ratio: 0.10 },
              { label: "Testing & iteration", Icon: FlaskConical,   desc: "Usability tests, feedback & design fixes",          ratio: 0.10 },
              { label: "Handoff & support",   Icon: PackageCheck,   desc: "Dev specs, assets export & QA support",             ratio: 0.07 },
              { label: "PM / communication",  Icon: MessagesSquare, desc: "Planning, syncs, reviews & team coordination",      ratio: 0.05 },
            ];

            const answeredCount = [platform, stage, goal, specs, scope, complexity, timeline].filter(Boolean).length;
            const totalAnswers = 7;
            const readinessPct = Math.round((answeredCount / totalAnswers) * 90) + (extraNotes.trim() ? 10 : 0);

            const weeksMin = result ? Math.round((result.minHours / 40)) : 0;
            const weeksMax = result ? Math.round((result.maxHours / 40)) : 0;

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

                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                      <Clock3 className="w-3 h-3" />
                      {result ? `${weeksMin}–${weeksMax} weeks` : "0 weeks"}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                      <Layers3 className="w-3 h-3" />
                      {result ? `${result.minHours}–${result.maxHours} hrs` : "0 hrs"}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                      {result?.timeline ?? "awaiting details"}
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

                {/* Phase breakdown */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold px-0.5">Phase breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PHASE_RATIOS.map(({ label, Icon, desc, ratio }) => {
                      const minH = result ? Math.round(result.minHours * ratio) : 0;
                      const maxH = result ? Math.round(result.maxHours * ratio) : 0;
                      const pct  = result ? ratio * 100 : 0;
                      return (
                        <div key={label}
                          className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-600/[0.06] p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-300">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-[15px] font-bold text-white/90">
                              {result ? `${minH}–${maxH}h` : "0h"}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{label}</p>
                            <p className="text-[10px] text-white/45 mt-0.5 leading-snug">{desc}</p>
                          </div>
                          <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-indigo-400/50 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-white/40 leading-relaxed px-0.5">
                  Based on Cieden&apos;s real project catalog. For an accurate quote, our manager will be in touch within 1 business day.
                </p>
                <a href="https://cieden.com/contact" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600/30 hover:bg-violet-600/45 backdrop-blur-md border border-violet-400/30 py-3 px-4 text-sm font-medium text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contact our manager
              </a>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* No footer controls for now – header Back button handles navigation */}
    </motion.div>
  );
}
