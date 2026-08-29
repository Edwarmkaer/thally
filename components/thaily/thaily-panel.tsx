"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { FileCheck2, Mic, Send, Sparkles } from "lucide-react"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { ThailyAgent, type ThailyStatus } from "@/components/thaily/thaily-agent"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Message = {
  id: number
  author: "user" | "thaily"
  text: string
}

/** Offset en ms desde el inicio de la sesión → mm:ss. */
function formatTime(atMs: number) {
  const totalSeconds = Math.max(0, Math.floor(atMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// El copy sigue CONTEXT.md: una verificación acompaña una decisión, no declara una verdad.
const supportCopy = {
  supported: "Se sostiene",
  disputed: "En disputa",
  unsupported: "Sin respaldo",
} as const

const statusFallback = {
  detected: "Detectada",
  searching: "Buscando evidencia",
  analyzing: "Analizando fuentes",
  needs_context: "Necesita contexto",
  checked: "Verificada",
} as const

type ClaimRow = {
  _id: string
  atMs: number
  text: string
  status: keyof typeof statusFallback
  support?: keyof typeof supportCopy
  explanation?: string
}

function claimStatusLabel(claim: ClaimRow) {
  if (claim.status === "checked" && claim.support) {
    return supportCopy[claim.support]
  }
  return statusFallback[claim.status]
}

function claimDetail(claim: ClaimRow) {
  if (claim.explanation) return claim.explanation
  if (claim.status === "needs_context") {
    return "Todavía no identifica con precisión qué debe contrastarse."
  }
  return "Buscando fuentes que la sostengan o la contradigan."
}

const statusCopy: Record<ThailyStatus, string> = {
  idle: "Listo para resolver tus dudas",
  listening: "Escuchando tu pregunta",
  thinking: "Revisando la transcripción",
  answering: "Preparando una respuesta",
  success: "Respuesta completada",
  error: "No pude completar la consulta",
}

export function ThailyPanel() {
  const reduceMotion = useReducedMotion()
  // ponytail: la pantalla sigue la sesión en vivo más reciente. Cuando haya varias a la vez,
  // el sessionId entra por prop o por la ruta.
  const liveSessions = useQuery(api.sessions.listLive)
  const sessionId = liveSessions?.[0]?._id
  const claims = useQuery(
    api.claims.listBySession,
    sessionId ? { sessionId } : "skip",
  ) as ClaimRow[] | undefined
  const [tab, setTab] = useState("claims")
  const [status, setStatus] = useState<ThailyStatus>("idle")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      author: "thaily",
      text: "Puedo aclarar una afirmación o relacionarla con lo que ya se dijo en el contenido.",
    },
  ])
  const timers = useRef<number[]>([])

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach(window.clearTimeout)
  }, [])

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
  }

  const submitQuestion = (question: string) => {
    const value = question.trim()
    if (!value) return

    setTab("thaily")
    setMessages((current) => [
      ...current,
      { id: Date.now(), author: "user", text: value },
    ])
    setInput("")
    setStatus("thinking")

    schedule(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          author: "thaily",
          text: "Esta es una respuesta de demostración. Cuando conectemos los datos, usaré la transcripción y las fuentes asociadas al momento seleccionado.",
        },
      ])
      setStatus("answering")
    }, reduceMotion ? 250 : 1200)

    schedule(() => setStatus("idle"), reduceMotion ? 700 : 3600)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion(input)
  }

  const toggleListening = () => {
    if (status === "listening") {
      submitQuestion("¿Qué contexto adicional hay sobre la última afirmación?")
      return
    }
    setTab("thaily")
    setStatus("listening")
  }

  return (
    <aside className="panel-shell" aria-label="Verificación y asistente">
      <Tabs value={tab} onValueChange={setTab} className="h-full gap-0">
        <TabsList variant="line" className="panel-tabs" aria-label="Cambiar panel">
          <TabsTrigger value="claims" className="panel-tab">
            <FileCheck2 aria-hidden="true" />
            Claims
            <span className="tab-count">{claims?.length ?? 0}</span>
          </TabsTrigger>
          <TabsTrigger value="thaily" className="panel-tab">
            <ThailyAgent status={status} size={22} className="tab-agent" />
            Thaily
            {status !== "idle" ? <span className="status-dot" aria-hidden="true" /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="panel-content">
          <motion.div
            className="claims-view"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">En tiempo real</p>
                <h2>Afirmaciones detectadas</h2>
              </div>
              <span className="live-indicator">
                <i /> {sessionId ? "Escuchando" : "Sin sesión en vivo"}
              </span>
            </div>

            <div className="claim-list">
              {claims === undefined ? (
                <p className="claim-empty">Conectando con la sesión…</p>
              ) : claims.length === 0 ? (
                <p className="claim-empty">
                  Todavía no se detectaron afirmaciones en lo que se dijo.
                </p>
              ) : (
                claims.map((claim) => (
                  <button className="claim-row" type="button" key={claim._id}>
                    <span className="claim-time">{formatTime(claim.atMs)}</span>
                    <span className="claim-copy">
                      <strong>{claim.text}</strong>
                      <small>{claimDetail(claim)}</small>
                    </span>
                    <span className="claim-status">{claimStatusLabel(claim)}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="thaily" className="panel-content">
          <motion.div
            className="thaily-view"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-stage">
              {!reduceMotion ? (
                <AnimatedGridPattern
                  width={28}
                  height={28}
                  numSquares={10}
                  maxOpacity={0.08}
                  duration={3}
                  className="agent-grid"
                />
              ) : null}
              <ThailyAgent status={status} size={156} className="agent-avatar" />
              <div className="agent-identity">
                <h2>Thaily</h2>
                <p aria-live="polite">{statusCopy[status]}</p>
              </div>
            </div>

            <div className="message-list" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`message ${message.author}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {message.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {status === "thinking" ? (
                <div className="thinking-row"><span /><span /><span /> Thaily está revisando</div>
              ) : null}
            </div>

            <form className="agent-composer" onSubmit={onSubmit}>
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Pregunta sobre lo que estás viendo"
                aria-label="Pregunta para Thaily"
              />
              <Button
                type="button"
                variant={status === "listening" ? "default" : "outline"}
                size="icon-lg"
                onClick={toggleListening}
                aria-label={status === "listening" ? "Detener y enviar dictado" : "Preguntar por voz"}
              >
                <Mic aria-hidden="true" />
              </Button>
              <Button type="submit" size="icon-lg" disabled={!input.trim()} aria-label="Enviar pregunta">
                <Send aria-hidden="true" />
              </Button>
            </form>

            <div className="quick-actions" aria-label="Preguntas sugeridas">
              <Button variant="ghost" size="sm" onClick={() => submitQuestion("Resume lo importante")}>
                <Sparkles aria-hidden="true" /> Resumen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => submitQuestion("Dame más contexto")}>
                Contexto
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
