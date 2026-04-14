import OpenAI from "openai";

const MODEL = "openai/text-embedding-3-small";

export function createOpenRouterClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://cieden.com",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Cieden Assistant",
    },
  });
}

export async function embedTextsOpenRouter(texts: string[]): Promise<number[][]> {
  const client = createOpenRouterClient();
  const trimmed = texts.map((t) => (t.length > 8000 ? t.slice(0, 8000) : t));
  const res = await client.embeddings.create({
    model: MODEL,
    input: trimmed,
  });
  const sorted = [...res.data].sort((u, v) => u.index - v.index);
  return sorted.map((d) => d.embedding as number[]);
}

export function embeddingTextForCase(title: string, description: string, domains: string[]): string {
  return `${title}\n\n${description}\n\nDomains: ${domains.join(", ")}`;
}
