import type { CaseStudyRecord, EnrichedCaseStudy } from "./types";

const PLATFORM_HINTS: Array<{ re: RegExp; p: string }> = [
  { re: /\bmobile\b|ios|android|app\b|iphone/i, p: "mobile" },
  { re: /\bweb\b|saas\b|dashboard|browser|platform\b/i, p: "web" },
  { re: /\bdesktop\b|windows app|mac app/i, p: "desktop" },
];

function detectPlatforms(text: string, title: string): string[] {
  const t = `${title} ${text}`;
  const out = new Set<string>();
  for (const { re, p } of PLATFORM_HINTS) {
    if (re.test(t)) out.add(p);
  }
  if (out.size === 0) out.add("web");
  return [...out];
}

function detectClientType(record: CaseStudyRecord, blob: string): EnrichedCaseStudy["clientType"] {
  if (record.clientType) return record.clientType;
  if (/internal support|for teams inside|slack/i.test(blob)) return "internal";
  if (
    /b2b|enterprise|saas platform|marketplace for|revenue teams|finance leads|hauliers/i.test(
      blob,
    )
  ) {
    return "b2b";
  }
  if (/consumer|shopper|patient|athlete|grocery|food delivery|wellness app/i.test(blob)) {
    return "b2c";
  }
  return "mixed";
}

const FEATURE_LEXICON: Array<{ re: RegExp; tag: string }> = [
  { re: /\bai\b|generative|machine learning|llm|agent\b/i, tag: "ai" },
  { re: /voice|speaking|speech|vui/i, tag: "voice_ui" },
  { re: /bank|fintech|payroll|wealth|borrow|pricing|finance/i, tag: "fintech" },
  { re: /logistics|warehouse|inventory|route|haul/i, tag: "logistics" },
  { re: /health|telehealth|wellness|medical|nutrition|patient/i, tag: "health" },
  { re: /e-?commerce|checkout|retail|grocery|cart|marketplace/i, tag: "ecommerce" },
  { re: /dashboard|analytics|report|kpi/i, tag: "dashboards" },
  { re: /ticket|kanban|support ops|slack/i, tag: "support_ops" },
  { re: /design system|component|modular ui/i, tag: "design_system" },
  { re: /onboarding|prototype|figma|wireframe/i, tag: "product_discovery" },
];

function extractFeatureTags(description: string, title: string, existing?: string[]): string[] {
  const t = `${title}\n${description}`.toLowerCase();
  const tags = new Set(existing?.map((x) => x.toLowerCase()) ?? []);
  for (const { re, tag } of FEATURE_LEXICON) {
    if (re.test(t)) tags.add(tag);
  }
  return [...tags];
}

export function enrichCaseRecord(record: CaseStudyRecord): EnrichedCaseStudy {
  const description = record.description ?? "";
  const title = record.title ?? "";
  const platforms = record.platforms?.length
    ? record.platforms
    : detectPlatforms(description, title);
  const featureTags = extractFeatureTags(description, title, record.featureTags);
  const searchBlob = [
    title,
    description,
    ...(record.domain ?? []),
    ...platforms,
    ...featureTags,
    record.highlight ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return {
    ...record,
    platforms,
    clientType: detectClientType(record, searchBlob),
    featureTags,
    searchBlob,
  };
}

export function enrichAllRecords(records: CaseStudyRecord[]): EnrichedCaseStudy[] {
  return records.map(enrichCaseRecord);
}
