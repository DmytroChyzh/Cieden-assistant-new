import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const MODEL = process.env.PROJECT_BRIEF_SYNTH_MODEL ?? "openai/gpt-4o-mini";

type ChatLine = { role: string; content: string };

function openRouterClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://cieden.com",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Cieden Assistant",
    },
  });
}

const SYSTEM = `You are filling a design-studio "project brief" card from a chat transcript.
Return ONLY a JSON object (no markdown) with these keys. Use null for a key only if the topic was never discussed.
Write values in the same primary language as the transcript (Ukrainian or English). Be concise (one line per string field; notes: 2–4 short sentences max).

Keys (all optional except you must return an object):
- productType: string — what product/domain (e.g. B2B SaaS, fintech mobile app).
- platforms: string[] — e.g. ["Web"], ["iOS","Android"], ["Web","Mobile"]. Empty array if unknown.
- budgetRange: string — only if budget or rough range was mentioned; else null.
- timeline: string — deadlines, phases, "ASAP", months — only if mentioned; else null.
- primaryGoal: string — main outcome the client wants.
- secondaryGoals: string[] — up to 4 extra outcomes; [] if none.
- notes: string — constraints, audience, integrations, stakeholders mentioned; null if nothing extra.

Do not invent budgets or timelines. Prefer paraphrasing the client's words over generic marketing text.`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured", brief: null },
      { status: 503 },
    );
  }

  let body: { messages?: ChatLine[]; agentBrief?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", brief: null }, { status: 400 });
  }

  const lines = Array.isArray(body.messages)
    ? body.messages.filter(
        (m) =>
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
    : [];

  if (lines.length === 0) {
    return NextResponse.json({ brief: null, skipped: "no_messages" });
  }

  const transcript = lines
    .slice(-36)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.trim().slice(0, 4000)}`)
    .join("\n\n")
    .slice(0, 28000);

  const agentHint =
    body.agentBrief && typeof body.agentBrief === "object"
      ? JSON.stringify(body.agentBrief, null, 0).slice(0, 4000)
      : "{}";

  try {
    const client = openRouterClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Optional tool draft from the agent (may be empty; prefer transcript over empty fields):\n${agentHint}\n\n---\n\nCHAT TRANSCRIPT:\n${transcript}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ brief: null, error: "empty_model_output" }, { status: 200 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ brief: null, error: "invalid_json" }, { status: 200 });
    }
    const brief = sanitizeBrief(parsed);
    return NextResponse.json({ brief });
  } catch (e) {
    console.error("[project-brief/synthesize]", e);
    return NextResponse.json(
      { brief: null, error: e instanceof Error ? e.message : "synthesize_failed" },
      { status: 200 },
    );
  }
}

function sanitizeBrief(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { mode: "default" };

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const s = str(raw.productType);
  if (s) out.productType = s.slice(0, 500);

  if (Array.isArray(raw.platforms)) {
    const p = raw.platforms
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => (x as string).trim().slice(0, 80));
    if (p.length) out.platforms = p.slice(0, 8);
  }

  const budget = str(raw.budgetRange);
  if (budget) out.budgetRange = budget.slice(0, 300);

  const timeline = str(raw.timeline);
  if (timeline) out.timeline = timeline.slice(0, 300);

  const goal = str(raw.primaryGoal);
  if (goal) out.primaryGoal = goal.slice(0, 500);

  if (Array.isArray(raw.secondaryGoals)) {
    const g = raw.secondaryGoals
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => (x as string).trim().slice(0, 240));
    if (g.length) out.secondaryGoals = g.slice(0, 6);
  }

  const notes = str(raw.notes);
  if (notes) out.notes = notes.slice(0, 2000);

  return out;
}
