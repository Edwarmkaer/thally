"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Mic, Send, Sparkles } from "lucide-react"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { DiagramPanel } from "@/components/diagram/diagram-panel"
import { ThailyAgent, type ThailyStatus } from "@/components/thaily/thaily-agent"
import { Button } from "@/components/ui/button"
import { GridPattern } from "@/components/ui/grid-pattern"
import { Input } from "@/components/ui/input"
import { Ripple } from "@/components/ui/ripple"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextAnimate } from "@/components/ui/text-animate"

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
  const [hasAgentNotice, setHasAgentNotice] = useState(true)
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
  const claimsListRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach(window.clearTimeout)
  }, [])

  useEffect(() => {
    const list = claimsListRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" })
  }, [reduceMotion])

  useEffect(() => {
    const list = messageListRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" })
  }, [messages, reduceMotion, status])

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

  const changePanel = (value: string) => {
    setTab(value)
    if (value === "thaily") setHasAgentNotice(false)
  }

  return (
    <aside className="panel-shell" aria-label="Verificación y asistente">
      <Tabs value={tab} onValueChange={changePanel} className="h-full gap-0">
        <TabsList className="panel-tabs" aria-label="Cambiar panel">
          <TabsTrigger value="claims" className="panel-tab">
            Claims
          </TabsTrigger>
          <TabsTrigger
            value="thaily"
            className="panel-tab agent-tab"
            data-notice={hasAgentNotice ? "true" : undefined}
          >
            Agent
            {hasAgentNotice ? (
              <span className="agent-notice" aria-label="Nueva actividad del agente" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="esquema" className="panel-tab">
            Esquema
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
                <p className="panel-kicker">Detección en tiempo real</p>
                <h2>Afirmaciones detectadas</h2>
              </div>
              <span className="live-indicator">
                <i /> {sessionId ? "Escuchando" : "Sin sesión en vivo"}
              </span>
            </div>

            <div className="claim-list" ref={claimsListRef}>
              {claims === undefined ? (
                <p className="claim-empty">Conectando con la sesión…</p>
              ) : claims.length === 0 ? (
                <p className="claim-empty">
                  Todavía no se detectaron afirmaciones en lo que se dijo.
                </p>
              ) : (
                claims.map((claim, index) => (
                  <motion.button
                    className="claim-row"
                    type="button"
                    key={claim._id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: reduceMotion ? 0 : index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="claim-copy">
                      <span className="claim-meta">
                        <span className="claim-time">{formatTime(claim.atMs)}</span>
                        <span className="claim-status">{claimStatusLabel(claim)}</span>
                      </span>
                      <strong>{claim.text}</strong>
                      <small>{claimDetail(claim)}</small>
                    </span>
                  </motion.button>
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
            <div className="agent-stage" data-listening={status === "listening"}>
              <GridPattern
                width={28}
                height={28}
                squares={[[1, 5], [4, 2], [7, 6], [11, 3], [13, 8]]}
                className="agent-grid"
              />
              <AnimatePresence>
                {status === "listening" && !reduceMotion ? (
                  <motion.div
                    className="agent-ripple-layer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Ripple mainCircleSize={250} mainCircleOpacity={0.3} numCircles={4} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <ThailyAgent status={status} size={272} className="agent-avatar" />
              <div className="agent-identity">
                <h2>Thaily</h2>
                {reduceMotion ? (
                  <p aria-live="polite">{statusCopy[status]}</p>
                ) : (
                  <TextAnimate
                    key={status}
                    as="p"
                    by="text"
                    animation="blurIn"
                    duration={0.22}
                    startOnView={false}
                    aria-live="polite"
                  >
                    {statusCopy[status]}
                  </TextAnimate>
                )}
              </div>
            </div>

            <div className="message-list" ref={messageListRef} aria-live="polite">
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

        <TabsContent value="esquema" className="panel-content">
          <DiagramPanel />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
