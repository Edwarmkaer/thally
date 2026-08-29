import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("finished")
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  transcripts: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  claims: defineTable({
    sessionId: v.id("sessions"),
    transcriptId: v.optional(v.id("transcripts")),
    text: v.string(),
    timestamp: v.number(),

    status: v.union(
      v.literal("detected"),
      v.literal("searching"),
      v.literal("analyzing"),
      v.literal("completed")
    ),

    verdict: v.optional(
      v.union(
        v.literal("supported"),
        v.literal("disputed"),
        v.literal("insufficient_evidence")
      )
    ),

    explanation: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),

  evidence: defineTable({
    claimId: v.id("claims"),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    excerpt: v.optional(v.string()),

    stance: v.optional(
      v.union(
        v.literal("supports"),
        v.literal("contradicts"),
        v.literal("neutral")
      )
    ),
  }).index("by_claimId", ["claimId"]),
});