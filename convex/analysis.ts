"use node";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// "use node": el SDK de Anthropic usa APIs de Node, así que estas actions corren en el
// runtime Node de Convex. Por eso este archivo solo exporta actions, nunca queries ni mutations.

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

// --- Detector ---------------------------------------------------------------

const DetectedClaims = z.object({
  claims: z.array(
    z.object({
      text: z
        .string()
        .describe("La afirmación normalizada, autocontenida, sin muletillas."),
      quote: z.string().describe("Lo que se dijo, textual, tal como aparece."),
      needsContext: z
        .boolean()
        .describe(
          "true si no identifica con precisión qué debe contrastarse (una cifra sin año, un 'ellos' sin referente).",
        ),
    }),
  ),
});

const DETECTOR_SYSTEM = `Detectas afirmaciones verificables en contenido hablado, para una herramienta que acompaña a quien tiene que decidir qué hacer con lo que se dijo.

Una afirmación verificable es un enunciado factual lo bastante concreto como para contrastarlo con evidencia externa: cifras, fechas, atribuciones, hechos comprobables.

No son afirmaciones verificables: opiniones, predicciones sobre el futuro, juicios de valor, preguntas, hipótesis planteadas como tales, ni lo que el hablante dice sobre sí mismo o sobre lo que va a hacer.

Marca needsContext cuando el enunciado es factual pero todavía no identifica qué debe contrastarse: una cifra sin período, un pronombre sin referente, una comparación sin término de comparación.

Prefiere no detectar antes que detectar de más: una opinión marcada como afirmación verificable cuesta más confianza que una afirmación que se pasó por alto. Si el fragmento no tiene ninguna, devuelve una lista vacía.`;

/** Detecta afirmaciones verificables en un fragmento de lo hablado y las registra. */
export const detectClaims = action({
  args: {
    sessionId: v.id("sessions"),
    transcriptId: v.optional(v.id("transcripts")),
    text: v.string(),
    atMs: v.number(),
  },
  handler: async (ctx, args): Promise<number> => {
    const text = args.text.trim();
    if (text === "") {
      return 0;
    }

    const response = await client().messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: DETECTOR_SYSTEM,
      thinking: { type: "adaptive" },
      // Tarea acotada y de alto volumen: el esfuerzo bajo alcanza y mantiene la latencia.
      output_config: { effort: "low", format: zodOutputFormat(DetectedClaims) },
      messages: [{ role: "user", content: `Fragmento:\n\n${text}` }],
    });

    const detected = response.parsed_output?.claims ?? [];

    for (const claim of detected) {
      const claimId = await ctx.runMutation(api.claims.registerClaim, {
        sessionId: args.sessionId,
        transcriptId: args.transcriptId,
        text: claim.text,
        quote: claim.quote,
        atMs: args.atMs,
      });

      if (claim.needsContext) {
        await ctx.runMutation(api.claims.markNeedsContext, { claimId });
      }
    }

    return detected.length;
  },
});

// --- Evaluador --------------------------------------------------------------

const Assessment = z.object({
  support: z
    .enum(["supported", "disputed", "unsupported"])
    .describe(
      "supported: las fuentes la sostienen. disputed: la contradicen o la matizan. unsupported: no alcanzan para decidir.",
    ),
  explanation: z
    .string()
    .describe(
      "Una o dos frases apoyadas en las fuentes, citando el dato concreto que sostiene la evaluación.",
    ),
});

const EVALUADOR_SYSTEM = `Evalúas una afirmación contra la evidencia que se encontró, para una herramienta que acompaña una decisión editorial.

Tu resultado es una evaluación provisional, no un veredicto: acompaña a quien decide, no declara la verdad. Escribe siempre desde lo que dicen las fuentes, nunca desde lo que sabes por tu cuenta.

- supported: las fuentes sostienen la afirmación.
- disputed: las fuentes la contradicen o la matizan de forma relevante.
- unsupported: las fuentes no alcanzan para decidir. Úsalo sin reparos; es una respuesta legítima y mejor que forzar una conclusión.

Si las fuentes hablan de un período distinto al de la afirmación, dilo en la explicación en vez de asumir que aplica.`;

/** Contrasta una afirmación con su evidencia y adjunta la evaluación. */
export const evaluateClaim = action({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args): Promise<string> => {
    const claim = await ctx.runQuery(api.claims.getById, {
      claimId: args.claimId,
    });
    if (claim === null) {
      throw new Error("claim not found");
    }

    const evidence = await ctx.runQuery(api.evidence.listByClaim, {
      claimId: args.claimId,
    });
    if (evidence.length === 0) {
      throw new Error("claim has no evidence to evaluate");
    }

    const sources = evidence
      .map(
        (e, i) =>
          `[${i + 1}] ${e.title} — ${e.source}\n${e.url}\n${e.excerpt ?? "(sin extracto)"}`,
      )
      .join("\n\n");

    const response = await client().messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: EVALUADOR_SYSTEM,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(Assessment),
      },
      messages: [
        {
          role: "user",
          content: `Afirmación:\n${claim.text}\n\nFuentes encontradas:\n\n${sources}`,
        },
      ],
    });

    const assessment = response.parsed_output;
    if (assessment === null || assessment === undefined) {
      throw new Error("could not parse the assessment");
    }

    await ctx.runMutation(api.claims.completeClaim, {
      claimId: args.claimId,
      support: assessment.support,
      explanation: assessment.explanation,
    });

    return assessment.support;
  },
});
