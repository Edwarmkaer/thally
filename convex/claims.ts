import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const registerClaim = mutation({
  args: {
    sessionId: v.id("sessions"),
    transcriptId: v.optional(v.id("transcripts")),
    text: v.string(),
    quote: v.optional(v.string()),
    atMs: v.number(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text === "") {
      throw new Error("text cannot be empty");
    }

    if (args.atMs < 0) {
      throw new Error("atMs cannot be negative");
    }

    const claimId = await ctx.db.insert("claims", {
      sessionId: args.sessionId,
      transcriptId: args.transcriptId,
      text,
      quote: args.quote,
      atMs: args.atMs,
      status: "searching",
    });

    return claimId;
  },
});

/** La afirmación no identifica con suficiente precisión qué debe contrastarse (CONTEXT.md). */
export const markNeedsContext = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (claim === null) {
      throw new Error("claim not found");
    }

    await ctx.db.patch(args.claimId, { status: "needs_context" });
  },
});

export const completeClaim = mutation({
  args: {
    claimId: v.id("claims"),
    support: v.union(
      v.literal("supported"),
      v.literal("disputed"),
      v.literal("unsupported"),
    ),
    explanation: v.string(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (claim === null) {
      throw new Error("claim not found");
    }

    await ctx.db.patch(args.claimId, {
      status: "checked",
      support: args.support,
      explanation: args.explanation,
    });
  },
});

export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    // by_sessionId es ["sessionId", "atMs"], así que el índice ya las entrega en el orden
    // en que se dijeron; ordenarlas de nuevo en memoria no cambia nada.
    return await ctx.db
      .query("claims")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
