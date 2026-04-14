/**
 * Fetches each case URL from src/data/cieden-case-studies.json and writes
 * src/data/cieden-case-narratives.json { [id]: plainText } for the assistant KB.
 *
 * Run: node scripts/build-cieden-case-narratives.mjs
 * Re-run when portfolio pages on cieden.com change.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const casesPath = path.join(root, "src/data/cieden-case-studies.json");
const outPath = path.join(root, "src/data/cieden-case-narratives.json");

const MAX_CHARS_PER_CASE = 32000;
const DELAY_MS = 450;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
const out = {};
let ok = 0;
let fail = 0;

for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const label = `${i + 1}/${cases.length} ${c.id}`;
  try {
    const res = await fetch(c.url, {
      headers: {
        "User-Agent": "CiedenAssistantKnowledgeBuilder/1.1 (+https://cieden.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      console.warn(label, "HTTP", res.status);
      out[c.id] = "";
      fail++;
      await sleep(DELAY_MS);
      continue;
    }
    const html = await res.text();
    let text = htmlToPlain(html);
    if (text.length > MAX_CHARS_PER_CASE) text = text.slice(0, MAX_CHARS_PER_CASE) + "\n…";
    out[c.id] = text;
    ok++;
    console.log(label, "ok", text.length, "chars");
  } catch (e) {
    console.warn(label, e?.message || e);
    out[c.id] = "";
    fail++;
  }
  await sleep(DELAY_MS);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 0) + "\n");
console.log("Done. Wrote", outPath, "success:", ok, "fail:", fail);
