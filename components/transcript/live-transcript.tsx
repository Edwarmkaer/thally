"use client"

import { AnimatedList } from "@/components/ui/animated-list"

const transcriptSegments = [
  {
    time: "00:27",
    text: "La latencia de la transcripción sigue bajando mientras los modelos procesan audio en tiempo real.",
  },
  {
    time: "00:31",
    text: "Los agentes de voz redujeron sus costos durante el último año.",
  },
  {
    time: "00:34",
    text: "Y ojo con esto: la experiencia mejora cuando la respuesta conserva el contexto de lo que acabamos de escuchar.",
  },
]

export function LiveTranscript() {
  return (
    <section className="transcript" aria-labelledby="transcript-title">
      <div className="transcript-label">
        <span id="transcript-title">Transcripción en vivo</span>
        <i />
        <small>Scribe v2 realtime</small>
      </div>

      <AnimatedList className="transcript-stream" delay={850}>
        {transcriptSegments.map((segment) => (
          <div className="transcript-segment" key={segment.time}>
            <time>{segment.time}</time>
            <p>{segment.text}</p>
          </div>
        ))}
      </AnimatedList>
    </section>
  )
}
