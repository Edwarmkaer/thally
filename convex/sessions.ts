import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (title === "") {
      throw new Error("title cannot be empty");
    }

    const sessionId = await ctx.db.insert("sessions", {
      title,
      status: "live",
      startedAt: Date.now(),
    });

    return sessionId;
  },
});

export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (session === null) {
      throw new Error("session not found");
    }
    if (session.status === "ended") {
      return;
    }

    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: Date.now(),
    });
  },
});

export const listLive = query({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect(),
});
