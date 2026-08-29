import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema de Thally: una sesión en vivo, lo que se dijo, las afirmaciones detectadas y su evidencia.
// Los nombres siguen el glosario de CONTEXT.md — en particular, una verificación es una evaluación
// provisional (`support`), nunca un veredicto.
export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    // "live" mientras Thally acompaña el contenido hablado; "ended" cuando terminó.
    status: v.union(v.literal("live"), v.literal("ended")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  // El contenido hablado, en los fragmentos en que lo entrega la transcripción.
  transcripts: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  claims: defineTable({
    sessionId: v.id("sessions"),
    // El fragmento del que salió la afirmación, cuando se conoce.
    transcriptId: v.optional(v.id("transcripts")),
    // La afirmación normalizada, lista para contrastar con evidencia.
    text: v.string(),
    // Lo que se dijo, textual.
    quote: v.optional(v.string()),
    // Offset en ms desde el inicio de la sesión.
    atMs: v.number(),
    status: v.union(
      // Detectada como verificable, todavía sin buscar evidencia.
      v.literal("detected"),
      // Buscando evidencia.
      v.literal("searching"),
      // Con evidencia, evaluándola.
      v.literal("analyzing"),
      // No identifica con suficiente precisión qué debe contrastarse.
      // No es un resultado de verificación (CONTEXT.md).
      v.literal("needs_context"),
      // Ya tiene una evaluación adjunta.
      v.literal("checked"),
    ),
    // Evaluación provisional: acompaña una decisión editorial, no declara una verdad.
    support: v.optional(
      v.union(
        v.literal("supported"),
        v.literal("disputed"),
        v.literal("unsupported"),
      ),
    ),
    explanation: v.optional(v.string()),
    // Issue de GitHub abierta a partir de la afirmación. Presente = ya se abrió: es lo que
    // evita duplicarla cuando el agente reintenta.
    issueUrl: v.optional(v.string()),
    // by_sessionId lleva atMs para que las afirmaciones salgan en el orden en que se dijeron.
  }).index("by_sessionId", ["sessionId", "atMs"]),

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
        v.literal("neutral"),
      ),
    ),
  }).index("by_claimId", ["claimId"]),
});
