import { mutation } from "./_generated/server";
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
      status: "active",
    });

    return sessionId;
  },
});
