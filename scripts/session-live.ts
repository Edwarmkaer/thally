/**
 * Corre una sesión de Thally de punta a punta: abre la sesión, transcribe el contenido
 * hablado con Scribe y escribe cada fragmento confirmado en Convex.
 *
 * Hasta acá la transcripción vivía en la consola y en la página local; nada llegaba a la
 * base, así que el detector, la evidencia y la pantalla no tenían de dónde partir.
 *
 *   bun run session -- "Título de la sesión"
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { startScribeRealtime, VIDEO_PATH } from "./scribe-realtime";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} sin configurar`);
  }
  return value;
}

async function main(): Promise<void> {
  const title = process.argv[2]?.trim() || "Sesión en vivo";
  const convex = new ConvexHttpClient(requireEnv("CONVEX_URL"));
  requireEnv("ELEVENLABS_API_KEY");

  const sessionId: Id<"sessions"> = await convex.mutation(
    api.sessions.createSession,
    { title },
  );
  console.log(`[sesión] ${title} → ${sessionId}`);
  console.log(`[fuente] ${VIDEO_PATH}`);

  // ponytail: las escrituras se encadenan en una promesa para que los fragmentos lleguen
  // en orden. Scribe emite más rápido de lo que responde la red, y `atMs` ordena la vista
  // pero no la escritura.
  let queue: Promise<unknown> = Promise.resolve();
  let written = 0;

  try {
    await startScribeRealtime({
      onCommitted: (text, elapsedMs) => {
        const clean = text.trim();
        if (clean === "") {
          return;
        }
        queue = queue
          .then(async () => {
            const transcriptId = await convex.mutation(
              api.transcripts.appendTranscript,
              { sessionId, text: clean, startTime: elapsedMs },
            );
            written += 1;
            console.log(`[transcripción] ${elapsedMs}ms · ${clean}`);

            // El parafraseo va en paralelo: no bloquea la detección ni la transcripción.
            void convex
              .action(api.analysis.paraphrase, { transcriptId, text: clean })
              .then((p) => console.log(`[en claro] ${p}`))
              .catch(() => {});

            // Cada fragmento confirmado es una oportunidad de detectar algo verificable.
            // Sin ANTHROPIC_API_KEY esto falla y se registra, pero la transcripción sigue.
            await convex
              .action(api.analysis.detectClaims, {
                sessionId,
                transcriptId,
                text: clean,
                atMs: elapsedMs,
              })
              .then((n) => {
                if (n > 0) {
                  console.log(`[afirmaciones] ${n} detectada(s)`);
                }
              })
              .catch((error) => {
                console.warn(`[afirmaciones] omitidas: ${String(error)}`);
              });
          })
          .catch((error) => {
            console.error(`[transcripción] falló: ${String(error)}`);
          });
      },
    });

    await queue;
  } finally {
    await convex.mutation(api.sessions.endSession, { sessionId });
    console.log(`[sesión] cerrada · ${written} fragmento(s) escrito(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
