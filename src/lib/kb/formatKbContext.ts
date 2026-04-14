export type KbSearchHit = {
  sourceUrl: string;
  title: string;
  section: string;
  text: string;
};

const MAX_BLOCK_CHARS = 11000;

export function formatKbContextBlock(hits: KbSearchHit[]): string {
  if (!hits.length) return "";

  const header =
    "COMPANY_KB_EXCERPTS (official text from cieden.com — use ONLY these excerpts for specific facts about Cieden, cases, handbook, and process; if the answer is not here, say the materials do not contain it. Do not invent case details.)";

  const parts: string[] = [header];
  hits.forEach((c, i) => {
    parts.push(
      `[${i + 1}] URL: ${c.sourceUrl}\nSection: ${c.section}\nTitle: ${c.title}\n${c.text.trim()}`,
    );
  });

  let block = parts.join("\n\n---\n\n");
  if (block.length > MAX_BLOCK_CHARS) {
    block = block.slice(0, MAX_BLOCK_CHARS) + "\n…";
  }
  return block;
}
