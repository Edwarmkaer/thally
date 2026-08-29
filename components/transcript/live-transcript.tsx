"use client"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { AnimatedList } from "@/components/ui/animated-list"

/** startTime llega en ms desde el inicio de la sesión. */
function formatOffset(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function LiveTranscript() {
  // Mismo criterio que ThailyPanel: la pantalla sigue la sesión en vivo más reciente.
  const liveSessions = useQuery(api.sessions.listLive)
  const sessionId = liveSessions?.[0]?._id
  const segments = useQuery(
    api.transcripts.listBySession,
    sessionId ? { sessionId } : "skip",
  )

  const loading = segments === undefined
  const empty = !loading && segments.length === 0

  return (
    <section className="transcript" aria-labelledby="transcript-title">
      <div className="transcript-label">
        <span id="transcript-title">Transcripción en vivo</span>
        <i />
        <small>Scribe v2 realtime</small>
      </div>

      {loading || empty ? (
        <p className="transcript-empty" aria-live="polite">
          {loading
            ? "Conectando con la sesión…"
            : "Todavía no hay nada transcrito de esta sesión."}
        </p>
      ) : (
        <AnimatedList className="transcript-stream" delay={850}>
          {segments.map((segment) => (
            <div className="transcript-segment" key={segment._id}>
              <time>{formatOffset(segment.startTime)}</time>
              <div>
                <p>{segment.text}</p>
                {/* Lo mismo en claro. Llega después del texto, así que aparece cuando
                    está listo en vez de retrasar la transcripción. */}
                {segment.paraphrase ? (
                  <p className="transcript-paraphrase">{segment.paraphrase}</p>
                ) : null}
              </div>
            </div>
          ))}
        </AnimatedList>
      )}
    </section>
  )
}
