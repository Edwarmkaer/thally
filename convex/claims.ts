import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const registerClaim = mutation({
  args: {
    sessionId: v.id("sessions"),
    transcriptId: v.optional(v.id("transcripts")),
    text: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text === "") {
      throw new Error("text cannot be empty");
    }

    if (args.timestamp < 0) {
      throw new Error("timestamp cannot be negative");
    }

    const claimId = await ctx.db.insert("claims", {
      sessionId: args.sessionId,
      transcriptId: args.transcriptId,
      text,
      timestamp: args.timestamp,
      status: "searching",
    });

    return claimId;
  },
});

export const completeClaim = mutation({
  args: {
    claimId: v.id("claims"),
    verdict: v.union(
      v.literal("supported"),
      v.literal("disputed"),
      v.literal("insufficient_evidence"),
    ),
    explanation: v.string(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (claim === null) {
      throw new Error("claim not found");
    }

    await ctx.db.patch(args.claimId, {
      status: "completed",
      verdict: args.verdict,
      explanation: args.explanation,
    });
  },
});

export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    claims.sort((a, b) => a.timestamp - b.timestamp);
    return claims;
  },
});
