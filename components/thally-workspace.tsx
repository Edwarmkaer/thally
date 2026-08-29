"use client"

import { MonitorPlay, Pause } from "lucide-react"
import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"

import { SiteNavbar } from "@/components/site/navbar"
import { ThailyPanel } from "@/components/thaily/thaily-panel"
import { IngestSource } from "@/components/transcript/ingest-source"
import { LiveTranscript } from "@/components/transcript/live-transcript"
import { Button } from "@/components/ui/button"
import { GridPattern } from "@/components/ui/grid-pattern"
import { Slider } from "@/components/ui/slider"

const backgroundSquares: Array<[number, number]> = [
  [4, 4],
  [5, 1],
  [8, 2],
  [5, 3],
  [5, 5],
  [10, 10],
  [12, 15],
  [15, 10],
  [10, 15],
  [18, 4],
  [22, 12],
  [27, 6],
]

export function ThallyWorkspace() {
  // La sesión en vivo más reciente: la misma que siguen la transcripción y el panel.
  const liveSessions = useQuery(api.sessions.listLive)
  const session = liveSessions?.[0]

  return (
    <>
      <SiteNavbar />

      <main className="workspace-shell">
        <GridPattern squares={backgroundSquares} className="workspace-pattern" />
        <div className="workspace-grid">
          <section className="content-column" aria-label="Contenido en vivo">
            <div className="content-heading">
              <div>
                <p className="session-label">
                  <i /> {session ? "Sesión en vivo" : "Sin sesión en vivo"}
                </p>
                <h1>{session?.title ?? "Esperando una sesión"}</h1>
                <span>
                  {session
                    ? `Escuchando desde las ${new Date(session.startedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`
                    : "Arranca una con `bun run session`"}
                </span>
              </div>
            </div>

            <div className="video-window">
              <div className="video-window-bar">
                <span><MonitorPlay aria-hidden="true" /> Contenido en vivo</span>
                <IngestSource />
              </div>
              <div className="video-frame">
                <span className="video-live">Live</span>
                <div className="video-placeholder">
                  <MonitorPlay aria-hidden="true" />
                  <span>Señal de video</span>
                  <small>El reproductor se conectará en la siguiente etapa</small>
                </div>
              </div>
            </div>

            <div className="player-controls">
              <Button><Pause aria-hidden="true" /> Pausar</Button>
              <Slider
                defaultValue={[47]}
                max={100}
                step={1}
                className="video-scrubber"
                aria-label="Progreso del contenido"
              />
              <time>00:34 / 01:12</time>
            </div>

            <LiveTranscript />
          </section>

          <ThailyPanel />
        </div>
      </main>
    </>
  )
}
