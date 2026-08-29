import { MonitorPlay, Pause } from "lucide-react"

import { SiteNavbar } from "@/components/site/navbar"
import { ThailyPanel } from "@/components/thaily/thaily-panel"
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
  return (
    <>
      <SiteNavbar />

      <main className="workspace-shell">
        <GridPattern squares={backgroundSquares} className="workspace-pattern" />
        <div className="workspace-grid">
          <section className="content-column" aria-label="Contenido en vivo">
            <div className="content-heading">
              <div>
                <p className="session-label"><i /> Sesión en vivo</p>
                <h1>Construyendo un agente de voz en 20 minutos</h1>
                <span>Marta Ibáñez · build in public · 1,284 viendo</span>
              </div>
            </div>

            <div className="video-window">
              <div className="video-window-bar">
                <span><MonitorPlay aria-hidden="true" /> Contenido en vivo</span>
                <small>16:9</small>
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
