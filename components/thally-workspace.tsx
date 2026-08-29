import { Pause, Radio, Volume2 } from "lucide-react"

import { ThailyPanel } from "@/components/thaily/thaily-panel"
import { Button } from "@/components/ui/button"

export function ThallyWorkspace() {
  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">T</span>
          <div>
            <strong>Thally</strong>
            <span>Verificación de contenido en vivo</span>
          </div>
        </div>
        <div className="session-status">
          <span className="connection-status"><i /> Transcripción activa</span>
          <span className="live-badge"><Radio aria-hidden="true" /> En vivo</span>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="content-column" aria-label="Contenido en vivo">
          <div className="content-heading">
            <div>
              <p>Sesión actual</p>
              <h1>Construyendo un agente de voz en 20 minutos</h1>
              <span>Marta Ibáñez · build in public · 1,284 viendo</span>
            </div>
            <Button variant="outline" size="icon-lg" aria-label="Controlar volumen">
              <Volume2 aria-hidden="true" />
            </Button>
          </div>

          <div className="video-frame">
            <div className="video-signal" aria-hidden="true" />
            <span className="video-live">Live</span>
            <div className="video-placeholder">
              <span>Señal de video</span>
              <small>El reproductor se conectará en la siguiente etapa</small>
            </div>
          </div>

          <div className="player-controls">
            <Button><Pause aria-hidden="true" /> Pausar</Button>
            <div className="timeline" aria-label="Progreso del contenido">
              <span className="timeline-fill" />
              <i style={{ left: "21%" }} />
              <i style={{ left: "47%" }} />
              <i style={{ left: "72%" }} />
            </div>
            <time>00:34 / 01:12</time>
          </div>

          <section className="transcript" aria-labelledby="transcript-title">
            <div className="transcript-label">
              <span id="transcript-title">Transcripción</span>
              <i />
              <small>Scribe v2 realtime</small>
            </div>
            <p>
              Y ojo con esto: los agentes de voz redujeron sus costos durante el último año,
              mientras la latencia de la transcripción sigue bajando.
            </p>
          </section>
        </section>

        <ThailyPanel />
      </div>
    </main>
  )
}
