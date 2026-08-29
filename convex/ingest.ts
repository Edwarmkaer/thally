import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, mutation, type ActionCtx } from "./_generated/server";

// La transcripción vive aquí y no en el frontend a propósito: ELEVENLABS_API_KEY
// nunca puede viajar al navegador. Vercel tampoco sirve para esto — es serverless,
// sin ffmpeg ni procesos largos. Convex sí aguanta la acción.

const MODEL_ID = "scribe_v2";
/** Un segmento por cada ~18s de habla, para que la lista no sea un muro de texto. */
const SEGMENT_MS = 18_000;

function client() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ELEVENLABS_API_KEY no está configurada en Convex");
  }
  return new ElevenLabsClient({ apiKey });
}

type Word = { text?: string; start?: number; end?: number };

/**
 * Scribe devuelve palabras con timestamps en segundos. Las agrupo en segmentos por
 * ventana de tiempo: es lo que la UI muestra como líneas de transcripción.
 */
function toSegments(words: Word[], fullText: string) {
  const timed = words.filter((w) => typeof w.start === "number" && (w.text ?? "").trim() !== "");
  if (timed.length === 0) {
    return fullText.trim() === "" ? [] : [{ text: fullText.trim(), startMs: 0, endMs: undefined }];
  }

  const segments: Array<{ text: string; startMs: number; endMs: number | undefined }> = [];
  let bucket: Word[] = [];
  let bucketStart = (timed[0].start ?? 0) * 1000;

  const flush = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((w) => w.text ?? "").join(" ").replace(/\s+/g, " ").trim();
    if (text === "") return;
    const last = bucket[bucket.length - 1];
    segments.push({
      text,
      startMs: Math.round(bucketStart),
      endMs: last.end === undefined ? undefined : Math.round(last.end * 1000),
    });
  };

  for (const word of timed) {
    const startMs = (word.start ?? 0) * 1000;
    if (bucket.length > 0 && startMs - bucketStart >= SEGMENT_MS) {
      flush();
      bucket = [];
      bucketStart = startMs;
    }
    bucket.push(word);
  }
  flush();

  return segments;
}

/** El navegador sube el archivo directo a Convex storage con esta URL. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

async function transcribeAndStore(
  ctx: ActionCtx,
  title: string,
  source: { cloudStorageUrl: string } | { file: Blob },
): Promise<{ sessionId: Id<"sessions">; segments: number }> {
  const response = await client().speechToText.convert({
    modelId: MODEL_ID,
    ...source,
  } as never);

  const fullText = (response as { text?: string }).text ?? "";
  const words = ((response as { words?: Word[] }).words ?? []) as Word[];
  const segments = toSegments(words, fullText);

  const sessionId: Id<"sessions"> = await ctx.runMutation(api.sessions.createSession, { title });

  for (const segment of segments) {
    const transcriptId: Id<"transcripts"> = await ctx.runMutation(api.transcripts.appendTranscript, {
      sessionId,
      text: segment.text,
      startTime: segment.startMs,
      endTime: segment.endMs,
    });

    // Cada segmento pasa por el detector; el resto del pipeline (evidencia,
    // evaluación) ya se dispara desde claims.
    await ctx.runAction(api.analysis.detectClaims, {
      sessionId,
      transcriptId,
      text: segment.text,
      atMs: segment.startMs,
    });
  }

  return { sessionId, segments: segments.length };
}

/** Transcribe desde una URL pública de audio o video. */
export const transcribeFromUrl = action({
  args: { url: v.string(), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const url = args.url.trim();
    if (url === "") throw new Error("url no puede estar vacía");
    return await transcribeAndStore(ctx, args.title?.trim() || url, {
      cloudStorageUrl: url,
    });
  },
});

/** Transcribe un archivo ya subido a Convex storage. */
export const transcribeFromStorage = action({
  args: { storageId: v.id("_storage"), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.storageId);
    if (blob === null) throw new Error("archivo no encontrado en storage");
    return await transcribeAndStore(ctx, args.title?.trim() || "Sesión subida", {
      file: blob,
    });
  },
});
