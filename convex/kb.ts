import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function requireIngestSecret(provided: string): void {
  const expected = process.env.KB_INGEST_SECRET;
  if (!expected || provided !== expected) {
    throw new Error("Unauthorized kb ingest");
  }
}

export const getPageMeta = query({
  args: { sourceUrl: v.string() },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("kbChunks")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();
    if (!first) return null;
    return { contentHash: first.contentHash, fetchedAt: first.fetchedAt };
  },
});

export const kbStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("kbChunks").collect();
    const urls = new Set(all.map((c) => c.sourceUrl));
    return { chunkCount: all.length, pageCount: urls.size };
  },
});

/** Keyword / token overlap search — full scan; OK for ~few thousand chunks. */
export const searchKbKeyword = query({
  args: {
    query: v.string(),
    candidateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const candidateLimit = args.candidateLimit ?? 80;
    const q = args.query.toLowerCase().trim();
    if (q.length < 2) return [];

    const tokens = [
      ...new Set(
        q
          .split(/[^a-z0-9а-яіїєґüöäß+/]+/i)
          .filter((t) => t.length > 1),
      ),
    ];
    if (tokens.length === 0) return [];

    const all = await ctx.db.query("kbChunks").collect();
    const scored = all
      .map((doc) => {
        const hay = `${doc.title}\n${doc.text}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (hay.includes(t)) score += 1;
        }
        if (hay.includes(q)) score += 2;
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateLimit);

    return scored.map((x) => ({
      sourceUrl: x.doc.sourceUrl,
      title: x.doc.title,
      section: x.doc.section,
      text: x.doc.text,
      embedding: x.doc.embedding,
      keywordScore: x.score,
    }));
  },
});

export const replacePageChunks = mutation({
  args: {
    secret: v.string(),
    sourceUrl: v.string(),
    title: v.string(),
    section: v.union(v.literal("main"), v.literal("handbook")),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        text: v.string(),
        embedding: v.optional(v.array(v.number())),
      }),
    ),
    contentHash: v.string(),
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const existing = await ctx.db
      .query("kbChunks")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const c of args.chunks) {
      await ctx.db.insert("kbChunks", {
        sourceUrl: args.sourceUrl,
        title: args.title,
        section: args.section,
        chunkIndex: c.chunkIndex,
        text: c.text,
        contentHash: args.contentHash,
        fetchedAt: args.fetchedAt,
        embedding: c.embedding,
      });
    }
  },
});
