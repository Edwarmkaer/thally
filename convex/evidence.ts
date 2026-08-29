import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addEvidence = mutation({
  args: {
    claimId: v.id("claims"),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    excerpt: v.optional(v.string()),
    stance: v.optional(
      v.union(
        v.literal("supports"),
        v.literal("contradicts"),
        v.literal("neutral"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const url = args.url.trim();
    const source = args.source.trim();

    if (title === "") {
      throw new Error("title cannot be empty");
    }
    if (url === "") {
      throw new Error("url cannot be empty");
    }
    if (source === "") {
      throw new Error("source cannot be empty");
    }

    const evidenceId = await ctx.db.insert("evidence", {
      claimId: args.claimId,
      title,
      url,
      source,
      excerpt: args.excerpt,
      stance: args.stance,
    });

    return evidenceId;
  },
});

export const listByClaim = query({
  args: {
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evidence")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .collect();
  },
});
