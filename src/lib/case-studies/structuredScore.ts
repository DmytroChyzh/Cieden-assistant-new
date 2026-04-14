import type { EnrichedCaseStudy, StructuredMatch } from "./types";

const DOMAIN_ALIASES: Array<{ re: RegExp; domain: string }> = [
  { re: /fintech|bank|banking|payment|lending|wealth|payroll|credit|emi/i, domain: "Fintech" },
  { re: /logistics|warehouse|fleet|shipping|inventory|haul|route/i, domain: "Logistics" },
  { re: /health|clinic|telehealth|wellness|medical|patient|nutrition/i, domain: "Digital Health" },
  { re: /e-?commerce|retail|grocery|shop|checkout|marketplace.*food/i, domain: "E-commerce" },
  { re: /\bsaas\b|b2b software|enterprise software/i, domain: "B2B SaaS" },
  { re: /sales|marketing|abm|crm|martech|campaign/i, domain: "Martech & Sales" },
  { re: /slack|internal tool|support ticket|professional service/i, domain: "Professional Services" },
  { re: /edtech|learning|course|education|e-learning|tutorial/i, domain: "Edtech" },
  { re: /recruit|hiring|hr tech|talent/i, domain: "HR Tech" },
  { re: /real estate|property|landlord|tenant/i, domain: "Real Estate" },
  { re: /podcast|video|media|streaming|audio social|call center/i, domain: "Media" },
  { re: /\bai\b|ml\b|llm|agent|generative/i, domain: "AI" },
];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function inferredDomainsFromQuery(q: string): string[] {
  const found = new Set<string>();
  for (const { re, domain } of DOMAIN_ALIASES) {
    if (re.test(q)) found.add(domain);
  }
  return [...found];
}

export function scoreStructuredMatch(
  query: string,
  study: EnrichedCaseStudy,
): StructuredMatch {
  const reasons: string[] = [];
  let score = 0;
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) {
    return { score: 0.2, reasons: ["Generic product description — low lexical signal"] };
  }

  const blobTokens = new Set(tokenize(study.searchBlob));
  let overlap = 0;
  for (const t of qTokens) {
    if (blobTokens.has(t)) overlap++;
  }
  const jaccard =
    overlap / Math.max(1, new Set([...qTokens, ...blobTokens]).size);
  score += Math.min(0.55, jaccard * 2.2);

  const qLower = query.toLowerCase();
  const inferred = inferredDomainsFromQuery(qLower);
  for (const d of study.domain) {
    if (inferred.includes(d)) {
      score += 0.22;
      reasons.push(`Industry alignment: ${d}`);
    }
  }

  for (const tag of study.featureTags) {
    const tagReadable = tag.replace(/_/g, " ");
    if (qLower.includes(tag.replace(/_/g, " ")) || qLower.includes(tag)) {
      score += 0.08;
      reasons.push(`Feature/theme overlap: ${tagReadable}`);
    }
  }

  for (const p of study.platforms) {
    if (qLower.includes("mobile") && p === "mobile") {
      score += 0.06;
      reasons.push("Platform: mobile");
    }
    if (
      (qLower.includes("web") || qLower.includes("saas")) &&
      p === "web"
    ) {
      score += 0.05;
      reasons.push("Platform: web / SaaS");
    }
  }

  if (overlap > 0 && reasons.length === 0) {
    reasons.push("Shared terminology with the case narrative");
  }

  return { score: Math.min(1, score), reasons: [...new Set(reasons)] };
}
