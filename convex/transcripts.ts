import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const appendTranscript = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text === "") {
      throw new Error("text cannot be empty");
    }

    if (args.startTime < 0) {
      throw new Error("startTime cannot be negative");
    }

    if (args.endTime !== undefined) {
      if (args.endTime < 0) {
        throw new Error("endTime cannot be negative");
      }
      if (args.endTime < args.startTime) {
        throw new Error("endTime must be greater than or equal to startTime");
      }
    }

    const transcriptId = await ctx.db.insert("transcripts", {
      sessionId: args.sessionId,
      text,
      startTime: args.startTime,
      endTime: args.endTime,
    });

    return transcriptId;
  },
});

export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    transcripts.sort((a, b) => a.startTime - b.startTime);
    return transcripts;
  },
});
