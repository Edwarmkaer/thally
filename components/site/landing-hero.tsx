"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { ThailyAgent, type ThailyStatus } from "@/components/thaily/thaily-agent"

/**
 * Thaily como protagonista de la landing: recorre sus estados en bucle para que el
 * avatar muestre su repertorio sin que el visitante tenga que interactuar.
 * Con prefers-reduced-motion se queda quieto en "idle" (PRODUCT.md, WCAG 2.2 AA).
 */
const CYCLE: Array<{ status: ThailyStatus; copy: string }> = [
  { status: "listening", copy: "Escucha el contenido mientras sucede" },
  { status: "thinking", copy: "Detecta afirmaciones verificables" },
  { status: "answering", copy: "Busca evidencia consultable" },
  { status: "success", copy: "Y responde tus dudas sin cortar el contenido" },
]

export function LandingHero() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (reduceMotion) return
    timer.current = window.setInterval(() => {
      setStep((current) => (current + 1) % CYCLE.length)
    }, 2600)
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [reduceMotion])

  const active = reduceMotion ? { status: "idle" as ThailyStatus, copy: CYCLE[0].copy } : CYCLE[step]

  return (
    <div className="hero-agent">
      <ThailyAgent status={active.status} size={320} className="hero-avatar" />
      <motion.p
        key={active.copy}
        className="hero-agent-copy"
        aria-live="polite"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {active.copy}
      </motion.p>
    </div>
  )
}
