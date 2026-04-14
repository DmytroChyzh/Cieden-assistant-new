/**
 * Fetches cieden.com pages from sitemap_main + sitemap_handbook,
 * chunks text, optionally embeds (OPENROUTER_API_KEY), writes to Convex kbChunks.
 *
 * Prerequisites:
 * - npx convex dev (or deployed) with NEXT_PUBLIC_CONVEX_URL
 * - KB_INGEST_SECRET set in Convex dashboard (.env when running convex dev)
 * - Same KB_INGEST_SECRET in .env.local for this script
 *
 * Run: npm run kb:sync
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    const k = s.slice(0, eq).trim();
    let v = s.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const SITEMAPS = [
  "https://cieden.com/sitemap_main.xml",
  "https://cieden.com/sitemap_handbook.xml",
];

const DELAY_MS = 380;
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;
const MAX_PAGE_CHARS = 120000;
const EMBED_BATCH = 12;
const UA =
  "CiedenAssistantKnowledgeBuilder/1.0 (+https://cieden.com)";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function htmlToPlain(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "\n")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "\n");
  t = t.replace(/<\/(p|div|h[1-6]|li|tr|article|section)\s*>/gi, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  t = t.replace(/[ \t\f\v]+/g, " ");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) return htmlToPlain(m[1]).slice(0, 200);
  return "";
}

function chunkText(text) {
  const chunks = [];
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return chunks;
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(i + CHUNK_SIZE, cleaned.length);
    let piece = cleaned.slice(i, end);
    if (end < cleaned.length) {
      const lastSpace = piece.lastIndexOf(" ");
      if (lastSpace > CHUNK_SIZE * 0.6) {
        piece = piece.slice(0, lastSpace);
      }
    }
    piece = piece.trim();
    if (piece.length > 40) chunks.push(piece);
    const next = i + piece.length - CHUNK_OVERLAP;
    i = next > i ? next : i + CHUNK_SIZE;
    if (i >= cleaned.length) break;
  }
  return chunks;
}

function hashContent(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 24);
}

async function fetchLocUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1].trim());
}

async function embedOpenRouter(texts, apiKey) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://cieden.com",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Cieden KB sync",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts.map((t) => (t.length > 8000 ? t.slice(0, 8000) : t)),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter embeddings ${res.status}: ${err}`);
  }
  const data = await res.json();
  const sorted = [...data.data].sort((u, v) => u.index - v.index);
  return sorted.map((d) => d.embedding);
}

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.KB_INGEST_SECRET;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!convexUrl || !secret) {
    console.error(
      "Missing NEXT_PUBLIC_CONVEX_URL or KB_INGEST_SECRET (.env.local + Convex env)",
    );
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  const sets = await Promise.all(
    SITEMAPS.map(async (u) => {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`Sitemap ${u}: ${r.status}`);
      return fetchLocUrls(await r.text());
    }),
  );
  const urls = [...new Set(sets.flat())];
  console.log("Unique URLs:", urls.length);

  let ok = 0;
  let skipped = 0;
  let fail = 0;
  const t0 = Date.now();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = `${i + 1}/${urls.length}`;

    try {
      const meta = await client.query(api.kb.getPageMeta, { sourceUrl: url });

      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!res.ok) {
        console.warn(label, url, "HTTP", res.status);
        fail++;
        await sleep(DELAY_MS);
        continue;
      }
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
        console.warn(label, "skip non-html", ct, url);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const html = await res.text();
      const title = extractTitle(html) || url;
      let plain = htmlToPlain(html);
      if (plain.length > MAX_PAGE_CHARS) {
        plain = plain.slice(0, MAX_PAGE_CHARS) + "\n…";
      }
      const contentHash = hashContent(plain);
      if (meta?.contentHash === contentHash) {
        console.log(label, "unchanged", url);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const parts = chunkText(plain);
      if (!parts.length) {
        console.warn(label, "no text", url);
        fail++;
        await sleep(DELAY_MS);
        continue;
      }

      const section = url.includes("/book/") ? "handbook" : "main";
      const fetchedAt = Date.now();

      const chunks = [];
      for (let ci = 0; ci < parts.length; ci++) {
        chunks.push({ chunkIndex: ci, text: parts[ci], embedding: undefined });
      }

      if (openRouterKey) {
        try {
          for (let bi = 0; bi < parts.length; bi += EMBED_BATCH) {
            const batch = parts.slice(bi, bi + EMBED_BATCH);
            const vecs = await embedOpenRouter(batch, openRouterKey);
            for (let j = 0; j < vecs.length; j++) {
              chunks[bi + j].embedding = vecs[j];
            }
            await sleep(120);
          }
        } catch (embErr) {
          console.warn(
            label,
            "embeddings skipped for this page:",
            embErr?.message || embErr,
          );
          for (let ci = 0; ci < chunks.length; ci++) {
            chunks[ci].embedding = undefined;
          }
        }
      }

      await client.mutation(api.kb.replacePageChunks, {
        secret,
        sourceUrl: url,
        title,
        section,
        chunks,
        contentHash,
        fetchedAt,
      });

      ok++;
      console.log(label, "ok", parts.length, "chunks", url);
    } catch (e) {
      console.warn(label, url, e?.message || e);
      fail++;
    }
    await sleep(DELAY_MS);
  }

  const stats = await client.query(api.kb.kbStats, {});
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\nDone in ${sec}s. pages ok=${ok} skipped=${skipped} fail=${fail} | Convex: ${stats.chunkCount} chunks, ${stats.pageCount} pages`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
