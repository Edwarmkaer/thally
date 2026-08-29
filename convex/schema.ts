import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Primer schema de Thally: una sesión en vivo y las afirmaciones que se detectan en ella.
// ponytail: la transcripción completa no se modela todavía — cada afirmación guarda su propia
// cita y su offset. Se agrega tabla `segments` cuando la UI necesite mostrar el hablado entero.
export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    // "live" mientras Thally acompaña el contenido hablado; "ended" cuando terminó.
    status: v.union(v.literal("live"), v.literal("ended")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  claims: defineTable({
    sessionId: v.id("sessions"),
    // La afirmación normalizada, lista para contrastar con evidencia.
    text: v.string(),
    // Lo que se dijo, textual.
    quote: v.string(),
    // Offset en ms desde el inicio de la sesión.
    atMs: v.number(),
    status: v.union(
      // Detectada como verificable, todavía sin evidencia.
      v.literal("pending"),
      // No identifica con suficiente precisión qué debe contrastarse.
      v.literal("needs_context"),
      // Ya tiene una verificación adjunta.
      v.literal("checked"),
    ),
    // Evaluación provisional: acompaña una decisión editorial, no declara una verdad.
    verification: v.optional(
      v.object({
        support: v.union(
          v.literal("supported"),
          v.literal("disputed"),
          v.literal("unsupported"),
        ),
        summary: v.string(),
        sources: v.array(v.object({ title: v.string(), url: v.string() })),
        checkedAt: v.number(),
      }),
    ),
  }).index("by_session", ["sessionId", "atMs"]),
});
