import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Afirmaciones de una sesión, en el orden en que se dijeron. */
export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: (ctx, { sessionId }) =>
    ctx.db
      .query("claims")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
});

/** Registra una afirmación detectada en el contenido hablado. */
export const add = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
    quote: v.string(),
    atMs: v.number(),
    needsContext: v.optional(v.boolean()),
  },
  handler: (ctx, { needsContext, ...claim }) =>
    ctx.db.insert("claims", {
      ...claim,
      status: needsContext ? "needs_context" : "pending",
    }),
});

/** Adjunta la verificación cuando la evidencia queda disponible. */
export const recordVerification = mutation({
  args: {
    claimId: v.id("claims"),
    support: v.union(
      v.literal("supported"),
      v.literal("disputed"),
      v.literal("unsupported"),
    ),
    summary: v.string(),
    sources: v.array(v.object({ title: v.string(), url: v.string() })),
  },
  handler: (ctx, { claimId, ...verification }) =>
    ctx.db.patch(claimId, {
      status: "checked",
      verification: { ...verification, checkedAt: Date.now() },
    }),
});
