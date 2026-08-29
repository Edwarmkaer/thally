import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const start = mutation({
  args: { title: v.string() },
  handler: (ctx, { title }) =>
    ctx.db.insert("sessions", { title, status: "live", startedAt: Date.now() }),
});

export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: (ctx, { sessionId }) =>
    ctx.db.patch(sessionId, { status: "ended", endedAt: Date.now() }),
});

export const listLive = query({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect(),
});
